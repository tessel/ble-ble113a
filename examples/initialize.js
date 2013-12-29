var tessel = require('tessel');
console.log("What the hell?");
var hardware = tessel.port('b');
// var ble = require('../');

// var uart = hardware.UART();

// uart.on('data', function(data) {
//   console.log(data);
// });

hardware.gpio(1).output().high();
// uart.write([4, 0, 0, 0, 1]);
console.log("okay....");





