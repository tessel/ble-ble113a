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
  mooshimeter.discoverCharacteristics(['ffa2'], function(err, characteristics) {
      meterSample = characteristics[0];

      setInterval(function() {
        console.log("Reading Moosh...");
        meterSample.read(function(err, value) {
          if (err){
            console.log("Error reading sample: ", err);
          }
          else {
            var voltage = 0;
            for (var i = 0; i < 3; i++) {
              voltage += value[3+i] << (i*8);
            }
            voltage = (0x1000000 - voltage)  * (1.51292917e-04);

            console.log("New sample", voltage);
          }
        })
      }, 1000);
  });
}

function readMeterSettings(mooshimeter, callback) {
  if (mooshimeter) {
    // Find the characteristic with meter settings
    mooshimeter.discoverCharacteristics(['ffa6'], function(err, characteristics) {

      meterSettings = characteristics[0];
      console.log("Meter settings Info: ", meterSettings.toString());

      meterSettings.once('characteristicRead', function(value) {
        console.log("Initial meter settings ", value);
        mooshimeter.meterSettings = value;
        meterSettings.write(new Buffer([3, 2, 0, 0, 0, 0, 0, 0, 23]), function(err, valueWritten) {
          if (err) {
            console.log("Error writing buffer", err);
          }
          console.log("Wrote a new meter setting: ", valueWritten);
          mooshimeter.meterSettings = valueWritten;
          callback && callback(mooshimeter);
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
