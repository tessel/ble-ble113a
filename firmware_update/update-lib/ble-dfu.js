var fs = require('fs');
var async = require('async');
console.log("Loading image...");
var image = fs.readFileSync(__dirname + '/ble-firmware.image');
console.log("...done.");

function dfuUpdate (messenger, callback) {

  console.log("Loaded image of size", image.length, "bytes...");
  console.log("NOTE: Do not cancel script or unplug your Tessel until update completes. You will brick your module!!!");

  dfuReboot(messenger, 1, function() {

    console.log("finished rebooting into dfu...");

    messenger.bgLib.setPacketMode(0);

    transferImage(image, messenger, function(err) {
      if (err) {
        return callback && callback(err);
      }

      console.log("Finished transferring images... rebooting...");

      messenger.once('booted', function(info) {

        console.log("Rebooted into normal operation. DFU Update complete. Version:", info.major + "." + info.minor + "." + info.patch);

        callback && callback();
      });

      dfuReboot(messenger, 0);
    });
  });
}

function dfuReboot(messenger, dfu, callback) {
  messenger.dfuReboot(dfu);
  if (callback) setTimeout(callback, 2500);
}

function transferImage(image, messenger, callback) {
  messenger.setFlashAddress(0x00001000, function(err, response) {
    if (err) {
      return callback && callback(err);
    }
    console.log("Set flash address for upload...");

    transferImageChunks(image, messenger, function(err) {
      if (err) {
        return callback && callback(err);
      }

      console.log("Sent the image... Setting finish timeout...");

      setTimeout(function() {
        console.log('calling flash upload finish.')
        messenger.flashUploadFinish(callback); 
      }, 1000);
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

  console.log("Sending image over... this may take about 5 minutes...");

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
      if (iter % 10 == 0) {
        console.log("Uploading Packet " + iter + " of " + totalPackets + "...");
      }
      messenger.flashUpload(packet, function(err) {
        if (err) throw err;
        else {
          callback();
        }
      });
    }, 
    callback);
}


module.exports = dfuUpdate;

