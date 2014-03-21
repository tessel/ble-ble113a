var tessel = require('tessel');
var blePort = tessel.port('a');
var bleDriver = require('../');

bluetooth = bleDriver.use(blePort, function(err) {
  if (err) {
    return console.log("Failed to connect", err);
  }
  else {
    // Connect to moosh
    connectToMoosh(function(moosh) {
      // Tell the meter to start reading, pass back char to read
      setMeterSettings(moosh, function(meterSample) {
        // Start reading that char
        startReadingMeter(meterSample);
      });
    });
  }
});

function startReadingMeter(meterSample) {

    meterSample.on('notification', function(value) {
      var voltage = 0;
      for (var i = 0; i < 3; i++) {
        voltage += value[3+i] << (i*8);
      }
      voltage = (0x1000000 - voltage) * (1.51292917e-04);

      console.log("Voltage", voltage);
    });

    console.log("Turning on async readings...");
    meterSample.startNotifications();
}

function setMeterSettings(mooshimeter, callback) {
  if (mooshimeter) {
    // Find the characteristic with meter settings
    console.log("Searching for characteristics...");
    mooshimeter.discoverCharacteristics(['ffa2', 'ffa6'], function(err, characteristics) {

      console.log("Characteristics Found.");
      var meterSample = characteristics[0];
      var meterSettings = characteristics[1];

      // Update meter settings struct to start reading...
      console.log("Turning on analog reads");
      meterSettings.write(new Buffer([3, 2, 0, 0, 0, 0, 0, 0, 23]), function(err, valueWritten) {
        console.log("Turned on!");
        callback && callback(meterSample);
      });
    });
  }
}

function connectToMoosh(callback) {

  bluetooth.startScanning({serviceUUIDs:['ffa0']});

  bluetooth.once('discover', function(moosh) {
    bluetooth.stopScanning(function(stopError) {
      moosh.connect(function(connectError) {
        callback && callback(moosh);
      })
    })
  });
}


setInterval(function() {}, 20000);
