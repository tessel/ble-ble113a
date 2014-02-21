var tessel = require('tessel');
var blePort = tessel.port('a');
var bleDriver = require('../');

// Used for bluetooth test
var bluetooth; 

// Indication LEDs
var passedLED = tessel.led(1);
var failedLED = tessel.led(2);
var failed = false;
var failTimeout;

function discoverTest(callback) {

  failTimeout = setTimeout(failModule.bind(null, "Discover Test"), 30000);
  bluetooth.startScanning(function(err) {
    if (err) {
      
    }
  });
}

function portTest(callback) {

  var wrongPort = tessel.port('b');

  failTimeout = setTimeout(failModule.bind(null, "Port Test"), 20000);

  bleDriver.use(wrongPort, function(err) {
    if (!err) {
      return failModule("Callback to 'use'");
    }

    var wrongBLE = bleDriver.use(wrongPort);

    wrongBLE.on('error', function(err) {
      console.log("Successfully detected wrong module port.");
      bluetooth = bleDriver.use(blePort);

      bluetooth.on('error', failModule.bind(null, 'Connecting to correct module port'));

      bluetooth.on('ready', function() {
        clearTimeout(failTimeout);
        console.log("Successfully connected to correct module port.");
        callback && callback();
      });
    });

    wrongBLE.on('ready', failModule.bind(null, "Checking that incorrect port is not connected"));

  });


}

function failModule(test)
{
  failed = true;
  clearTimeout(failTimeout);
  passedLED.low();
  console.log(test, " failed.");
  failedLED.high();
}

function passModule()
{
  if (!failed) {
    console.log("Tests passed.");
    passedLED.high();
  }
}

portTest(function() {
  discoverTest(function() {
    passModule();
  });
});