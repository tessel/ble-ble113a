var tessel = require('tessel');
var blePort = tessel.port['A'];

var ble = require('../').use(blePort);

ble.on('ready', function(err) {
  ble.startScanning();
});

ble.on('discover', function(p) {
  console.log('discovered p', p.toString());
});
