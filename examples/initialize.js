var tessel = require('tessel');
var blePort = tessel.port('a');

var ble = require('../').connect(blePort);
ble.on('connected', function(err) {
	if (err) return console.log(err);
  ble.startScanning();
});

ble.on('scanStart', function(err, result) {
  console.log("start", err, result);
  console.log("Scan started!", result);
});

ble.on('discover', function(peripheral) {
  console.log("Discovered peripheral: ", peripheral);
  console.log("Data: ", peripheral.data);
  // if (peripheral.name == "")
  // peripheral.connect();
  ble.stopScanning();
});

ble.on('connect', function() {

})
