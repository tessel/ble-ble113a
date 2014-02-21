var tessel = require('tessel');

var master = tessel.port('a');
var slave = tessel.port('b');

var passedLED = tessel.led(1);
var errLED = tessel.led(2);
passedLED.output().low();
errLED.output().low();

var failTimeout;
var failed;

var ble = require('../index');

var _masterController;
var _slaveController;


var connectToMaster = function(callback) {
	// Connect master port to ble module
	_masterController = ble.use(master, function(err) {

		// If there wasn't a failure
		if (!modulesFailed(err, "Error Connecting to Master")) {

			// Report 
			console.log("Successfully connected to master.")

			// Call callback
			setImmediate(function() {
				callback && callback();
			});
		}
	});
}

var connectToSlave = function(callback) {

	console.log("Connecting to slave...");
	// Connect slave port to module
	_slaveController = ble.use(slave, function(err) {
		if (!modulesFailed(err, "Error connecting to slave!")) {

			console.log("Successfully connected to slave.")

			// Add the slave address to the master's whitelist
			addSlaveToWhitelist(callback);
		}
	});
}

function addSlaveToWhitelist(callback) {
	// Get this slave's bluetooth address
	_slaveController.getAddress(function(err, address) {

		if (!modulesFailed(err)) {
			// Logging
			console.log("Here is my address!", address);
			// Add the slave controller's address to the master's whitelist
			_masterController.whitelistAppend(address, function(err, response) {

				// if there was no problem adding the slave's address to the whitelist
				if (!modulesFailed(err, "Error adding slave address to whitelist")) {

					console.log("Adding slave address to whitelist successful.")
					// Call the callback
					setImmediate(function() {
						callback && callback();
					});
				}
			});
		}
	});
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

	// Have the slave start advertising
	_slaveController.startAdvertising( function(err, response) {
		if (!modulesFailed(err, "Error making slave advertise...")) {

			console.log("Slave started advertising successfully...")
			// Then the master should connect to any peripheral on its whitelist (the slave)
			_masterController.connectSelective(function(err, response) {
				if (!modulesFailed(err, "Error initiating connect selective mode")) {
					console.log("Connect request successful");
					// call that callback
					setImmediate(function() {
						callback && callback();
					})
				}
			})
		}
	});
}

function modulesFailed(err, reason) {
	if (err) {
		errLED.high();
		passedLED.low();
		console.log("Modules failed.", reason, ":", err);
		failed = true;
		return 1;
	}
	return 0;
}

function modulesPassed() {
	console.log("Tests passed!");
	passedLED.high();
}

connectModules( function() {
	console.log("Set timeout");
	failTimeout = setTimeout(modulesFailed.bind(null, new Error("Did not connect in time."), "Timeout called"), 25000);
	connectOverBLE();
});

// Woohoo! Master connected to the slave!
_masterController.once('connected', function() {
	console.log("cleared timeout");
	clearTimeout(failTimeout);
	console.log("Finished connecting!");

// clear the whitelist 
_masterController.clearWhitelist(function(err, response) {
		if (!modulesFailed(err, "Well shit. Failed to clear whitelist")) {
			// Woot the modules passed!

			// If the timeout didn't occur in the meantime....
			if (!failed) {
				modulesPassed();
			}
			
		}
	})
});





