var tessel = require('tessel');
var async = require('async');
var test = require('tinytap');
var port1 = process.argv[2] || 'A';
var port2 = process.argv[3] || 'B';
var bleLib = require('../');

var ble1;
var ble2;
var ble2addr;
var connectedPeripheral;
var char0;
var char1;

var trans0_uuid = "883f1e6b76f64da187eb6bdbdb617888";
var trans1_uuid = "21819AB0C9374188B0DBB9621E1696CD";
var trans0_handle = 21;
var trans1_handle = 25;
var connected = false;

console.log('1..25');

async.series([
  test("Connecting to BLE module", function(t){
    ble1 = bleLib.use(tessel.port[port1], function(err, ble){
      t.ok(ble1, 'BLE object not returned');
      t.equal(err, undefined, 'Error connecting to BLE module');
      t.end();
    });
  }),
  test("Connecting to second BLE module", function(t){
    ble2 = bleLib.use(tessel.port[port2], function(err, ble){
      t.ok(ble2, 'Second BLE object not returned');
      t.equal(err, undefined, 'Error connecting to second BLE module');
      t.end();
    });
  }),
  test("Start advertising", function(t){
    ble2.startAdvertising(function(err){
      t.equal(err, undefined, "Error starting advertising");
      t.end();
    });
  }),
  test("Scan and filter duplicates", function(t){
    var discovered = [];
    ble1.startScanning();
    var timeout = setTimeout(function(){
      t.ok(true, "should not return duplicates")
      ble1.removeAllListeners('discover');
      ble1.stopScanning();
      t.end();
    },5000);
    ble1.on('discover', function(device){
      if (discovered.indexOf(device.address.toString()) < 0) {
        discovered.push(device.address.toString());
      } else {
        t.ok(false, "should not return duplicates");
        ble1.removeAllListeners('discover');
        clearTimeout(timeout);
        ble1.stopScanning();
        t.end();
      }
    });
  }),
  test("Scan and allow duplicates", function(t){
    var discovered = [];
    var timeout = setTimeout(function(){
      t.ok(false, "Allow duplicates timeout");
      ble1.removeAllListeners('discover');
      ble1.stopScanning();
      t.end();
    },20000);
    setTimeout(function(){
      ble1.startScanning({allowDuplicates:true})
    },5000);
    ble1.on('discover', function(device){
      if (discovered.indexOf(device.address.toString()) < 0) {
        discovered.push(device.address.toString());
      } else {
        t.ok(true, "should return duplicates");
        ble1.removeAllListeners('discover');
        clearTimeout(timeout);
        ble1.stopScanning();
        t.end();
      }
    });
  }),
  test("Set advertising data", function(t){
    var validAd = [0x02,0x01,0x06, 0x0F, 0x09, 0x74, 0x65, 0x73, 0x73, 0x65, 0x6c, 0x65, 0x72, 0x6f, 0x6d, 0x65, 0x74, 0x65, 0x72];
    var invalidAd = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
    ble2.setAdvertisingData(new Buffer(invalidAd), function(err){
      t.equal(true, !!err, "Long advertisement should give an error");
      ble2.setAdvertisingData(new Buffer(validAd), function(err){
        t.equal(err, undefined, "Valid advertisement should not error");
        t.end();
      });
    });
  }),
  test("Stop advertising", function(t){
    ble2.stopAdvertising(function(err){
      t.equal(err, undefined, "Error stopping advertising")
      t.end();
    });
  }),
  test("Get address", function(t){
    var timeout = setTimeout(function(){
      t.ok(false, "Get address timeout")
      t.end();
    }, 3000);
    ble2.getBluetoothAddress(function(err, addr){
      ble2addr = addr;
      t.ok(addr, "Device address not returned");
      t.equal(err, undefined, "Error getting device address");
      clearTimeout(timeout);
      t.end();
    });
  }),
  test("Connection", function(t){
    var connect1 = false;
    var connect2 = false;
    if (ble2addr){
      var timeout = setTimeout(function(){
        ble1.stopScanning();
        ble1.removeAllListeners('discover');
        ble1.removeAllListeners('connect');
        ble2.removeAllListeners('connect');
        ble2.stopAdvertising();
        t.ok(false, "Connection timeout");
        t.end();
      }, 5000);
      ble1.startScanning();
      ble2.startAdvertising();
      ble1.on('discover', function(peripheral){
        if (peripheral.address._str == ble2addr){
          peripheral.connect(function(err, peripheral){
            t.ok(peripheral, "Could not connect to peripheral");
            t.equal(err, undefined, "Error connecting to peripheral");
          });
        }
      });
      ble1.on('connect', function(peripheral){
        if (timeout) {
          clearTimeout(timeout);
        }
        ble1.removeAllListeners('discover');
        ble1.removeAllListeners('connect');
        connectedPeripheral = peripheral;
        connect1 = true;
        t.ok(true, "Could not connect to peripheral");
        if (connect2){
          connected = true;
          t.end();
        }
      });
      ble2.on('connect', function(connection){
        if (timeout) {
          clearTimeout(timeout);
        }
        ble2.removeAllListeners('connect');
        connect2 = true;
        t.ok(true, "Device 2 not connected");
        if (connect1){
          connected = true;
          t.end();
        }
      });
    } else {
      t.ok(false, "Cannot test until get address works");
      t.end();
    }
  }),
  test("Service discovery", function(t){
    if (connected){
      var timeout = setTimeout(function(){
        t.ok(false, "Service discovery timeout");
        t.end();
      }, 120000);
      ble1.discoverAllServicesAndCharacteristics(connectedPeripheral, function(err, results){
        clearTimeout(timeout);
        t.equal(17, results['characteristics'].length, "Wrong number of characteristics found");
        t.equal(4, results['services'].length,  "Wrong number of servies found");
        for (var i=0;i<results.characteristics.length;i++){
          if (results.characteristics[i].handle == trans0_handle){
            char0 = results.characteristics[i];
          }
          if (results.characteristics[i].handle == trans1_handle){
            char1 = results.characteristics[i];
          }
        }
        t.ok(char0, "Did not find first characteristic");
        t.ok(char1, "Did not find second characteristic");
        t.end();
      });
    } else {
      t.ok(false, "Must be connected to test");
      t.end();
    }
  }),
  test("Data read / write", function(t){
    if (char0 && char1){
      var timeout = setTimeout(function(){
        t.ok(false, "Characteristic read timeout");
        t.end();
      }, 5000);
      ble2.writeLocalValue(0, new Buffer([0xee]), function(err){
        t.equal(err, undefined, "Error writing local value");
        char0.read(function(err, value){
          clearTimeout(timeout);
          t.equal(value[0], 0xee, "Unexpected value on characteristic read");
          t.equal(err, undefined, "Error reading remote value");
          t.end();
        });
      });
    } else {
      t.ok(false, "Need characteristics to test");
      t.end();
    }
  }),
  test("Notifications", function(t){
    if (char0 && char1){
      var pass0 = false;
      var pass1 = false;
      var timeout = setTimeout(function(){
        ble1.removeAllListeners('notification');
        char1.removeAllListeners('notification');
        ble2.removeAllListeners('remoteNotification');
        t.ok(false, "Notification timeout");
        t.end();
      }, 25000);
      ble2.on('remoteNotification', function(conn, index){
        if (index == 0) {
          ble2.writeLocalValue(0, new Buffer([0x55]));
        }
        if (index == 1) {
          ble2.writeLocalValue(1, new Buffer([0xee]));
        }
      });
      ble1.notify(char0, true);
      ble1.on('notification', function(char, data){
        if (char == char0){
          pass0 = true;
          t.equal(data[0], 0x55, "Incorrect data notified on char 0");
          if (pass1){
            clearTimeout(timeout);
            ble2.removeAllListeners('remoteNotification');
            t.end();
          }
        }
      });
      setTimeout(function(){
        char1.notify(true);
        char1.on('notification', function(data){
          pass1 = true;
          char1.removeAllListeners('notification');
          t.equal(data[0], 0xee, "Incorrect data notified on char 1");
          if (pass0){
            clearTimeout(timeout);
            ble2.removeAllListeners('remoteNotification');
            t.end();
          }
        });
      }, 10000);
    } else {
      t.ok(false, "Need characteristics to test");
      t.end();
    }
  }),
  test("Reset", function(t){
    var timeout = setTimeout(function(){
      t.ok(false, "Reset timeout");
      t.end();
    }, 3000);
    ble1.reset(function(err){
      t.equal(err, undefined, "Error reseting device 1");
      ble2.reset(function(err){
        t.equal(err, undefined, "Error reseting device 2");
        t.end();
      });
    });
  })
  ], function(err){
  console.log('#Error executing tests',err);
});
