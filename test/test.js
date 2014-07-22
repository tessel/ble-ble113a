var tessel = require('tessel');
var async = require('async');
var test = require('ttt');
var port1 = process.argv[2] || 'A';
var port2 = process.argv[3] || 'B';
var bleLib = require('../');
var ble1;
var ble2;

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
      t.equal(true, true, "should not return duplicates")
      ble1.removeAllListeners('discover');
      ble1.stopScanning();
      t.end();
    },5000);
    ble1.on('discover', function(device){
      if (discovered.indexOf(device.address.toString()) < 0) {
        discovered.push(device.address.toString());
      } else {
        t.equal(true, false, "should not return duplicates");
        ble1.removeAllListeners('discover');
        clearInterval(timeout);
        ble1.stopScanning();
        t.end();
      }
    });
  }),
  test("Scan and allow duplicates", function(t){
    var discovered = [];
    var timeout = setTimeout(function(){
      t.equal(true, false, "should return duplicates");
      ble1.removeAllListeners('discover');
      ble1.stopScanning();
      t.end();
    },20000);
    setTimeout(function(){
      ble1.startScanning({allowDuplicates:true});
    },10000);
    ble1.on('discover', function(device){
      if (discovered.indexOf(device.address.toString()) < 0) {
        discovered.push(device.address.toString());
      } else {
        t.equal(true, true, "should return duplicates");
        ble1.removeAllListeners('discover');
        clearInterval(timeout);
        ble1.stopScanning();
        t.end();
      }
    });
  }),
  test("Stop Advertising", function(t){
    ble2.stopAdvertising(function(err){
      t.equal(err, undefined, "Error stopping advertising")
      t.end();
    });
  })
  ], function(err){
  console.log('Error executing tests',err);
});
