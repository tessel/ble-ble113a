var tessel = require('tessel');
var blePort = tessel.port('a');

var ble = require('../index').connect(blePort, function(err) {
	if (err) return console.log(err);

	ble.startAdvertising(function(err, response) {
		if (!err) {
			console.log("Began advertising.");
		}
	})
})
