var tessel = require('tessel');
var blePort = tessel.port('a');

var ble = require('../').use(blePort);

ble.on('ready', function(err) {
	if (err) return console.log(err);
  console.log("Module found");
  ble.startScanning();
});

ble.on('error', function(err) {
  console.log("Could not connect to module: ", err);
});

ble.on('scanStart', function(err) {
  console.log("Began scanning for BLE devices...");
});

ble.on('scanStop', function(err) {
  console.log("Stopped scanning.");
});

ble.on('discover', function(peripheral) {
  console.log("We found this peripheral!", peripheral.toString());
});



setInterval(function() {}, 20000);
