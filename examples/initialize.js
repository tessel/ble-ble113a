var tessel = require('tessel');
var blePort = tessel.port('a');
var accelPort = tessel.port('c');

var accel = require('accel-mma84').connect(accelPort);

var ble = require('ble-ble113').connect(blePort, function(err) {
	if (err) return console.log(err);

	ble.startAdvertising(function(err, response) {
		if (!err) {
			console.log("Began advertising.");

			setInterval(updateAccelValues, 1000);
		}
	})
})

function updateAccelValues() {
	accel.getAcceleration(function(err, xyz) {
		ble.writeValue(0, xyz[0].toFixed(2), function(err, response) {
			if (err) return console.log("Oh shit it broke...");
			else console.log("Success: ", response);
		})
	})
}