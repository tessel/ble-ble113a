var tessel = require('tessel');
var hardware = tessel.port('gpio');
var ble = require('../');

var advertising = 0;

// Create a bluetooth controller connected to module port a
var bleController = ble.connect(hardware, function(err) {
	if (err) return console.log(err);
	if (!connected) {
		console.log("Connected!");
	}
});

bleController.on('booted', function() {
	console.log("REBOOT");
	if (advertising == 0) {
		// bleController.startAdvertising(function(err, response) {
		// 	console.log("Advertising Result: ", response.result);
		// });
		// bleController.writeValue("Sup dude?", function(err, response) {
		// 	if (err) console.log(err);
		// 	else console.log(response);
		// });
		// bleController.scanForPeripherals(function(err, response) {
		// 	if (err) return console.log(err);

		// 	console.log("Scan result:", response.result);
		// });
		// bleController.stopScanning();
		bleController.disconnectFromPeripheral(0, function(err, response) {
			if (err) return console.log(err);
			else console.log("DisConnect response:", response);
		});
		bleController.connectToPeripheral([161, 6, 128, 30, 184, 254]/*[108, 189, 40, 93, 28, 216]*/, 1, 25, 50, 500, 8, function(err, response) {
			if (err) return console.log(err);
			else console.log("Connect response:", response);
		})
		advertising = 1;
	}
});

bleController.on('connectionStatus', function(peripheral) {
	console.log("Connection Status!", peripheral);
	bleController.findInformation(peripheral.connection, 01, 255, function(err, response) {
		if (err) return console.log("Err", err);
		console.log("Find info response", response);
	})
})

bleController.on('disconnectedPeripheral', function(response) {
	console.log("Handle: ", response.handle, "reason: ", response.reason);
});

bleController.on('discoveredPeripheral', function(peripheral) {
	console.log("Found Peripheral!", peripheral);
})

bleController.on('foundInformation', function(information) {
	console.log("Found information!", information);
	bleController.readRemoteHandle(information.connection, information.chrhandle, function(err, response) {
		if (err) return console.log("Err", err);
		else console.log(response);
	})
});

bleController.on('completedProcedure', function(procedure) {
	console.log('completed procedure', procedure);
})
bleController.on('remoteValue', function(reading) {
	console.log("Reading: ", reading);
})



