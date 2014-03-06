var tessel = require('tessel');
var blePort = tessel.port('a');
var bleDriver = require('../');

bluetooth = bleDriver.use(blePort, function(err) {
  if (err) {
    return console.log("Failed to connect");
  }
  else {
    connectToMoosh(function(moosh) {
      readMeterSettings(moosh, function() {
        startReadingMeter(moosh);
      });
    });
  }
});

function startReadingMeter(mooshimeter) {
  var meterSample = 'ffa2'
  mooshimeter.discoverCharacteristics([meterSample], function(err, characteristics) {
      meterSample = characteristics[0];

      setInterval(function() {
        meterSample.read(function(err, value) {
          if (err){
            console.log("Error reading sample: ", err);
          }
          else {
            console.log("New sample", value);
          }
        })
      }, 3000);
  });
}

function readMeterSettings(mooshimeter, callback) {
  if (mooshimeter) {
    // Find the characteristic with meter settings
    var meterSettings = 'ffa6'
    mooshimeter.discoverCharacteristics([meterSettings], function(err, characteristics) {

      meterSettings = characteristics[0];
      console.log("Meter settings Info: ", meterSettings.toString());

      meterSettings.once('read', function(value) {
        meterSettings.removeAllListeners('read');
        console.log("Initial meter settings ", value);
        mooshimeter.meterSettings = value;
        meterSettings.write(new Buffer([3, 2, 0, 0, 0, 0, 0, 0, 30]), function(err, valueWritten) {
          if (err) {
            console.log("Error writing buffer", err);
          }
          console.log("Write a new meter setting: ", valueWritten);
          mooshimeter.meterSettings = valueWritten;
          meterSettings.read(function(err, value) {
            if (err) {
              console.log("Got this error checking read back of meter settings", err);
            }
            console.log("New meter settings: ", value);
            callback && callback(mooshimeter);
          });
        });
      });

      meterSettings.read();
    });
  }
}

function connectToMoosh(callback) {
  bluetooth.filterDiscover(mooshFilter, function(err, moosh) {
    bluetooth.stopScanning(function(err) {
      moosh.connect(function(err) {
        callback && callback(moosh);
      });
    });
  });

  bluetooth.startScanning();
}

function mooshFilter(peripheral, callback) {
  for (var i = 0; i < peripheral.advertisingData.length; i++) {
    var packet = peripheral.advertisingData[i];

    if (packet.type = 'Incomplete List of 16-bit Service Class UUIDs'
        && packet.data[0] == '0xffa0') {
      return callback(true);
    }
  }

  return  callback(false);
}


setInterval(function(){}, 20000);
