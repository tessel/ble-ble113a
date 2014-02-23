/*
Configuration:
Connect a BLE port to port A on the Tessel.
Place any BLE peripheral within a few feet of the Tessel.
*/

var tessel = require('tessel');
var blePort = tessel.port('a');
var bleDriver = require('../');

// Used for bluetooth tests
var bluetooth; 
var peripheral;

// Indication LEDs
var passedLED = tessel.led(1);
var failedLED = tessel.led(2);
var failed = false;
var failTimeout;

/*
Test surrounding filtering peripherals
*/
function filterTest(callback) {
  bluetooth.startScanning(function(err) {
    if (err) {
      return failModule("Starting scan in filter test");
    }

    bluetooth.filterDiscover(filter, function(err, matched) {

    });
  });
}

function filter(peripheral) {

}

/*
Test surrounding scanning for peripheral
*/
function scanTest(callback) {

  failTimeout = setTimeout(failModule.bind(null, "Discover Test"), 30000);

  var gate = 0;

  bluetooth.on('scanStart', function() {
    console.log("Scan started!");
    gate++;
  });

  bluetooth.on('scanStop', function() {
    console.log("In scan stop", gate);
    if (gate == 2) {
      console.log("Scan tests passed.");
      clearTimeout(failTimeout);
      callback && callback();
    }
    else {
      return failModule("Stop scan event");
    }
  })

  bluetooth.on('discover', function(peripheral) {
    bluetooth.stopScanning(function(err) {
      gate++;
      if (err) {
        return failModule("Stopping scan");
      }

    });
  });

  // Start scanning
  bluetooth.startScanning(function(err) {
    if (err) {
      // If there was an error, fail
      return failModule("Start scanning for peripherals");
    }
    // 
  });
}

/*
Test surrounding instantiation of module
*/
function portTest(callback) {

  // No BLEs connected to this port
  var wrongPort = tessel.port('b');

  // Set timeout for this test
  failTimeout = setTimeout(failModule.bind(null, "Port Test"), 20000);

  // Try to use the wrong port, testing callback
  bleDriver.use(wrongPort, function(err) {
    // If there wasn't an error, fail the test
    if (!err) {
      return failModule("Callback to 'use' on false port");
    }

    // Connect to the wrong port again, this time testing events
    var wrongBLE = bleDriver.use(wrongPort);

    // If there was an error, continue with test
    wrongBLE.on('error', function(err) {
      console.log("Successfully detected wrong module port.");
      // Connect to the correct port
      bluetooth = bleDriver.use(blePort, function(err) {
        if (err) {
          return failModule("Callback to 'use' on correct port")
        }

        // If there was an error connecting to the real port, fail the test
        bluetooth.on('error', failModule.bind(null, 'Connecting to correct module port'));

        // If the module connected
        bluetooth.on('ready', function() {
          // Cancel the timeout
          clearTimeout(failTimeout);

          console.log("Successfully connected to correct module port.");

          // Continue with the next test
          callback && callback();
        });
      });
    });

    // If the module connected somehow, fail the test
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
  scanTest(function() {
    passModule();
  });
});

setInterval(function() {

}, 10000);