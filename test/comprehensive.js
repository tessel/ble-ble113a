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

function moduleConnectTest(callback) {

  var wrongPort = tessel.port('b');

  var wrongBLE = bleDriver.use(wrongPort);

  failTimeout = setTimeout(failModule.bind(null, "Connecting to module"), 10000);

  wrongBLE.on('error', function(err) {
    console.log("Successfully detected wrong module port", err);
    bluetooth = bleDriver.use(blePort);

    bluetooth.on('error', failModule.bind(null, 'Connecting to correct module port'));

    bluetooth.on('ready', function() {
      clearTimeout(failTimeout);
      console.log("Ready to go!");
      passModule();
    });
  });

  wrongBLE.on('ready', failModule.bind(null, "Checking that incorrect port is not ready."));
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

moduleConnectTest(function() {
  console.log("Tests finished.");
});