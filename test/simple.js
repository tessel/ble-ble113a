var tessel = require('tessel');

var master = tessel.port['A'];

var passedLED = tessel.led(1);
var errLED = tessel.led(2);
passedLED.output().low();
errLED.output().low();

console.log('1..1');
require('../').use(master, function (err, ble) {
	ble.getBluetoothAddress(function (err, address) {
		console.log(!err && address && address.length ? 'ok' : 'not ok', '- address:', address);
		process.exit(!!err);
	});
});
