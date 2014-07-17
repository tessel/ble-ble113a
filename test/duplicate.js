var tessel = require('tessel');
var bleLib = require('../');
console.log('1..2');

var ble = bleLib.use(tessel.port['A']);

ble.on('ready', function(){
  testOne();
});

function testOne () {
  var discovered = [];
  ble.startScanning();
  var timeout = setTimeout(function(){
    console.log('ok - did not return duplicates.');
    ble.removeAllListeners('discover');
    ble.stopScanning();
    testTwo();
  },5000);
  ble.on('discover', function(device){
    if (discovered.indexOf(device.address.toString()) < 0) {
      discovered.push(device.address.toString());
    } else {
      console.log('not ok - duplicates found');
      ble.removeAllListeners('discover');
      clearInterval(timeout);
      ble.stopScanning();
      testTwo();
    }
  });
}

function testTwo () {
  var discovered = [];
  var timeout = setTimeout(function(){
    console.log('not ok - did not return duplicates.');
    ble.removeAllListeners('discover');
    process.exit();
  },20000);
  setTimeout(function(){
    ble.startScanning({allowDuplicates:true});
  },10000);
  ble.on('discover', function(device){
    if (discovered.indexOf(device.address.toString()) < 0) {
      discovered.push(device.address.toString());
    } else {
      console.log('ok - duplicates found');
      ble.removeAllListeners('discover');
      clearInterval(timeout);
      process.exit();
    }
  });
}
