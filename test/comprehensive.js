/*
Configuration:
Connect a BLE port to port A on the Tessel.
Place any BLE peripheral within a few feet of the Tessel.

Missing Tests:
The ability to test whether _allowDuplicates works on scanning. Would need more BLE peripherals
in setup
*/
// Test frameworks
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

function characteristicServiceDiscovertTest(callback) {

}

function serviceCharacteristicDiscoveryTest(peripheral, callback) {
  peripheral.discoverAllServices(function(err, services) {
    services.forEach(function(service) {
      if (service.uuid == "ffa0") {
        console.log("Found it.");
        var reqChar = ["ffa6"];
        service.discoverAllCharacteristics(function(err, allChars) {
          console.log("Discovered these: ", allChars);
          if (allChars.length >= reqChar.length) {
            service.discoverCharacteristics(reqChar, function(err, subsetChars) {
              console.log("Then found these: ", subsetChars);
              if (subsetChars.length > reqChar.length) {
                callback();
              }
            });
          }
        });
      }
    })
  });
}

/*
Tests surrounding discovering characteristics
  discovering specific characteristics (from controller and peripheral)
  discovering all characteristics
  discovering all characteristics of a service
  characteristic sync when they're discovered before their service
*/
function characteristicDiscoveryTest(callback) {
  bluetooth.filterDiscover(mooshFilter, function(err, moosh) {
    console.log("Filter passed");
    bluetooth.stopScanning(function(err) {
      console.log("Stopped scanning")
      moosh.connect(function(err) {
        console.log("Connected");
        allCharacteristicDiscoveryTest(moosh, function() {
          specificCharacteristicDiscoveryTest(moosh, function() {
            moosh.disconnect(function(err) {
              bluetooth.reset(callback);
            });
          });
        });
      });
    });
  });

  bluetooth.startScanning(function(err) {
    if (err) {
      failModule("Start scan in char disco", err);
    }
  });
}

function specificCharacteristicDiscoveryTest(peripheral, callback) {
  var reqChar = ["ffa6", "ffa5"];
  console.log("Specific discovery test");
  peripheral.discoverCharacteristics(reqChar, function(err, pc) {
    bluetooth.discoverCharacteristics(peripheral, reqChar, function(err, mc) {
      console.log("pc length: ", pc.length);
      console.log("mc length: ", mc.length);
      if ((pc.length != reqChar.length) || (reqChar.length != mc.length)) {
        return failModule("Matching characteristics");
      }
      else {
        callback();
      }
    });
  });
}


function allCharacteristicDiscoveryTest(peripheral, callback) {
  peripheral.discoverAllCharacteristics(function(err, pc) {
    if (err) {
      return failModule("discovering chars of peripheral - peripheral", err);
    }
    bluetooth.discoverAllCharacteristics(peripheral, function(err, mc) {
      if (err) {
        return failModule("discovering chars of peripheral - master", err);
      }
      if (pc.length != mc.length) {
        return failModule("Matching characteristics");
      }
      else {
        callback();
      }
    });
  });
}

/*
Tests surrounding discovering services
  discovering specific services
  discovering all services
  (still needs) discovering included services
*/
function serviceDiscoveryTest(callback) {

  // Set the timeout for failure
  //failTimeout;// = setTimeout(failModule.bind(null, "Service Discovery Test"), 30000);

  connectToMoosh(function(moosh) {
    discoverSpecificServicesTest(moosh, function() {
      discoverAllServicesTest(moosh, function() {
        moosh.disconnect(function(err) {
          if (err) {
            return failModule("Disconnecting after service discovery", err);
          }
          else {
            clearTimeout(failTimeout);
            bluetooth.reset(callback);
          }
        })
      });
    });
  });

function discoverAllServicesTest(peripheral, callback) {
  var gate = 0;
  bluetooth.once('servicesDiscover', function(p, services) {
    if (p === peripheral) {
      return gate++;
    }
    else {
      return failModule("Testing Peripheral equivalence in service discovery");
    }
    
  });
  peripheral.once('servicesDiscover', function(services) {
    console.log("peripheral service hit.");
    for (var i = 0; i < services.length; i++) {
      console.log(services[i].toString());
    }
    if (gate === 2 && services.length > 2) {
      console.log("Complete service discovery test passed.");
      peripheral.disconnect()
      callback && callback();
    }
    else {
      console.log("fail because gate is ", gate, "and service length is", services.length);
    }
  });
  console.log("Attempting complete discovery test...");
  bluetooth.discoverAllServices(peripheral, function(err, services) {
    if (err) {
      return failModule("Discovering all services callback", err);
    }
    console.log("Callback called");
    gate++;
  });
}

function discoverSpecificServicesTest(peripheral, callback) {
  var reqServices = ["1800", "1801"];
  var gate = 0;
  bluetooth.once('servicesDiscover', function(p, services) {
    if (p === peripheral) {
      return gate++;
    }
    else {
      return failModule("Testing Peripheral equivalence in subset service discovery");
    }
  });
  peripheral.once('servicesDiscover', function(services) {
    console.log("subset peripheral service hit.", gate, services.length);
    for (var i = 0; i < services.length; i++) {
      console.log(services[i].toString());
    }
    if (gate === 2 && services.length === 2) {
      console.log("Subset service discovery test passed.");
      bluetooth.removeAllListeners();
      peripheral.removeAllListeners();
      callback && callback();
    }
    else {
      return failModule("Specific service peripheral event gate", new Error("Gate = " + gate.toString() + " not 2"));
    }
  });
  console.log("Attempting subset discovery test");
  peripheral.discoverServices(reqServices, function(err, services) {
      if (err) {
        return failModule("Discover services", err);
      }
      gate++;
  });
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

function connectToMoosh(callback) {
    bluetooth.filterDiscover(mooshFilter, function(err, moosh) {
    if (err) {
      return failModule("Filtering moosh", err);
    }
    console.log("Filter passed");
    bluetooth.stopScanning(function(err) {
      if (err) {
        return failModule("Stop scanning for moosh", err);
      }

      console.log("Stopped scanning")
      moosh.connect(function(err) {
        if (err) {
          return failModule("Connecting to moosh", err);
        }

        console.log("Connected");
        callback && callback(moosh);
      });
    });
  });

  bluetooth.startScanning(function(err) {
    if (err) {
      failModule("Start scan in char disco", err);
    }
  });
}
/* 
Tests surrounding connecting to peripherals
connect
disconnect
*/
function connectTest(callback) {

  // Set the timeout for failure
  console.log("Beginning connect test!");
  //failTimeout;// = setTimeout(failModule.bind(null, "Connect Test"), 45000);
   // Gate flag
  var gate = 0;

  bluetooth.filterDiscover(mooshFilter);

  // Start scanning
  bluetooth.startScanning(function(err) {
    // If there was an error, fail
    if (err) {
      return failModule("Starting connect test scan", err);
    }
    console.log("Started scan...");
    // Once we discover a peripheral
    bluetooth.once('discover', function(peripheral) {
      console.log("Once we discover something")
      // Stop scanning
      bluetooth.stopScanning(function(err) {
        console.log("Stop the scan");
        if (err) {
          return failModule("Stopping scan in connect test", err);
        }
        console.log("Telling p to connect...");
        peripheral.connect(function(err) {
          if (err) {
            return failModule("Connect callback", err);
          }
          console.log("connected callback!");
          gate++;
        });
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
          peripheral.once('disconnect', function(reason) {
            // Check the gate status
            if (gate != 4) {
              return failModule("Disconnecting from peripheral", err);
            }
            bluetooth.removeAllListeners();
            // Stop the timeout
            clearTimeout(failTimeout);
            // Declare success
            console.log("Connect Test Passed");
            // Next test
            bluetooth.reset(callback);
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
  console.log("Starting filter test...");
  impassableFilterAndStopTest(5000, function() {
    passableFilterTest(15000, function() {
      clearTimeout(failTimeout);
      bluetooth.reset(callback);
    });
  });
}

function passableFilterTest(timeout, callback) {
  //var passTimeout;// = setTimeout(failModule.bind(null, "Passable filter test"), timeout);

  var gate = 0;

  bluetooth.filterDiscover(passableFilter, function(err, matched) {
    if (err) {
      return failModule("Passable filter discover callback", err);
    }
    gate++;
  });

  bluetooth.once('discover', function(peripheral) {
    if (gate) {
      bluetooth.stopScanning(function(err) {
        if (err) {
          return failModule("Stopping scan in passable filter test", err);
        }
        else {
          clearTimeout(passTimeout);
          bluetooth.stopFilterDiscover();
          bluetooth.removeAllListeners();
      
          console.log("Passable Filter Test Passed.");
          bluetooth.reset(callback);
        }
      });
    }
    else {
      return failModule("Passable filter event", "Gate = " + gate.toString());
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
        bluetooth.reset(callback);
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

  console.log("Starting scan test.");
  // Set timeout for failure
  //failTimeout;// = setTimeout(failModule.bind(null, "Scan Test"), 40000);

  // Flag to keep track of functions that must be hit
  var gate = 0;

  // When the scan starts, trip the gate
  bluetooth.once('scanStart', function() {
    console.log("Scan start ")
    gate++;
  });

  // When the scan stops
  bluetooth.once('scanStop', function() {
    // We should have had three gates tripped
    if (gate == 3) {
      // clear failure timeout
      clearTimeout(failTimeout);

      console.log("Scan tests passed.");
      // remove any existing listeners
      bluetooth.removeAllListeners();

      // Continue with tests after resetting
      bluetooth.reset(callback);
    }
    else {
      return failModule("Stop scan event");
    }
  });

  // Start scanning
  bluetooth.startScanning(function(err) {
    console.log("Started scanning!")
    if (err) {
      // If there was an error, fail
      return failModule("Start scanning for peripherals");
    }
    gate++;

    // When we discover a peripheral, stop the scan
    bluetooth.once('discover', function(peripheral) {
      bluetooth.stopScanning(function(err) {
        console.log("Stopped scanning!")
        gate++;
        if (err) {
          return failModule("Stopping scan", err);
        }
      });
    });
  });
}

/*
Test surrounding instantiation of module
*/
function portTest(callback) {

  // Set timeout for this test
  //failTimeout;// = setTimeout(failModule.bind(null, "Port Test"), 30000);

  wrongPortTest(function() {
    rightPortTest(function() {
      clearTimeout(failTimeout);
      callback && callback();
    })
  })
}

function wrongPortTest(callback) {
  console.log("Testing Wrong Port Detection...");
  // No BLEs connected to this port
  var wrongPort = tessel.port('b');
   // Try to use the wrong port, testing callback
  bleDriver.use(wrongPort, function(err) {
    // If there wasn't an error, fail the test
    if (!err) {
      return failModule("Callback to 'use' on false port");
    }
    // Connect to the wrong port again, this time testing events
    var wrongBLE = bleDriver.use(wrongPort);

    // If there was an error, continue with test
    wrongBLE.once('error', function(err) {
      console.log("Successfully detected wrong module port.");
      wrongBLE.messenger.removeAllListeners();
      wrongBLE.removeAllListeners();

      callback();
    });

    // If the module connected somehow, fail the test
    wrongBLE.once('ready', failModule.bind(null, "Checking that incorrect port is not connected"));
  });
}

function rightPortTest(callback) {

  console.log("Testing Right Port Detection...");

  var rightBLE = bleDriver.use(blePort, function(err) {
    if (err) {
      return failModule("Callback to 'use' on correct port", err);
    }

    // If there was an error connecting to the real port, fail the test
    rightBLE.once('error', failModule.bind(null, 'Connecting to correct module port'));

    // If the module connected
    rightBLE.once('ready', function() {
      // Cancel the timeout
      clearTimeout(failTimeout);

      console.log("Successfully connected to correct module port.");
      rightBLE.messenger.removeAllListeners();
      // Continue with the next test
      rightBLE.removeAllListeners();

      callback();
    });
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

console.log("Setting up tests...");

bluetooth = bleDriver.use(blePort, function(err) {
  console.log("Callback called...");
  if (err) {
    return failModule("Connecting to BLE Test Module on Port A prior to commence", err);
  }
  else {
    beginTesting();
  }
});

function beginTesting() {
  console.log("Commencing tests.");
  // portTest(function() {
  //   scanTest(function() {
  //     filterTest(function() {
        // connectTest(function() {
          serviceDiscoveryTest(function() {
            characteristicDiscoveryTest(function() {
               passModule();
            })
          });
        // });
  //     });
  //   });
  // });
  // characteristicDiscoveryTest();
}


setInterval(function() {

}, 10000);