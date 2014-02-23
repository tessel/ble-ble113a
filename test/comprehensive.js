/*
Configuration:
Connect a BLE port to port A on the Tessel.
Place any BLE peripheral within a few feet of the Tessel.

Missing Tests:
The ability to test whether _allowDuplicates works on scanning. Would need more BLE peripherals
in setup
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
Tests surrounding connecting to peripherals
connect
disconnect
*/
function connectTest(callback) {

  // Set the timeout for failure
  failTimeout = setTimeout(failModule.bind(null, "Connect Test"), 20000);

  // Gate flag
  var gate = 0;
  // Start scanning
  bluetooth.startScanning(function(err) {
    // If there was an error, fail
    if (err) {
      return failModule("Starting connect test scan", err);
    }
    // Once we discover a peripheral
    bluetooth.once('discover', function(peripheral) {
      // Stop scanning
      bluetooth.stopScanning(function(err) {
        if (err) {
          return failModule("Stopping scan in connect test", err);
        }
      });
      // Once we are connected to it
      bluetooth.once('connect', function(connectedPeripheral) {
        // Increase gate
        gate++;
        // Make sure it's the correct peripheral
        if (connectedPeripheral != peripheral) {
          return failModule("Connect controller event equalty test");
        }
      });
      // Once the peripheral gets the connect event
      peripheral.once('connect', function() {
        // Check the gate status
        if (gate == 2) {
          // When we get the disconnect event
          bluetooth.on('disconnect', function(peripheral, reason) {
            if (err) {
              return failModule("Disconnecting from peripheral", err);
            }
            // Increase the gate
            gate++;
          });
          // When the peripheral gets the disconnect event
          peripheral.on('disconnect', function(reason) {
            // Check the gate status
            if (gate != 4) {
              return failModule("Disconnecting from peripheral", err);
            }
            // Stop the timeout
            clearTimeout(failTimeout);
            // Declare success
            console.log("Connect Test Passed");
            // Next test
            callback && callback();
          });

          // Tell the peripheral to disconnect
          peripheral.disconnect(function(err) {
            // Increase gate
            gate++;
          });
        }
        else {
          return failModule("Passing gate in peripheral connect event");
        }
      })
      peripheral.connect(function(err) {
        if (err) {
          return failModule("Connect callback", err);
        }
        gate++;
      });
    });

  })
}
/*
Test surrounding filtering peripherals
filterDiscover with impassable filter
stopFilterDiscover
filterDiscover with passable filter
*/
function filterTest(callback) {
  var gate = 0;

  failTimeout = setTimeout(failModule.bind(null, "Filter Test"), 25000);

  impassableFilterAndStopTest(5000, function() {
    passableFilterTest(10000, function() {
      clearTimeout(failTimeout);
      callback && callback();
    });
  });
}

function passableFilterTest(timeout, callback) {
  var passTimeout = setTimeout(failModule.bind(null, "Passable filter test"), timeout);

  var gate = 0;

  bluetooth.filterDiscover(passableFilter, function(err, matched) {
    if (err) {
      return failModule("Passable filter discover callback");
    }
    gate++;
  });

  bluetooth.on('discover', function(peripheral) {
    if (gate) {
      clearTimeout(passTimeout);
      bluetooth.stopFilterDiscover();
      bluetooth.removeAllListeners();
      bluetooth.stopScanning();
      console.log("Passable Filter Test Passed.");
      callback && callback();
    }
    else {
      return failModule("Passable filter event");
    }
  });

  bluetooth.startScanning(function(err) {
    if (err) {
      return failModule("Starting passable filter test scan");
    }
  });

}

function impassableFilterAndStopTest(timeout, callback) {
  successTimeout = setTimeout(function() {
    if (!failed) {
      bluetooth.stopScanning(function(err) {
        if (err) {
          return failModule("Cancelling filter in stop test", err);
        }
        bluetooth.removeAllListeners();
        console.log("Impassable Filter Test Passed.");
        stopFilterHelper(callback);
      });
    }
  }, timeout);

  bluetooth.filterDiscover(impassableFilter, function(err, matched) {
    failModule('Impassable discover filter');
  });

  bluetooth.startScanning(function(err) {
    if (err) {
      return failModule("Starting scan in impassable filter test", err);
    }

    bluetooth.once('discover', function(peripheral) {
      return failModule("Not discovering in impassable filter test");
    });
  });
}

function stopFilterHelper(callback) {
  // Start scanning again
  bluetooth.stopFilterDiscover(function(err) {
    if (err) {
      return failModule("Stop filter discover...", err);
    }
    // Once we discover, we know the filter was removed
    // In the future, if we have multiple devices, we should have a better test
    bluetooth.once('discover', function(peripheral) {
      bluetooth.stopScanning(function(err) {
        if (err) {
          return failModule("Stop scan filter stop");
        }
        bluetooth.removeAllListeners();
        callback && callback();
      });
    });
    bluetooth.startScanning(function(err) {
      if (err) {
        return failModule("Starting scan in stop filter test", err);
      }
    });
  });
}

function impassableFilter(peripheral, callback) {
  callback(false);
}

function passableFilter(peripheral, callback) {
  if (peripheral.advertisingData.length >= 2) {
    return callback(true);
  } 
  else {
    return callback(false);
  }
}

/*
Test surrounding scanning for peripheral
*/
function scanTest(callback) {

  // Set timeout for failure
  failTimeout = setTimeout(failModule.bind(null, "Discover Test"), 20000);

  // Flag to keep track of functions that must be hit
  var gate = 0;

  // When the scan starts, trip the gate
  bluetooth.on('scanStart', function() {
    gate++;
  });

  // When the scan stops
  bluetooth.on('scanStop', function() {
    // We should have had three gates tripped
    if (gate == 3) {
      // clear failure timeout
      clearTimeout(failTimeout);

      console.log("Scan tests passed.");
      // remove any existing listeners
      bluetooth.removeAllListeners();

      // Continue with tests
      callback && callback();
    }
    else {
      return failModule("Stop scan event");
    }
  });

  // Start scanning
  bluetooth.startScanning(function(err) {
    if (err) {
      // If there was an error, fail
      return failModule("Start scanning for peripherals");
    }
    gate++;

    // When we discover a peripheral, stop the scan
    bluetooth.on('discover', function(peripheral) {
      bluetooth.stopScanning(function(err) {
        gate++;
        if (err) {
          return failModule("Stopping scan");
        }
      });
    });
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

          return failModule("Callback to 'use' on correct port", err);
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

function failModule(test, err)
{
  failed = true;
  clearTimeout(failTimeout);
  passedLED.low();
  console.log(test, " failed.");
  if (err) {
    console.log(err);
  }
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
    filterTest(function() {
      connectTest(function() {
        passModule();
      });
    });
  });
});

setInterval(function() {

}, 10000);