var tessel = require('tessel');
var master = tessel.port('a');
var slave = tessel.port('b');
var passedLED = tessel.led(1);
var errLED = tessel.led(2);
passedLED.output().low();
errLED.output().low();
var ble = require('../index');

var _masterController;
var _slaveController;


var connectToMaster = function(callback) {
	_masterController = ble.connect(master, function(err) {
		if (err) {
			console.log("Error connecting to master!")
			return errLED.high();
		} 
		else {
			console.log("Successfully connected to master.")
		}
		
		setImmediate(function() {
			callback && callback();
		});
	});
}

var connectToSlave = function(callback) {
	console.log("Connecting to slave...");
	_slaveController = ble.connect(slave, function(err) {
		if (err) {
			console.log("Error connecting to slave!")
			return errLED.high();
		} 
		else {
			console.log("Successfully connected to slave.")
		}
		setImmediate(function() {
			callback && callback();
		});
	})
}

var connectModules = function(callback) {
	connectToMaster(function() {
		connectToSlave(function() {
			callback && callback();
		})
	})
}

var connectOverBLE = function(callback) {
	console.log("Beginning slave advertisement...");
	_slaveController.setAdvertisementData("Yay Tessel", function(err, response) {
		if (err) return console.log("err adv", err);
		else {
			_slaveController.startAdvertising( function() {
				if (err) {
					console.log("Error making slave advertise...");
					return errLED.high();
				}
				else {
					console.log("Slave started advertising successfully...")
					_masterController.scanForPeripherals(
						function(err, response) {
							if (err) {
								console.log("Error scanning for peripherals...");
								return errLED.high();
							}
							else {
								console.log("Scanning for peripherals");
								masterDetectSlave(callback);
							}
						}
					)
				}
			})
		}
	})
}

var masterDetectSlave = function(callback) {
	_masterController.on('discoveredPeripheral', function(peripheral) {
		console.log("Found a peripheral!");
		console.log(peripheral);
		_masterController.stopScanning(function(err, response) {
			if (err) return console.log("stop scan error: ", err);
			else {
				console.log("stop scan result: ", response.result);
			}
		});
		
	});
}

connectModules( function() {
	connectOverBLE(function() {
		console.log("Finished connecting...");
	});
});




