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
var async = require('async');

// Used for bluetooth tests
var bluetooth;
var peripheral;

var slaveBPort = tessel.port('b');
var slaveDPort = tessel.port('d');

var slaveB;
var slaveD;

// Indication LEDs
var passedLED = tessel.led(1);
var failedLED = tessel.led(2);
var failed = false;
var failTimeout;

console.log("Setting up tests...");
console.log("Note: Still need to verify multiple peripherals & security methods.");

bluetooth = bleDriver.use(blePort, function(err) {
  if (err) {
    return failModule(err);
  }
  else {
    slaveB = bleDriver.use(slaveBPort, function(err) {
      if (err) {
        return failModule(err)
      }
      else {
        beginTesting();
      }
    })
  }
});

function beginTesting() {
  console.log("Commencing tests.");
  async.waterfall([
    //portTest,
    //scanTest, 
      // filterTest,
    // , connectTest
     // serviceDiscoveryTest
    // , characteristicDiscoveryTest
    // characteristicServiceDiscoveryTest
    // , discoverAllTest
    // , readCharacteristicTest
    // , writeCharacteristicTest
     writeLongCharacteristicTest
     // includedServiceTest
     // discoverAllTest
     // discoverCharacteristicDescriptorTest
    // discoverAllAttributesTest
     // writeDescriptorTest,
     // readDescriptorTest,
     // notificationTest,
     // indicationTest
     // signalStrengthTest,
     // systemCommandsTest,
     // maxNumValuesTest,
     // advertisingTest,
     // readWriteValueTest,
     // readWriteLongValueTest,
     // remoteWriteTest,
     // remoteNotificationStatusUpdateTest,
     // remoteIndicationStatusUpdateTest,
     // bondingTest
    ],

  function(err) {
    if (err) {
      return failModule(err);
    }
    else {
      return passModule();
    }
  });
}

function bondingTest(callback) {
  bluetooth.setBondable(true, function(err) {
    if (err) {
      return failModule("Setting to bondable", err);
    }
    else {
      console.log("Set to bondable successful...");
      connectToSlaveB(function(err, slave) {
        if (err) {
          return callback && callback(err);
        }
        bluetooth.on('disconnect', function(peripheral, reason) {
          console.log(peripheral.toString() + "disconnected because" + reason);
        });
        bluetooth.startEncryption(slave, function(err) {
          if (err) {
            return callback && callback(err);
          }
          else {
            console.log("Successfully encrypted connection!");
            bluetooth.getBonds(function(err, bonds) {
              if (err) {
                return callback && callback(err);
              }
              else {
                console.log("Got these bonds: ", bonds);
              }
            });
          }
        });
      });
    }
  })
}

function gpioWatchChangeTest(callback) {
  var gpio = bluetooth.gpio("p0_2");
  var trig = tessel.port('b').gpio(2).output();
  trig.high();
  gpio.watch('change', function(err, timestamp, type) {
    if (err) {
      return callback && callback(err);
    }
    else {
      gpio.unwatch('change', function(err) {
        if (err) {
          return callback && callback(err);
        }
        var timeout = setTimeout(function() {
          gpio.removeAllListeners();
          console.log("GPIO Watch Test Passed!");
          callback && callback();
        }, 2000);
        gpio.on('change', function(err, timestamp, type) {
          clearTimeout(timeout);

          return callback && callback(new Error("Interrupt fired after removed"));
        });
        trig.high();
      });
    }
  });
  setTimeout(function() {
    trig.low();
  }, 1000);
}

function gpioWriteTest(callback) {
  var gpio = bluetooth.gpio("p0_2");
  var reader = tessel.port('b').gpio(2).input();
  gpio.setOutput(true, function(err) {
    if (err) {
      return callback && callback(err);
    }
    else {
      var value = reader.readSync();
      if (value != 1) {
        return callback && callback(new Error("Incorrect GPIO value written."));
      }
      else {
        gpio.write(0, function(err) {
          if (err) {
            return callback && callback(err);
          }
          value = reader.readSync();
          if (value != 0) {
            return callback && callback(new Error("Incorrect GPIO value written."));
          }
          else {
            console.log("GPIO Writing Test Passed.");
            callback && callback();
          }
        })
      }

    }
  });
}

// This requires "p0_2" to be connected to port b, gpio 2
function gpioReadTest(callback) {
  var gpio = bluetooth.gpio("p0_2");
  var writer = tessel.port('b').gpio(2).output();
  writer.high();
  gpio.read(function(err, value) {
    if (err) {
      return callback && callback(err);
    }
    else if (value != 1) {
      return callback && callback(new Error("Incorrect GPIO value written."));
    }
    else {
    writer.low();
    gpio.read(function(err, value) {
      if (err) {
        return callback && callback(err);
      }
      else if (value != 0 ) {
        return callback && callback(new Error("Incorrect GPIO value written."));
      }
      else {
        console.log("GPIO Read Test Passed");
        callback && callback();
      }
    });
    }
  });
}

// This currently requires a Seeeduino programmed
// to send an 11 char string back (listening on address 0x40)
function i2cTest(callback) {
  console.log("Testing i2c...");
  var testString = "Hell yeah!";
  var master = bluetooth.I2C(0x40);
  master.transfer(testString, testString.length, function(err, rx) {
    if (err) {
      callback && callback(err);
    }
    else if (testString.length != rx.length) {
      callback && callback(new Error("Receiving correct number of bytes"));
    }
    else {
      console.log("I2C test passed.");
      callback && callback();
    }
  });
}

function ADCTest(callback) {
  console.log("Testing ADC...");
  var adcread = tessel.port('b').gpio(3).output();
  adcread.high();
  bluetooth.readADC(function(err, value) {
    if (value != 1) {
      return callback && callback(new Error("Incorrect adc read"));
    }
    else{
      adcread.low();
      bluetooth.readADC(function(err, value) {
        if (value != 0) {
            return callback && callback(new Error("Incorrect adc read"));
          }
          else {
            console.log("ADC Test passed!");
            callback && callback();
          }
      });
    }
  });
}

function remoteIndicationStatusUpdateTest(callback) {
  connectToMaster(function(err, master) {
    if (err) {
      return callback && callback(err);
    }
    else {
      master.discoverCharacteristics(['883f1e6b76f64da187eb6bdbdb617888'], function(err, characteristics) {
        if (err) {
          return callback && callback(err);
        }
        else {
          characteristics[0].startIndications(function(err, value) {
            if (err) {
              return callback && callback(err);
            }
            else {
              master.disconnect(function(err) {
                if (err) {
                  return callback && callback(err);
                }
              })
            }
          });
        }
      });
    }
  });
  bluetooth.once('connect', function(connection) {
    bluetooth.once('remoteIndication', function(connection, handle, value) {
      bluetooth.once('disconnect', function(connection, reason) {
        console.log("Remote Indication Test passed!");
        return callback && callback();
      })
    });
  })
}
function remoteNotificationStatusUpdateTest(callback) {
  connectToMaster(function(err, master) {
    if (err) {
      return callback && callback(err);
    }
    else {
      master.discoverCharacteristics(['883f1e6b76f64da187eb6bdbdb617888'], function(err, characteristics) {
        if (err) {
          return callback && callback(err);
        }
        else {
          characteristics[0].startNotifications(function(err, value) {
            if (err) {
              return callback && callback(err);
            }
            else {
              master.disconnect(function(err) {
                if (err) {
                  return callback && callback(err);
                }
              })
            }
          });
        }
      });
    }
  });
  bluetooth.once('connect', function(connection) {
    bluetooth.once('remoteNotification', function(connection, handle, value) {
      bluetooth.once('disconnect', function(connection, reason) {
        console.log("Remote Notification Test passed!");
        return callback && callback();
      })
    });
  })
}
function remoteWriteTest(callback) {
  connectToMaster(function(err, master) {
    if (err) {
      return callback && callback(err);
    }
    else {
      master.discoverCharacteristics(['883f1e6b76f64da187eb6bdbdb617888'], function(err, characteristics) {
        if (err) {
          return callback && callback(err);
        }
        else {
          characteristics[0].write(new Buffer('Will it work'), function(err, written) {
            if (err) {
              return callback && callback(err);
            }
            else {
              master.disconnect(function(err) {
                if (err) {
                  return callback && callback(err);
                }
              })
            }
          });
        }
      });
    }
  });
  bluetooth.once('connect', function(connection) {
    bluetooth.once('remoteWrite', function(connection, handle, value) {
      bluetooth.once('disconnect', function(connection, reason) {
        console.log("Remote Write Test passed!");
        return callback && callback();
      })
    });
  })
}

function readWriteLongValueTest(callback) {
  console.log("Testing read write of long local value");
  var testPhrase = "Alpha Bar Cappa Foo Something Super Long"
  bluetooth.writeLocalValue(0, testPhrase, function(err) {
    if (err) {
      return callback && callback(err);
    }
    else {
      bluetooth.readLocalValue(0, 0, function(err, value) {
        var repeat = value;
        if (err) {
          return callback && callback(err);
        }
        else if (value.toString() == testPhrase) {
          return callback && callback("Invalid read after first write");
        }
        else {
          bluetooth.readLocalValue(0, 32, function(err, value) {
            repeat = Buffer.concat([repeat, value]);
            if (err) {
              return callback && callback(err);
            }
            else if (repeat.toString() != testPhrase) {
              return callback && callback("Invalid read after second write");
            }
            else {
              console.log("Testing read write of long local value Passed!");
              callback && callback()
            }
          });
        }
      });
    }
  })
}

function readWriteValueTest(callback) {
  var testPhrase = "Alpha Bar Cappa Foo";
  bluetooth.writeLocalValue(0, testPhrase, function(err) {
    if (err) {
      return callback && callback(err);
    }
    else {
      bluetooth.readLocalValue(0, 0, function(err, value) {
        if (err) {
          return callback && callback(err);
        }
        else if (value.toString() != testPhrase) {
          return callback && callback(new Error("Invalid test read."));
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
  console.log("Read Firmware Version Test");
  bluetooth.getFirmwareVersion(function(err, version) {
    if (err) {
      return callback && callback(err);
    }
    console.log("Read Firmware Version Test Passed.");
    callback && callback();
  });
}

function maxNumValuesTest(callback) {
  bluetooth.maxNumValues(function(err, max) {
    if (err) {
      return callback && callback(err);
    }
    if (max <= 0) {
      return callback && callback(new Error("Invalid number of max values."));
    }
    else {
      console.log("Max Num Values Test Passed.");
      callback && callback();
    }
  });
}

// // Can't make this test until we use multiple modules
// function advertisementDataTest(callback) {
// }
//
//
function advertisingTest(callback) {
  console.log("Beginning advertising test...");
  bluetooth.once('startAdvertising', function() {
    bluetooth.once('connect', function() {
      bluetooth.once('disconnect', function(reason) {
        bluetooth.once('stopAdvertising', function(err) {
          if (err) {
            return callback && callback(err);
          }
          else {
            console.log("Advertising Test Passed.");
            bluetooth.reset(callback);
          }
        });
        bluetooth.stopAdvertising(function(err) {
          if (err) {
            return callback && callback(err);
          }
        });
      });
    });
    slaveB.startScanning({serviceUUIDs:['08c8c7a06cc511e3981f0800200c9a66']}, function(err) {
      if (err) {
        return callback && callback(err);
      }
      else {
        slaveB.on('discover', function(peripheral) {
          console.log("Discovered the advertising ble");
          slaveB.stopScanning(function(err) {
            if (err) {
              return callback && callback(err);
            }else {
              console.log("stopped scan");
              slaveB.connect(peripheral, function(err) {
                console.log("connected");
                if (err) {
                  return callback && callback(err);
                }
                else {
                  peripheral.disconnect(function(err) {
                    if (err) {
                      return callback && callback(err);
                    }
                  });
                }
              })
            }
          })
        })
      }
    })
  });
  bluetooth.startAdvertising(function(err) {
    if (err) {
      return callback && callback(err);
    }
  });
}
function systemCommandsTest(callback) {
  bluetooth.getBluetoothAddress(function(err, address) {
    if (err) {
      return callback && callback(err);
    }
    bluetooth.getMaxConnections(function(err, max) {
      if (err) {
        return callback && callback(err);
      }
      else {
        console.log("System Commands Test Passed.");
        callback && callback();
      }
    });
  })
}

function signalStrengthTest(callback) {
  console.log("Starting singal strength test...");
  connectToSlaveB(function(err, slave) {
    if (err) {
      return callback && callback(err);
    }
    slave.updateRssi(function(err, rssi) {
      console.log("GOT THIS", rssi);
      if (err) {
        return callback && callback(err);
      }
      if (rssi > 0) {
        return callback && callback(new Error("Invalid RSSI Value:" + rssi.toString()));
      }
      slave.disconnect(function(err) {
        if (err) {
          return callback && callback(err);
        }
        else {
          console.log("Successfully passed signal strength test", rssi.toString());
          bluetooth.reset( callback);
        }
      });
    });
  });
}
//
function notificationTest(callback) {
  console.log("Notification Test...");
  connectToMaster(function(err, master) {
    if (err) {
      return callback && callback(err);
    }
    master.discoverCharacteristics(['883f1e6b76f64da187eb6bdbdb617888'], function(err, characteristics) {
      if (err) {
        return callback && callback(err);
      }
      else {
        if (characteristics.length) {
          var char = characteristics[0];
          var testValue = new Buffer("Hi Test Friend.");
          char.once('notification', function(value) {
            if (value.toString() === testValue.toString()) {
              char.stopNotifications(function(err) {
                if (err) {
                  return callback && callback(err);
                }
                console.log("Notification Test Passed");
                return callback && callback();
              });
            }
            else {
              return callback && callback(new Error("Different string reported by notification"));
            }
          });

          char.startNotifications(function(err) {
            if (err) {
              return callback && callback(err);
            }
            else {
              bluetooth.writeLocalValue(0, testValue, function(err) {
                if (err) {
                  return callback && callback(err);
                }
              })
            }
          });
        }
      }
    });
  });
}
function indicationTest(callback) {
  console.log("Indication Test...");
  connectToMaster(function(err, master) {
    if (err) {
      return callback && callback(err);
    }
    master.discoverCharacteristics(['883f1e6b76f64da187eb6bdbdb617888'], function(err, characteristics) {
      if (err) {
        return callback && callback(err);
      }
      else {
        if (characteristics.length) {
          var char = characteristics[0];
          var testValue = new Buffer("Hi Test Friend.");
          char.once('indication', function(value) {
            console.log("Got an actual indication!", value);
            if (value.toString() === testValue.toString()) {
              bluetooth.once('indicated', function() {
                char.stopIndications(function(err) {
                  if (err) {
                    return callback && callback(err);
                  }
                  console.log("Indication Test Passed");
                  return callback && callback();
                });
              })
            }
            else {
              return callback && callback(new Error("Different string reported by indication"));
            }
          });
          console.log("Starting indications!");
          char.startIndications(function(err) {
            if (err) {
              return callback && callback(err);
            }
            else {
              bluetooth.writeLocalValue(0, testValue, function(err) {
                if (err) {
                  return callback && callback(err);
                }
              })
            }
          });
        }
      }
    });
  });
}

function readDescriptorTest(callback) {
  console.log("Beginning read descriptor test.");
  connectToSlaveB(function(err, slave) {
    if (err) {
      return callback && callback(err);
    }
    slave.discoverCharacteristics(['883f1e6b76f64da187eb6bdbdb617888'], function(err, characteristics) {
      if (err) {
        return callback && callback(err);
      }
      else {
        if (characteristics.length == 1) {
          characteristics[0].discoverAllDescriptors(function(err, descriptors) {
            if (err) {
              return callback && callback(err);
            }
            var gate = 0;
            if (descriptors.length) {
              bluetooth.once('descriptorRead', function(descriptor, value) {
                gate++;
              });
              slave.once('descriptorRead', function(descriptor, value) {
                gate++;
              });
              descriptors[0].once('descriptorRead', function(value) {
                if (gate === 3) {
                  slave.disconnect(function(err) {
                    if (err) {
                      return callback && callback(err);
                    }
                    else {
                      console.log("Descriptor Read Test Passed.");
                      bluetooth.reset(callback);
                    }
                  })
                }
              });
              descriptors[0].read(function(err, value) {
                if (err) {
                  return callback && callback(err);
                }
                else {
                  gate++;
                }
              });
            }
            else {
              return callback && callback(new Error("Read incorrect number of descriptors."));
            }
          });
        }
        else {
          return callback && callback(new Error("Read incorrect number of characteristics."));
        }
      }
    });
  })
}

function writeDescriptorTest(callback) {
  console.log("Beginning write descriptor test.");
  connectToSlaveB(function(err, slave) {
    if (err) {
      return callback && callback(err);
    }
    slave.discoverCharacteristics(['50888c106cc511e3981f0800200c9a66'], function(err, characteristics) {
      if (err) {
        return callback && callback(err);
      }
      else {
        if (characteristics.length == 1) {
          characteristics[0].discoverAllDescriptors(function(err, descriptors) {
            if (err) {
              return callback && callback(err);
            }
            var gate = 0;
            if (descriptors.length) {
              bluetooth.once('descriptorWrite', function(descriptor, written) {
                gate++;
              });
              slave.once('descriptorWrite', function(descriptor, written) {
                gate++;
              });
              descriptors[0].once('descriptorWrite', function(charWritten) {
                console.log("wrote this:", value);
                if (gate === 3) {
                  slave.disconnect(function(err) {
                    if (err) {
                      return callback && callback(err);
                    }
                    else {
                      console.log("Descriptor Read Test Passed.");
                      bluetooth.reset(callback);
                    }
                  })
                }
              });
              descriptors[0].write( new Buffer("hey jon"), function(err) {
                if (err) {
                  return callback && callback(err);
                }
                else {
                  gate++;
                }
              });
            }
            else {
              return callback && callback(new Error("Read incorrect number of descriptors."));
            }
          });
        }
        else {
          return callback && callback(new Error("Read incorrect number of characteristics."));
        }
      }
    });
  })
}

function discoverAllAttributesTest(callback) {
  console.log("Testing discovery of all attributes...");
  connectToSlaveB(function(err, slave) {
    if (err) {
      return callback && callback(err);
    }
    slave.discoverAllAttributes(function(err, results) {
      if (err) {
        return callback && callback(err);
      }
      else {
        if (results.services.length === 0) {
          return callback && callback(new Error("Discovered incorrect number of services"));
        }
        else if (results.characteristics.length === 0) {
          return callback && callback(new Error("Discovered incorrect number of characteristics"))
        }
        else if (results.descriptors.length === 0) {
          return callback && callback(new Error("Discovered incorrect number of descriptors"))
        }
        else {
          slave.disconnect(function(err) {
            if (err) {
              return callback && callback(err);
            }
            else {
              console.log("Discovery of all attributes passed.");
              bluetooth.reset(callback);
            }
          });
        }
      }
    });
  });
}

function discoverCharacteristicDescriptorTest(callback) {
  connectToSlaveB(function(err, slave) {
    if (err) {
      callback && callback(err);
    }
    slave.discoverCharacteristics(['883f1e6b76f64da187eb6bdbdb617888'], function(err, characteristics) {
      if (err) {
        callback && callback(err);
      }
      else {
        var char;
        for (var i = 0; i < characteristics.length; i++) {
          if (characteristics[i].uuid.toString() === "883f1e6b76f64da187eb6bdbdb617888") {
            char = characteristics[i];
          }
        }

        if (char) {
          char.discoverAllDescriptors(function(err, descriptors) {
            if (err) {
              callback && callback(err);
            }
            else if (descriptors.length === 2) {
              console.log("Descriptor discovery test passed.");
              callback && callback();
            }
            else {
              return callback && callback(new Error("Invalid number of descriptors returned"));
            }
          });
        }
        else {
          return callback && callback(new Error("Unable to find char in descriptor test..."));
        }
      }
    });
  });
}


function writeLongCharacteristicTest(callback) {
  connectToSlaveB(function(err, slave) {
    if (err) {
      return callback && callback(err);
    }
    else {
      var characteristicUUID = "883f1e6b76f64da187eb6bdbdb617888";
      slave.discoverCharacteristics([characteristicUUID], function(err, characteristics) {
        if (err) {
          return callback && callback(err);
        }
        else if (characteristics.length != 1) {
          return callback && callback(new Error("Retrieved invalid number of characteristics from discovery."));
        }
        else{
          var testChar = characteristics[0];
          console.log(testChar.toString());
          var testValue = new Buffer(100);
          testChar.write(testValue, function(err, written) {
            console.log("Result: ", err, written);
            if (err) {
              return callback && callback(err);
            }
            else {
              console.log("We supposedly wrote this:", written);
              testChar.read(function(err, value) {
                console.log("read back", value);
                if (err) {
                  return callback && callback(err);
                }
                else {
                  console.log("v", value.length);
                  console.log("t", testValue.length);
                  slave.disconnect(function(err) {
                    if (err) {
                      return failModule("Disconnecting after char write");
                    }
                    bluetooth.reset(callback);
                  })
                }
              });
            }
          });
        }
      });
    }
  });
}


function writeCharacteristicTest(callback) {
  console.log("Commencing single write test.");
  connectToSlaveB(function(err, slave) {
    if (err) {
      return callback && callback(err);
    }
    else {
      var characteristicUUID = "883f1e6b76f64da187eb6bdbdb617888";
      slave.discoverCharacteristics([characteristicUUID], function(err, characteristics) {
        if (err) {
          return callback && callback(err);
        }
        else if (characteristics.length != 1) {
          return callback && callback(new Error("Retrieved invalid number of characteristics from discovery."));
        }
        else{
          var testChar = characteristics[0];
          var testValue = "Testing 123"
          testChar.write(testValue, function(err, written) {
            if (err) {
              return callback && callback(err);
            }
            else {
              testChar.read(function(err, value) {
                if (err) {
                  return callback && callback(err);
                }
                else if (value.toString() != testValue){
                  return callback && callback(new Error("Incorrect value read back from write test."));
                }
                else {
                  slave.disconnect(function(err) {
                    if (err) {
                      return failModule("Disconnecting after char write");
                    }
                    console.log("Successfully wrote single buffer.");
                    bluetooth.reset(callback);
                  })
                }
              });
            }
          });
        }
      });
    }
  });
}

function readCharacteristicTest(callback) {
  var testString = "KickingAss";
  var characteristicUUID = "883f1e6b76f64da187eb6bdbdb617888";
  slaveB.writeLocalHandle(22, testString, function(err) {
    if (err) {
      return callback && callback(err);
    }
    else {
      connectToSlaveB(function(err, slave) {
        slave.discoverCharacteristics([characteristicUUID], function(err, characteristics) {
          if (characteristics.length != 1) {
            return callback && callback(new Error("Invalid number of characteristics recovered."));
          }
          else{
            var gate = 0;
            var testChar = characteristics[0];
            bluetooth.on('characteristicRead', function(characteristic, value){
              if (characteristic && (value.toString() === testString)) {
                gate++;
              }
            });
            slave.on('characteristicRead', function(characteristic, value) {
              if (characteristic && (value.toString() === testString)) {
                gate++;
              }
            })
            testChar.on('characteristicRead', function(value) {
              if ((value.toString() === testString) && gate == 3) {
                slave.disconnect(function(err) {
                  if (err) {
                    return callback && callback(err);
                  }
                  else {
                    console.log("Characteristic reading test passed!");
                    bluetooth.reset(callback);
                  }
                })
              }
              else {
                return callback && callback(new Error("Invalid gate read or value..."));
              }
            });
            testChar.read(function(err, value) {
              if (err) {
                return callback && callback(err);
              }
              if (value.toString() != testString) {
                return callback && callback(new Error("String returned is not as written"))
              }
              gate++;
            })
          }
        });
      });
    }
  });
}

function discoverAllTest(callback) {
  connectToSlaveB(function(err, slave) {
      if (err) {
        return callback && callback(err);
      }
    var gate = 0;
    slave.on('servicesDiscover', function(services) {
      gate++;
    });
    bluetooth.on('servicesDiscover', function(services) {
      gate++;
    });
    slave.on('characteristicsDiscover', function(characteristics) {
      if (gate != 4) {
        return callback && callback(new Error("Didn't hit all the gates" + gate.toString()));
      }
      else {
        slave.disconnect(function(err) {
          bluetooth.reset(callback);
        });
      }
    });
    bluetooth.on('characteristicsDiscover', function(characteristics) {
      gate++
    });
    slave.discoverAllServicesAndCharacteristics(function(err, result) {
      if (err) {
        return callback && callback(err);
      }
      gate++;
    });
  });
}


function characteristicServiceDiscoveryTest(callback) {
  console.log("Begin characteristic-service discovery tests (for syncing)...");
  connectToSlaveB(function(err, slave) {
    if (err) {
      return callback && callback(err);
    }
    else {
      subsetServiceCharacteristicDiscoveryTest(slave, function(err) {
        if (err) {
          return callback && callback(err);
        }
        else {
          slave.services = {};
          slave._unassignedCharacteristics = {};

          console.log("That other test");
          serviceSyncingDiscoveryTest(slave, function(err) {
            if (err) {
              return callback && callback(err);
            }
            else {
              slave.disconnect(function(err) {
                if (err) {
                  return callback && callback(err);
                }
                else {
                  bluetooth.reset(callback);
                }
              });
            }
          });
        }
      });
    }
  });
}

function serviceSyncingDiscoveryTest(slave, callback) {
  console.log("Attempting service syncing discovery test. This could take a while...");
  bluetooth.discoverAllCharacteristics(slave, function() {
    bluetooth.discoverAllServices(slave, function() {
      if (slave._unassignedCharacteristics.length == 0) {
        slave.disconnect(function(err) {
          if (err) {
            return callback && callback(err);
          }
          console.log("Completed service syncing test.");
          bluetooth.reset(callback);
        });
      }
      else {
        console.log("Shit length: ", slave._unassignedCharacteristics.length);
        return callback && callback(new Error("Service syncing not complete."));
      }
    });
  });
}


function subsetServiceCharacteristicDiscoveryTest(peripheral, callback) {
  console.log("Testing subset of service characteristics...");
  peripheral.discoverAllServices(function(err, services) {
    if (err) {
      return callback && callback(err);
    }
    console.log("Discovered services", services.length);
    services.forEach(function(service) {
      if (service.uuid.toString() === "d752c5fb13804cd5b0efcac7d72cff20") {
        var reqChar = ["883f1e6b76f64da187eb6bdbdb617888"];
        console.log("Service match.");
        service.discoverAllCharacteristics(function(err, allChars) {
          console.log("Discovered all: ", allChars.toString());
          if (allChars.length >= reqChar.length) {
            console.log("Disocvering specific");
            service.discoverCharacteristics(reqChar, function(err, subsetChars) {
              console.log("Then found these: ", subsetChars.toString());
              if (subsetChars.length == reqChar.length) {
                console.log("Subset of service characteristics passed.");
                callback();
              }
              else {
                return callback && callback(new Error("Invalid length of requested chars"));
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
  connectToSlaveB(function(err, slave) {
    if (err) {
      return callback && callback(err);
    }
    else {
      allCharacteristicDiscoveryTest(slave, function(err) {
        if (err) {
          return callback && callback(err);
        }
        else {
          specificCharacteristicDiscoveryTest(slave, function(err) {
            if (err) {
              return callback && callback(err);
            }
            slave.disconnect(function(err) {
              if (err) {
                return callback && callback(err);
              }
              bluetooth.reset(callback);
            });
          });
        }
      });
    }
  });
}

function specificCharacteristicDiscoveryTest(peripheral, callback) {
  var reqChar = ["ffa6", "883f1e6b76f64da187eb6bdbdb617888", "50888c106cc511e3981f0800200c9a66"];
  console.log("Specific characteristic discovery test...");
  peripheral.discoverCharacteristics(reqChar, function(err, pc) {
    if (err) {
      return callback && callback(err);
    }
    else {
      bluetooth.discoverCharacteristics(peripheral, reqChar, function(err, mc) {
        if (err) {
          return callback && callback(err);
        }
        else {
          if ((pc.length != (reqChar.length-1)) || ((reqChar.length-1) != mc.length)) {
            return callback && callback(new Error("Invalid number of characteristics returned from subset"));
          }
          else {
            console.log("Specific characteristic discovery test passed.");
            callback && callback();
          }
        }
      });
    }
  });
}


function allCharacteristicDiscoveryTest(peripheral, callback) {
  console.log("Discovering all characteristics...");
  peripheral.discoverAllCharacteristics(function(err, pc) {
    if (err) {
      return callback && callback(err);
    }
    bluetooth.discoverAllCharacteristics(peripheral, function(err, mc) {
      if (err) {
        return callback && callback(err);
      }
      if (pc.length != mc.length || pc.length === 0) {
        return callback && callback(new Error("Peripheral char length does not equal controller char length"));
      }
      else {
        console.log("All Characteristic Discovery Test Passed.");
        callback && callback();
      }
    });
  });
}

function includedServiceTest(callback) {
  connectToSlaveB(function(err, slave) {
    if (err) {
      return callback && callback(err);
    }
    else {
      bluetooth.discoverIncludedServices(slave, function(err, included) {
        if (err) {
          return callback && callback(err);
        }
        else {
          if (included.length === 1) {
            console.log("Included Service test complete.");
          }
          else {
            return callback && callback(new Error("Invalid return num of included services."));
          }
        }
      });
    }
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

  connectToSlaveB(function(err, slave) {
    if (err) {
      callback && callback(err);
    }
    else {
      discoverSpecificServicesTest(slave, function(err) {
        if (err) {
          callback && callback(err);
        }
        else {
          discoverAllServicesTest(slave, function(err) {
            if (err) {
              callback && callback(err);
            }
            else {
              slave.disconnect(function(err) {
                if (err) {
                  return callback && callback(err);
                }
                else {
                  clearTimeout(failTimeout);
                  bluetooth.reset(callback);
                }
              })
            }
          });
        }
      });
    }
  });
}

function discoverAllServicesTest(peripheral, callback) {
  var gate = 0;
  bluetooth.once('servicesDiscover', function(services) {
    return gate++;
  });
  peripheral.once('servicesDiscover', function(services) {

    if (gate === 2 && services.length > 2) {
      console.log("Complete service discovery test passed.");
      return callback && callback();
    }
    else {
      callback && callback(new Error("Incorrect number of gates hit on all service discovery."));
    }
  });
  console.log("Attempting complete discovery test...");
  bluetooth.discoverAllServices(peripheral, function(err, services) {
    if (err) {
      return callback && callback(err);
    }
    gate++;
  });
}

function discoverSpecificServicesTest(peripheral, callback) {
  var reqServices = ["1800", "d752c5fb13804cd5b0efcac7d72cff20"];
  var gate = 0;
  bluetooth.once('servicesDiscover', function(services) {
    if (services.length === reqServices.length) {
      return gate++;
    }
    else {
      return callback && callback(new Error("Invalid number of services returned on specific service discovery test."));
    }
  });
  peripheral.once('servicesDiscover', function(services) {
    if (gate === 2 && services.length === 2) {
      console.log("Subset service discovery test passed.");
      bluetooth.removeAllListeners();
      peripheral.removeAllListeners();
      callback && callback();
    }
    else {
      return callback && callback(new Error("Gate = " + gate.toString() + " not 2"));
    }
  });
  console.log("Attempting subset discovery test");
  peripheral.discoverServices(reqServices, function(err, services) {
      if (err) {
        return callback && callback(err);
      }
      gate++;
  });
}

function connectToMaster(callback) {
  connectToTestModule(slaveB, bluetooth, callback);
}
function connectToSlaveB(callback) {
  connectToTestModule(bluetooth, slaveB, callback);
}

function connectToTestModule(masterModule, slaveModule, callback) {
  slaveModule.startAdvertising(function(err) {
    if (err) {
      return failModule(err);
    }
    else {
      masterModule.once('discover', function(slave) {
        masterModule.stopScanning(function(err) {
          if (err) {
            return callback && callback(err);
          }

          slave.connect(function(err) {
            if (err) {
              return callback && callback(err);
            }
            else {
              return callback && callback(null, slave);
            }
          });
        });
      });

      masterModule.startScanning({serviceUUIDs:["08c8c7a06cc511e3981f0800200c9a66"]}, function(err) {
        if (err) {
          return callback && callback(err);
        }
      });
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

  slaveB.startAdvertising(function(err) {
    if (err) {
      return failModule(err);
    }
    else {

      // Start scanning
      bluetooth.startScanning({serviceUUIDs:['08c8c7a06cc511e3981f0800200c9a66']}, function(err) {
        // If there was an error, fail
        if (err) {
          return callback && callback(err);
        }
        // Once we discover a peripheral
        bluetooth.once('discover', function(peripheral) {
          // Stop scanning
          bluetooth.stopScanning(function(err) {
            if (err) {
              return callback && callback(err);
            }
            peripheral.connect(function(err) {
              if (err) {
                return callback && callback(err);
              }
              gate++;
            });
          });
          // Once we are connected to it
          bluetooth.once('connect', function(connectedPeripheral) {
            // Increase gate
            gate++;
            // Make sure it's the correct peripheral
            if (connectedPeripheral != peripheral) {
              return callback && callback(new Error("Connect controller event equalty test"));
            }
          });
          // Once the peripheral gets the connect event
          peripheral.once('connect', function() {
            // Check the gate status
            if (gate == 2) {
              // When we get the disconnect event
              bluetooth.on('disconnect', function(peripheral, reason) {
                if (err) {
                  return callback && callback(err);
                }
                // Increase the gate
                gate++;
              });
              // When the peripheral gets the disconnect event
              peripheral.once('disconnect', function(reason) {
                // Check the gate status
                if (gate != 4) {
                  return callback && callback(new Error("Reqested connect peripheral not same as event returned."))
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
              return callback && callback(new Error("Not all gates hit in connect"));
            }
          });
        });

      })
    }
  });
}
/*
Test surrounding filtering peripherals
scan with impassable filter
scan with passable filter
*/
function filterTest(callback) {
  var gate = 0;
  console.log("Starting filter test...");
  slaveB.startAdvertising(function(err) {
    if (err) {
      return failModule(err);
    }
    else {
      impassableFilterTest(5000, function(err) {
        if (err) {
          return callback && callback(err);
        }
        else {
          passableFilterTest(15000, function(err) {
            if (err) {
              return failModule(err);
            }
            else {
              clearTimeout(failTimeout);
              bluetooth.reset(callback);
            }
          });
        }
      });
    }
  });
}

function passableFilterTest(timeout, callback) {
  //var passTimeout;// = setTimeout(failModule.bind(null, "Passable filter test"), timeout);

  var gate = 0;

  bluetooth.once('discover', function(peripheral) {
    bluetooth.stopScanning(function(err) {
      if (err) {
        return callback && callback(err);
      }
      else {
        clearTimeout(passTimeout);
        bluetooth.removeAllListeners();
        console.log("Passable Filter Test Passed.");
        bluetooth.reset(callback);
      }
    });
  });

  console.log("Passable filter test started.");
  bluetooth.startScanning({serviceUUIDs:["08c8c7a06cc511e3981f0800200c9a66"]}, function(err) {
    if (err) {
      return callback && callback(err);
    }
  });

}

function impassableFilterTest(timeout, callback) {
  successTimeout = setTimeout(function() {
    if (!failed) {
      bluetooth.stopScanning(function(err) {
        if (err) {
          return callback && callback(err);
        }
        bluetooth.removeAllListeners();
        console.log("Impassable Filter Test Passed.");
        callback && callback();
      });
    }
  }, timeout);

  bluetooth.startScanning({serviceUUIDs:["fffffff"]}, function(err) {
    if (err) {
      return callback && callback(err);
    }

    bluetooth.once('discover', function(peripheral) {

      return callback && callback(new Error("Discovered peripheral in impassable filter test"));
    });
  });
}

/*
Test surrounding scanning for peripheral
*/
function scanTest(callback) {

  console.log("Starting scan test.");

  slaveB.startAdvertising(function(err) {
    if (err) {
      return failModule(err);
    }
    else {
      // Set timeout for failure
      //failTimeout;// = setTimeout(failModule.bind(null, "Scan Test"), 40000);

      // Flag to keep track of functions that must be hit
      var gate = 0;

      // When the scan starts, trip the gate
      bluetooth.once('scanStart', function() {
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
          callback && callback(new Error("Not all gates passed for scanning..."));
        }
      });

      // Start scanning
      bluetooth.startScanning(function(err) {
        if (err) {
          // If there was an error, fail
          return callback && callback(err);
        }
        gate++;

        // When we discover a peripheral, stop the scan
        bluetooth.once('discover', function(peripheral) {
          bluetooth.stopScanning(function(err) {
            gate++;
            if (err) {
              callback && callback(err);
            }
          });
        });
      });
    }
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
      return callback && callback(new Error("No error thrown for invalid module port."));
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
    wrongBLE.once('ready', callback.bind(null, "Checking that incorrect port is not connected"));
  });
}

function rightPortTest(callback) {

  console.log("Testing Right Port Detection...");

  var rightBLE = bleDriver.use(blePort, function(err) {
    if (err) {
      return callback && callback(err);
    }

    // If there was an error connecting to the real port, fail the test
    rightBLE.once('error', callback.bind(this));

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

function failModule(err)
{
  failed = true;
  clearTimeout(failTimeout);
  passedLED.low();
  console.log("Test failed.");
  if (err) {
    console.log(err);
  }
  bluetooth.reset(function() {
    failedLED.high();
  })

}

function passModule()
{
  if (!failed) {
    console.log("Tests passed.");
    passedLED.high();
  }
}

setInterval(function() {}, 10000);
