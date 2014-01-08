var tessel = require('tessel');
var hardware = tessel.port('a');
var ble = require('../index');

var advertising = 0;

// Create a bluetooth controller connected to module port a
var bleController = ble.connect(hardware, function(err) {
	if (err) return console.log(err);
	if (!connected) {
		console.log("Connected!");
		beginReadingPeripheral();
	}
});

bleController.on('booted', function() {
	console.log("Just rebooted...");
	beginReadingPeripheral();
});

function beginReadingPeripheral() {
	bleController.startAdvertising();
	// bleController.scanForPeripherals();
	// bleController.connectToPeripheral([108, 189, 40, 93, 28, 216], 1, 25, 50, 500, 8, function(err, response) {
	// 	if (err) return console.log(err);
	// 	else console.log("Connect response:", response);
	// })
}

// bleController.on('connectionStatus', function(peripheral) {
// 	console.log("Connection Status!", peripheral);
// 	bleController.findInformation(peripheral.connection, 01, 63000, function(err, response) {
// 		if (err) return console.log("Err", err);
// 		console.log("Find info response", response);
// 	})
// })

// bleController.on('disconnectedPeripheral', function(response) {
// 	console.log("Disconnected from peripheral.");
// 	if (!response.handle) {
// 		console.log("reason: ", response.reason);
// 	}
// });

// bleController.on('discoveredPeripheral', function(peripheral) {
// 	console.log("Found Peripheral!", peripheral);
// })

// bleController.on('foundInformation', function(information) {
// 	console.log("Found information!", information);
// 	// bleController.readRemoteHandle(information.connection, information.chrhandle, function(err, response) {
// 	// 	if (err) return console.log("Err", err);
// 	// 	else console.log(response);
// 	// })
// });

// bleController.on('completedProcedure', function(procedure) {
// 	console.log('completed procedure', procedure);
// })
// bleController.on('remoteValue', function(reading) {
// 	console.log("Reading: ", reading);
// })



