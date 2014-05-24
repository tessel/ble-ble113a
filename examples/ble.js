// Any copyright is dedicated to the Public Domain.
// http://creativecommons.org/publicdomain/zero/1.0/

/*********************************************
This Bluetooth Low Energy module demo turns
the module on, starts it advertising as a
peripheral, and writes information when
connected.
*********************************************/

var tessel = require('tessel');
var blePort = tessel.port['A'];

var ble = require('../').use(blePort);

var interval;

ble.on('ready', function(err) {
	if (err) return console.log(err);
  console.log('started advertising...');
  ble.startAdvertising();
});

ble.on('connect', function() {
  console.log("We have a connection to master.");
  var value = 0;
  interval = setInterval(function iteration() {
    var str = "Interval #" + value++;
    console.log("Writing out: ", str);

    ble.writeLocalValue(0, new Buffer(str));
  }, 1000);
});

ble.on('disconnect', function() {
  // Stop our interval
  clearInterval(interval);
  // Start advertising again
  ble.startAdvertising();
});
