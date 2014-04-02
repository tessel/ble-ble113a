var fs = require('fs');
var async = require('async');
var image = new Buffer(require('./ble-firmware'));
var tessel = require('tessel');

function dfuUpdate (messenger, callback) {

  console.log("Loaded image of size", image.length, "bytes...");

  dfuReboot(messenger, 1, function() {

    console.log("finished rebooting into dfu...");

    messenger.bgLib.setPacketMode(0);



    transferImage(image, messenger, function(err) {
      if (err) {
        return callback && callback(err);
      }

      console.log("Finished transferring images... rebooting...");

      messenger.once('dfuReboot', function(info) {

        messenger.uart.on('data', messenger.parseIncomingPackets.bind(messenger));

        console.log("Rebooted into normal operation. DFU Update complete. Version:", info.version);

        callback && callback();
      });

      dfuReboot(messenger, 0);
    });
  });
}

function dfuReboot(messenger, into, callback) {
  messenger.dfuReboot(1);
  if (callback) setTimeout(callback, 2500);
}

function transferImage(image, messenger, callback) {
  messenger.setFlashAddress(0x00001000, function(err, response) {
    if (err) {
      return callback && callback(err);
    }
    console.log("Set flash address for upload...");

    messenger.uart.removeAllListeners('data');
    transferImageChunks(image, messenger, function(err) {
      if (err) {
        return callback && callback(err);
      }

      console.log("Sent the image... Setting finish timeout...");

      // Why aren't timeouts working?!?
      tessel.sleep(1000);

      messenger.flashUploadFinish(); 
      callback && callback()

      
    });
  });
}

function finishWrite() {

}

function transferImageChunks(image, messenger, callback) {
  var chunkSize = 64;
  var fullPackets = Math.floor(image.length/chunkSize);
  var remainingPacketSize = image.length%chunkSize;
  var totalPackets = fullPackets + (remainingPacketSize ? 1 : 0);
  var bytesSent = 0;
  var iter = 0;


  console.log("Sending image over... this may take about 10 minutes...");

  async.whilst(
    function testSentAll() {
      return (iter < totalPackets);
    }
    ,
    function imageUploadHandler(callback) {
      var start = iter*chunkSize;
      var end = start + (iter < fullPackets ? chunkSize : remainingPacketSize);
      var packet = new Buffer(image.slice(start, end));
      iter++;
      console.log("Uploading Packet " + iter + " of " + totalPackets + "...");
      messenger.flashUpload(packet);
      
      callback();
    }, 
    callback);
}


module.exports = dfuUpdate;

