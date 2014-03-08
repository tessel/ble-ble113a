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

console.log("Setting up tests...");


bluetooth = bleDriver.use(blePort, function(err) {
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
          // serviceDiscoveryTest(function() {
            // characteristicDiscoveryTest(function() {
              // characteristicServiceDiscoveryTest(function() {
                 // discoverAllTest(passModule);
                  // readCharacteristicTest(passModule);
                  // writeCharacteristicTest(passModule);
                  // writeLongCharacteristicTest(passModule);
                  // discoverAllDescriptorsTest(passModule);
                  // discoverCharacteristicDescriptorTest(passModule);
                  // discoverAllAttributesTest(passModule);
                  // readDescriptorTest(passModule);
                  // writeDescriptorTest(passModule);
                  // notificationTest(passModule);
                  // indicationTest(passModule);
                  // signalStrengthTest(passModule);
                  // systemCommandsTest(passModule);
                  // advertisingTest(passModule);
                  // advertisementDataTest(passModule);
                  // readFirmwareTest(passModule);
                  // maxNumberValueTest(passModule)
                  // readWriteValueTest(passModule);
                  // readWriteLongValueTest(passModule);
                  // remoteWriteTest();
                  remoteStatusUpdateTest();
            // });
          // });
        // });
      // });
  //   });
  // });
}

function remoteStatusUpdateTest(callback) {
  bluetooth.startAdvertising(function(err) {
    if (err) {
      return failModule("Beginning Advertisement", err);
    }
    bluetooth.once('connect', function(connection) {
      console.log("Connected!", connection);
      bluetooth.on('remoteNotification', function(connection, index) {
        console.log("Master watching notifications!", connection, index);
        bluetooth.once('disconnect', function(connection, reason) {
          console.log("Disconnected!", connection, reason);
        })
      });
    })
  })
}
function remoteWriteTest(callback) {
  bluetooth.startAdvertising(function(err) {
    if (err) {
      return failModule("Beginning Advertisement", err);
    }
    bluetooth.once('connect', function(connection) {
      console.log("Connected!", connection);
      bluetooth.on('remoteWrite', function(connection, handle, value) {
        console.log("Value was written!", connection, handle, value.toString());
        bluetooth.once('disconnect', function(connection, reason) {
          console.log("Disconnected!", connection, reason);
        })
      });
    })
  })
}

function readWriteLongValueTest(callback) {
  var testPhrase = "Alpha Bar Cappa Foo Something Super Long"
  bluetooth.writeLocalValue(0, testPhrase, function(err) {
    if (err) {
      return failModule("Writing local value", err);
    }
    else {
      bluetooth.readLocalValue(0, 0, function(err, value) {
        var repeat = value;
        if (err) {
          return failModule("Reading local value", err);
        }
        else if (value.toString() == testPhrase) {
          return failModule("Comparing written with long read local");
        }
        else {
          bluetooth.readLocalValue(0, 32, function(err, value) {
            repeat = Buffer.concat([repeat, value]);
            if (err) {
              return failModule("Reading local value", err);
            }
            else if (repeat.toString() != testPhrase) {
              return failModule("Comparing written with long read local");
            }
            else {
              console.log("Read Write Test Complete");
              callback && callback()
            }
          });
        }
      });
    }
  })
}

function readWriteValueTest(callback) {
  var testPhrase = "Alpha Bar Cappa Foo"
  bluetooth.writeLocalValue(0, testPhrase, function(err) {
    if (err) {
      return failModule("Writing local value", err);
    }
    else {
      bluetooth.readLocalValue(0, 0, function(err, value) {
        if (err) {
          return failModule("Reading local value", err);
        }
        else if (value.toString() != testPhrase) {
          return failModule("Comparing written with read local");
        }
        else {
          console.log("Read Write Test Complete");
          callback && callback()
        }
      });
    }
  })
}

function readFirmwareTest(callback) {
  bluetooth.getFirmwareVersion(function(err, version) {
    if (err) {
      return failModule("Reading firmware", err);
    }
    console.log("Got this version", version);

  });
}

function maxNumberValueTest(callback) {
  bluetooth.maxNumValues(function(err, max) {
    if (err) {
      failModule("Getting max values", err);
    }
    if (max <= 0) {
      failModule("Getting actual max value");
    }
    else {
        console.log("Max Num Values Test Passed.");
        callback && callback();
    }
  });
}

// Can't make this test until we use multiple modules
function advertisementDataTest(callback) {
}


function advertisingTest(callback) {
  bluetooth.once('startAdvertising', function() {
    console.log("Started advertising");
    bluetooth.once('connect', function() {
      bluetooth.once('disconnect', function(reason) {
        console.log("Disconnected from master...");
        bluetooth.once('stopAdvertising', function(err) {
          if (err) {
            return failModule("Stopping advertisement event", err);
          }
          console.log("Advertising Test Passed.");
          bluetooth.reset(callback);
        });
        bluetooth.stopAdvertising(function(err) {
          if (err) {
            return failModule("Stopping advertisement", err);
          }
        });
      });
    });
  });
  bluetooth.startAdvertising(function(err) {
    if (err) {
      return failModule("Starting to advertise", err);
    }
  });
}
function systemCommandsTest(callback) {
  bluetooth.getBluetoothAddress(function(err, address) {
    if (err) {
      return failModule("Retrieving address", err);
    }
    bluetooth.getMaxConnections(function(err, max) {
      if (err) {
        return failModule("Retrieving max connections", err);
      }
      console.log("System Commands Test Passed.");
    });
  })
}

function signalStrengthTest(callback) {
  connectToMoosh(function(moosh) {
    moosh.updateRssi(function(err, rssi) {
      if (err) {
        return failModule("Getting signal strength", err);
      }
      if (rssi > 0) {
        return failModule("Invalid Rssi value" + rssi.toString());
      }
      moosh.disconnect(callback);
    });
  });
}

function indicationTest(callback) {
  connectToMoosh(function(moosh) {
    console.log("Connected to moosh. Searching for chars...");
    moosh.discoverCharacteristics(['ffa2', 'ffa6'], function(err, characteristics) {
      if (err) {
        return failModule("Discovering meter settings and sample chars", err);
      }
      else {
        console.log("Got these: ", characteristics.toString());
        if (characteristics.length == 2) {
          var meterSettings = characteristics[1];
          var meterSample = characteristics[0];
          meterSample.once('indication', function(value) {
            console.log("Got indications of this value!", value);
            meterSample.stopNotifications(function(err) {
              if (err) {
                return failModule("Stopping indications", err);
                console.log("Stopped indications...");
              }

            });
          });
          console.log("Starting indications...");
          meterSample.confirmIndication(function(err) {
            if (err) {
              return failModule("Confirming indication...", err);
            }
            console.log("Confirmation sent");
          });
          // meterSample.startIndications(function(err) {
          //   if (err) {
          //     failModule("Starting indications", err);
          //   }
          //   console.log("Starting meter sampling...")
          //   meterSettings.write(new Buffer([3, 2, 0, 0, 0, 0, 0, 0, 23]), function(err, written) {
          //     if (err) {
          //       return failModule("Writing to characteristic in indication test", err);
          //     }
          //     else {
          //       console.log("Meter is sampling...");
          //     }
          //   });
          // });
        }
      }
    });
  });
}

function notificationTest(callback) {
  connectToMoosh(function(moosh) {
    console.log("Connected to moosh. Searching for chars...");
    moosh.discoverCharacteristics(['ffa2', 'ffa6'], function(err, characteristics) {
      if (err) {
        return failModule("Discovering meter settings and sample chars", err);
      }
      else {
        if (characteristics.length == 2) {
          var meterSettings = characteristics[1];
          var meterSample = characteristics[0];
          meterSample.once('notification', function(value) {
            console.log("Got notified of this value!", value);
            meterSample.stopNotifications(function(err) {
              if (err) {
                return failModule("Stopping notifications", err);
              }
              console.log("Stopped notifications...");
            });
          });
          console.log("Starting notifications...");
          meterSample.startNotifications(function(err) {
            if (err) {
              failModule("Starting notifications", err);
            }
            console.log("Starting meter sampling...")
            meterSettings.write(new Buffer([3, 2, 0, 0, 0, 0, 0, 0, 23]), function(err, written) {
              if (err) {
                return failModule("Writing to characteristic in notification test", err);
              }
              else {
                console.log("Meter is sampling...");
              }
            });
          });
        }
      }
    });
  });
}
function writeDescriptorTest(callback) {
  connectToMoosh(function(moosh) {
    moosh.discoverCharacteristics(['ffa2'], function(err, characteristics) {
      if (err) {
        return failModule("Discovering characteristic in write descriptor test", err);
      }
      else {
        if (characteristics.length == 1) {
          characteristics[0].discoverAllDescriptors(function(err, descriptors) {
            if (err) {
              return failModule("Writing characteristic descriptor", err);
            }
            var gate = 0;
            if (descriptors.length) {
              bluetooth.once('descriptorWrite', function(descriptor, value) {
                gate++;
              });
              moosh.once('descriptorWrite', function(descriptor, value) {
                gate++;
              });
              descriptors[0].once('descriptorWrite', function(value) {

                if (gate === 3) {
                  console.log("Descriptor Write Test Passed.")
                  // bluetooth.reset(callback);
                }
              });
              descriptors[0].write(new Buffer([0x1, 0x0]), function(err, value) {
                if (err) {
                  return failModule("writing descriptor", err);
                }
                else {
                  gate++;
                }
              });
            }
            else {
              return failModule("Reading correct number of descriptors");
            }
          });
        }
        else {
          return failModule("Reading correct number of characteristics");
        }
      }
    });
  });
}
function readDescriptorTest(callback) {
  connectToMoosh(function(moosh) {

    moosh.discoverCharacteristics(['ffa2'], function(err, characteristics) {
      if (err) {
        return failModule("Discovering characteristic in read descriptor test", err);
      }
      else {
        if (characteristics.length == 1) {
          characteristics[0].discoverAllDescriptors(function(err, descriptors) {
            if (err) {
              return failModule("Reading characteristic descriptor", err);
            }
            var gate = 0;
            if (descriptors.length) {
              bluetooth.once('descriptorRead', function(descriptor, value) {
                gate++;
              });
              moosh.once('descriptorRead', function(descriptor, value) {
                gate++;
              });
              descriptors[0].once('descriptorRead', function(value) {

                if (gate === 3) {
                  console.log("Descriptor Read Test Passed.")
                  bluetooth.reset(callback);
                }
              });
              descriptors[0].read(function(err, value) {
                if (err) {
                  return failModule("Reading descriptor", err);
                }
                else {
                  gate++;
                }
              });
            }
            else {
              return failModule("Reading correct number of descriptors");
            }
          });
        }
        else {
          return failModule("Reading correct number of characteristics");
        }
      }
    });
  })
}


function discoverAllAttributesTest(callback) {
  connectToMoosh(function(moosh) {
    moosh.discoverAllAttributes(function(err, results) {
      if (err) {
        return failModule("Discovering all attributes", results);
      }
      else {
        if (results.services.length === 0) {
          return failModule("Discovering correct number of services");
        }
        if (results.characteristics.length === 0) {
          return failModule("Discovering correct number of characteristics");
        }
        if (results.descriptors.length === 0) {
          return failModule("Discovering correct number of descriptors");
        }
        moosh.disconnect(function() {
          bluetooth.reset(callback);
        });
      }
    });
  });
}

function discoverCharacteristicDescriptorTest(callback) {
  connectToMoosh(function(moosh) {
    moosh.discoverAllCharacteristics(function(err, characteristics) {
      if (err) {
        return failModule("Discovering single characteristic in descriptor discovery", err);
      }
      else {
        var char;
        for (var i = 0; i < characteristics.length; i++) {
          if (characteristics[i].uuid.toString() === "ffa6") {
            char = characteristics[i];
          }
        }

        if (char) {
          char.discoverAllDescriptors(function(err, descriptors) {
            if (err) {
              return failModule("Discovering descriptors of characteristic", err);
            }
            else {
              console.log("Found these descriptors lying around", descriptors.toString());
            }
          });
        }
        else {
          console.log("No char match found");
        }
      }
    });
  });
}

function discoverAllDescriptorsTest(callback) {
  connectToMoosh(function(moosh) {
    moosh.discoverAllDescriptors(function(err, descriptors) {
      if (err) {
        return failModule("Discovering all descriptors", err);
      }
      else {
        console.log("Here are the descriptors", descriptors.toString());
        moosh.disconnect(function(err) {
          if (err) {
            return failModule("Disconnecting from moosh", err);
          }
          else {
            bluetooth.reset(callback);
          }
        });
      }
    });
  });
}

function discoverSpecificService(callback) {
  connectToMoosh(function(moosh) {
    var meterSettings = "ffa2";
    bluetooth.discoverSpecificServices(moosh, [meterSettings], function(err, services) {
      if (err) {
        return failModule("Discovering specific service quickly", err);
      }
      else {
        console.log("Found these services", services);
      }
    })
  })
}

function writeLongCharacteristicTest(callback) {
  connectToMoosh(function(moosh) {
    var meterName = "ffa3";
    moosh.discoverCharacteristics([meterName], function(err, characteristics) {
      if (err) {
        return failModule("Fetching characteristics for write", err);
      }
      if (characteristics.length != 1) {
        return failModule("Fetching moosh meter settings");
      }
      else{
        var deviceName = characteristics[0];
        console.log(deviceName.toString());
          deviceName.write('abcdefghijklmnopqrstuvwxyz', function(err, written) {
          console.log("Result: ", err, written);
          if (err) {
            return failModule("Writing characteristic string", err);
          }
          console.log("We supposedly wrote this:", written);
          moosh.disconnect(function(err) {
            if (err) {
              return failModule("Disconnecting after char write");
            }
            bluetooth.reset(callback);
          })
        });
      }
    });
  });
}


function writeCharacteristicTest(callback) {
  connectToMoosh(function(moosh) {
    var meterName = "ffa3";
    moosh.discoverCharacteristics([meterName], function(err, characteristics) {
      if (err) {
        return failModule("Fetching characteristics for write", err);
      }
      if (characteristics.length != 1) {
        return failModule("Fetching moosh meter settings");
      }
      else{
        var deviceName = characteristics[0];
        console.log(deviceName.toString());
        deviceName.write('Johnny\'s Meter\0\0', function(err, written) {
          console.log("Result: ", err, written);
          if (err) {
            return failModule("Writing characteristic string", err);
          }
          console.log("We supposedly wrote this:", written);
          moosh.disconnect(function(err) {
            if (err) {
              return failModule("Disconnecting after char write");
            }
            bluetooth.reset(callback);
          })
        });
      }
    });
  });
}

function readCharacteristicTest(callback) {
  connectToMoosh(function(moosh) {
    meterSettingsUUID = "FFA6";
    moosh.discoverCharacteristics([meterSettingsUUID], function(err, characteristics) {
      if (characteristics.length != 1) {
        return failModule("Fetching moosh meter settings");
      }
      else{
        var gate = 0;
        console.log(characteristics[0].toString());
        var meterSettings = characteristics[0];
        bluetooth.on('characteristicRead', function(characteristic, value){
          if (characteristic && value) {
            gate++;
          }
        });
        moosh.on('characteristicRead', function(characteristic, value) {
          if (characteristic && value) {
            gate++;
          }
        })
        meterSettings.on('characteristicRead', function(value) {
          if (value.length > 0 && gate == 3) {
            moosh.disconnect(function(err) {
              if (err) {
                return failModule("Couldn't disconnect on char read", err);
              }
              else {
                console.log("Characteristic reading test passed!");
                bluetooth.reset(callback);
              }
            })
          }
          else {
            return failModule("Char read value and gate test");
          }
        });
        meterSettings.read(function(err, value) {
          if (err) {
            return failModule("Reading meter settings", err);
          }
          console.log("Meter value: ", value);
          gate++;
        })
      }
    });
  });
}

function discoverAllTest(callback) {
    connectToMoosh(function(moosh) {
    var gate = 0;
    moosh.on('servicesDiscover', function(services) {
      gate++;
    });
    bluetooth.on('servicesDiscover', function(services) {
      gate++;
    });
    moosh.on('characteristicsDiscover', function(characteristics) {
      if (gate != 4) {
        return failModule("Didn't hit all the gates" + gate.toString());
      }
      else {
        moosh.disconnect(function(err) {
          bluetooth.reset(callback);
        });
      }
    });
    bluetooth.on('characteristicsDiscover', function(characteristics) {
      gate++
    });
    moosh.discoverAllServicesAndCharacteristics(function(err, result) {
      if (err) {
        return failModule("Discovering all services and chars", err);
      }
      else if (result.services.length != 0 && result.characteristics.length != 0) {
        console.log("Heck yes!", result);
      }

      gate++;
    });
  });
}

function clearCacheTest(callback) {
  connectToMoosh(function(moosh) {
    moosh.discoverAllCharacteristics(function(err, characteristics) {
      moosh.clearCache();
      moosh.discoverAllCharacteristics(function(err, again) {
        moosh.discoverAllServices(function(err, services) {
          moosh.clearCache();
          moosh.discoverAllServices(function(err, again) {
            moosh.disconnect(function(err) {
              bluetooth.reset(callback);
            })
          })
        })
      });
    });
  });
}

function characteristicServiceDiscoveryTest(callback) {
  // connectToMoosh(function(moosh) {
  //   completeServiceCharacteristicDiscoveryTest(moosh, function() {
  //     moosh.disconnect(function(err) {
  //       if (err) {
  //         return failModule("Disconnect from moosh in char service disco test", err);
  //       }
        connectToMoosh(function(moosh) {
          console.log("Connected!");
          subsetServiceCharacteristicDiscoveryTest(moosh, function() {
            moosh.disconnect(function(err) {
              if (err) {
                return failModule("Disconnect from moosh in char service disco test", err);
              }
                // serviceSyncingDiscoveryTest(function() {
                    bluetooth.reset(callback);
                // });
              });
            });
          });
  //   });
  // });
}

function serviceSyncingDiscoveryTest(callback) {
  connectToMoosh(function(moosh) {
    bluetooth.discoverAllCharacteristics(moosh, function() {
      bluetooth.discoverAllServices(moosh, function() {
        if (moosh._unassignedCharacteristics.length == 0) {
          moosh.disconnect(function(err) {
            if (err) {
              return failModule("Disconnect from moosh in char service disco test", err);
            }
            console.log("Completed service syncing test.");
            bluetooth.reset(callback);
          });
        }
        else {
          console.log("Shit length: ", moosh._unassignedCharacteristics.length);
          return failModule("Still have unassigned characteristics after discovery");
        }
      });
    });
  });
}

function completeServiceCharacteristicDiscoveryTest(peripheral, callback) {
  console.log("Discovering all services");
  peripheral.discoverAllServices(function(err, services) {
    if (err) {
      return failModule("Discovering all services", err);
    }
    console.log("Done discovering all services", services);
    console.log("From the horse's mouth: ", peripheral.services);
    peripheral.discoverAllCharacteristics(function(err, characteristics) {
      if (err) {
        return failModule("Discovering all chars", err);
      }
      callback && callback();
    });
  });
}

function subsetServiceCharacteristicDiscoveryTest(peripheral, callback) {
  peripheral.discoverAllServices(function(err, services) {
    if (err) {
    return failModule("Discovering all services", err);
    }
    services.forEach(function(service) {
      if (service.uuid.toString() === "ffa0") {
        var reqChar = ["ffa6"];
        service.discoverAllCharacteristics(function(err, allChars) {
          console.log("Discovered all: ", allChars.toString());
          if (allChars.length >= reqChar.length) {
            console.log("Disocvering specific");
            service.discoverCharacteristics(reqChar, function(err, subsetChars) {
              console.log("Then found these: ", subsetChars.toString());
              if (subsetChars.length == reqChar.length) {
                callback();
              }
              else {
                return failModule("Characteristic Length validation");
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

  connectToMoosh(function(moosh) {
    // allCharacteristicDiscoveryTest(moosh, function() {
      specificCharacteristicDiscoveryTest(moosh, function() {
        moosh.disconnect(function(err) {
          if (err) {
            return failModule("Disconnecting from moosh in char test", err);
          }
          bluetooth.reset(callback);
        });
      });
    // });
  });
}

function specificCharacteristicDiscoveryTest(peripheral, callback) {
  var reqChar = ["ffa6", "ffa5"];
  console.log("Specific discovery test");
  peripheral.discoverCharacteristics(reqChar, function(err, pc) {
    if (err) {
      return failModule("Discovering specific characteristics", err);
    }
    bluetooth.discoverCharacteristics(peripheral, reqChar, function(err, mc) {
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
      console.log("PC Length: ", pc.length);
      console.log("MC Length: ", mc.length);
      if (pc.length != mc.length || pc.length === 0) {
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
}

function discoverAllServicesTest(peripheral, callback) {
  var gate = 0;
  bluetooth.once('servicesDiscover', function(services) {
    return gate++;
  });
  peripheral.once('servicesDiscover', function(services) {
    console.log("peripheral service hit.");
    for (var i = 0; i < services.length; i++) {
      console.log(services[i].toString());
    }
    if (gate === 2 && services.length > 2) {
      console.log("Complete service discovery test passed.");
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
  bluetooth.once('servicesDiscover', function(services) {
    if (services.length === reqServices.length) {
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
    bluetooth.stopScanning(function(err) {
      if (err) {
        return failModule("Stop scanning for moosh", err);
      }

      moosh.connect(function(err) {
        if (err) {
          return failModule("Connecting to moosh", err);
        }
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

setInterval(function() {

}, 10000);
