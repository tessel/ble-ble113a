var tessel = require('tessel');
var bgLib = require('bglib');
bgLib.setPacketMode(1);
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var DEBUG = 1;

var TX_HANDLE=20;

var characteristicHandles = [21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65];

/*************************************************************
Function: 		connect
Description: 	Set the module port of the Bluetooth module
				so the Tessel can begin communicating.
Params: 		hardware - the module port ble was plugged in to
				next - a callback for what happens after connecting
*************************************************************/
function connect(hardware, next) {
	var controller = new BluetoothController(hardware, next);

	return controller;
}

/*************************************************************
Function: 		BluetoothController
Description: 	Instantiate a Bluetooth Controller object. Controls
				all BLE Central and Peripheral methods (depending)
				on role.
Params: 		hardware - the module port ble was plugged in to
*************************************************************/
function BluetoothController(hardware, next) {
	this.hardware = hardware;
	this.isAdvertising = false;
	this.messenger = new BluetoothMessenger(hardware, this);
	var self = this;

	this.verifyCommunication(function(err, response) {
		if (err) {
			console.log("ERROR: Could not establish comms with BLE...");
			console.log(err.message);
			next && next(err);
		}

		else {

			console.log("Comms established with BLE!");
			self.emit('connected');
			next && next(null);
		}
	});
}

util.inherits(BluetoothController, EventEmitter);

/*************************************************************
Function: 		scanForPeripherals (Central Role)
Description: 	Start looking for peripheral devices to connect with
Params: 		timeout - number of milliseconds to search before giving up.
				If this value, is ignored, will scan forever.
				serviceUUIDs - An array of Service UUIDs
				next - A callback that should expect to receive
				an array of available devices.
*************************************************************/
BluetoothController.prototype.scanForPeripherals = function(next) {
	this.messenger.execute(bgLib.api.gapDiscover, [bgLib.GAPDiscoverMode.gap_discover_generic], next);
}

BluetoothController.prototype.stopScanning = function(next) {
	this.messenger.execute(bgLib.api.gapEndProcedure, next);
}

BluetoothController.prototype.connectToPeripheral = function(address, address_type, conn_interval_min, conn_interval_max, timeout, latency, next) {
	this.messenger.execute(bgLib.api.gapConnectDirect, [address, address_type, conn_interval_min, conn_interval_max, timeout, latency], next);
}

BluetoothController.prototype.disconnectFromPeripheral = function(handle, next) {
	this.messenger.execute(bgLib.api.connectionDisconnect, [handle], next);
}

BluetoothController.prototype.findInformation = function(connection, start, end, next) {
	this.messenger.execute(bgLib.api.attClientFindInformation, [connection, start, end], next);
}

BluetoothController.prototype.startAdvertising = function(next) {
	this.messenger.execute(bgLib.api.gapSetMode, [bgLib.GAPDiscoverableModes.gap_general_discoverable, bgLib.GAPConnectableMode.gap_directed_connectable], next);
}

BluetoothController.prototype.readLocalHandle = function(handle, next) {
	this.messenger.execute(bgLib.api.attributesRead, [handle, 0], next);
}

BluetoothController.prototype.readRemoteHandle = function(connection, handle, next) {
	this.messenger.execute(bgLib.api.attClientReadByHandle, [connection, handle], next);
}

BluetoothController.prototype.writeValue = function(handle, value, next) {
	// Quick hack to get around folks who haven't updated their firmware
	if (!next) {
		handle = TX_HANDLE;
	}
	else {
		handle = characteristicHandles[handle];
	}
	this.messenger.execute(bgLib.api.attributesWrite, [handle, 0, value], next);
}

BluetoothController.prototype.setAdvertisementData = function(data, next) {
	var length = data.length;

	var arr = [];
	arr.push(length);
	arr.push(0x09); // Flag for a name
	if (typeof data == "string") {
		for (var i = 0; i < data.length; i++) {
			arr.push(data.charCodeAt(i));
		}
	}
	else if (Array.isArray(data)) {
		arr = arr.concat(data);
	};

	console.log("Setting data: ", arr);

	this.messenger.execute(bgLib.api.gapSetAdvData, [1, data], next);
}

BluetoothController.prototype.verifyCommunication = function(next) {
	this.messenger.execute(bgLib.api.systemHello, next);
}

function BluetoothMessenger(hardware, controller) {
	this.uart = hardware.UART({baudrate:9600});
	this.controller = controller;
	this.awaitingResponse = [];
	this.uart.on('data', this.parseIncomingPackets.bind(this));

	this.commandPacketTimeoutDuration = 10000;

	// Set up the wake pin
	this.wakePin = hardware.gpio(3);
	this.wakePin.output().low();

	this.wakePin.high();
}

// TODO: Make this use the correct GPIO
/*************************************************************
Function: 		wakeBLE
Description: 	Either wake the ble chip up for comm or put it to sleep
Params: 		wakeBool - a boolean of whether it should be awake or asleep
*************************************************************/
BluetoothMessenger.prototype.wakeBLE = function(wakeBool) {
	tessel.sleep(10);
	this.wakePin.set(wakeBool);
	tessel.sleep(10);
}

BluetoothMessenger.prototype.execute = function(command, params, callback) {

	if (!command || command == 'undefined') {
		callback && callback (new Error("Invalid API call."), null);
		return;
	}

	// If they didn't enter any params and only a function
	// Assume there are no params
	if (typeof params == 'function') {
		callback = params;
		params = [];
	}

	var self = this;

	// Grab the packet from the library
	bgLib.getPacket(command, params, function(err, packet) {

		if (err) {
			// If we got a problem, let me hear it
			return callback && callback(err);
		}
		// Else we're going to send it down the wire
		else {
			// Get the bytes for the packet
			packet.getByteArray(function(bArray) {

				if (DEBUG) console.log("Byte Array to be sent: ", bArray);

				// Pull up the wake up pin 
				self.wakeBLE(1);

				// Wait for the BLE to say that the port has changed
				self.controller.once('hardwareIOPortStatusChange', function() {
					if (DEBUG) console.log("Port Change. Sending Packet");
					// Send the message
					self.sendBytes(packet, bArray, callback);
				});

			});
		}
	});
}

BluetoothMessenger.prototype.sendBytes = function(packet, bArray, callback) {

	// // Send it along
	var numSent = this.uart.write(bArray); 

	// Pull wake pin back down
	this.wakeBLE(0);

	// If we didn't send every byte, something went wrong
	// Return immediately
	if (bArray.length != numSent) {

		// Not enough bytes sent, somethign went wrong
		callback && callback(new Error("Not all bytes were sent..."), null);

	// Add the callback to the packet and set it to waiting
	} else if (callback) {

		// Set the callback the packet should respond to
		packet.callback = callback;

		// Add a timeout
		var self = this;
		packet.timeout = setTimeout(function() {
			self.commandPacketTimeout.bind(self, packet)();
		}, this.commandPacketTimeoutDuration);

		// Push packet into awaiting queue
		this.awaitingResponse.push(packet);
	}
}

BluetoothMessenger.prototype.commandPacketTimeout = function(commandPacket) {

	this.popMatchingResponsePacket(commandPacket, function(err, packet) {

		if (err) return console.log(err);
		if (packet) {
			try {
				return packet.callback(new Error("Packet Timeout..."));
			}
			catch (e) { 
				console.log(e); 
			}
		}
	})
}

BluetoothMessenger.prototype.popMatchingResponsePacket = function(parsedPacket, callback) {

	// Grab the first packet that matches the command and class
	var matchedPacket;
	// Iterating through packets waiting response
	for (var i in this.awaitingResponse) {
		// Grab the packet
		var packet = this.awaitingResponse[i]; 

		// If the class and ID are the same, we have a match
		if (packet.cClass == parsedPacket.cClass
			&& packet.cID == parsedPacket.cID) {

			// Clear the packet timeout
			clearTimeout(packet.timeout);

			// Delete it from the array
			this.awaitingResponse.splice(i, 1);

			// Save the command and break the loop
			matchedPacket = packet;
			break;
		}
	}

	callback && callback(null, matchedPacket);

	return matchedPacket;
}



BluetoothMessenger.prototype.parseIncomingPackets = function(data) {

	if (DEBUG) console.log("Just received this data: ", data);

	var self = this;

	// Grab the one or more responses from the library
	var incomingPackets = bgLib.parseIncoming(data, function(err, parsedPackets) {
		if (DEBUG) console.log("And that turned into ", parsedPackets.length, "packets")
		
		if (err){
			console.log(err);
			return;
		} 

		//For each response
		for (var i in parsedPackets) {
			var parsedPacket = parsedPackets[i];
			var cClass = parsedPacket.packet.cClass;
			var cID = parsedPacket.packet.cID;

			// If it's an event, emit the event
			// Find the type of packet
            switch (parsedPacket.packet.mType & 0x80) {
                // It's an event
                case 0x80: 
                	if (parsedPacket.response) {
						if (cClass == 0x07 && cID == 0x00) {
							self.controller.emit("hardwareIOPortStatusChange", parsedPacket.response);
						}
						else if (cClass == 0x06 && cID == 0x00) {
							self.controller.emit("discoveredPeripheral", parsedPacket.response);
						}
						else if (cClass == 0x00 && cID == 0x00) {
							self.controller.emit("booted");
						}
						else if (cClass == 0x03 && cID == 0x00) {
							self.controller.emit("connectionStatus", parsedPacket.response);
						}
						else if (cClass == 0x03 && cID == 0x04) {
							self.controller.emit('disconnectedPeripheral', parsedPacket.response);
						}
						else if (cClass == 0x04 && cID == 0x04) {
							self.controller.emit('foundInformation', parsedPacket.response);
						}
						else if (cClass == 0x04 && cID == 0x01) {
							self.controller.emit('completedProcedure', parsedPacket.response);
						}
						else if (cClass == 0x04 && cID == 0x05) {
							self.controller.emit('readValue', parsedPacket.response);
						}
					}

                    break;

                // It's a response
                case 0x00:
                    // Find the command that requested it
                   	self.popMatchingResponsePacket(parsedPacket.packet, function(err, packet) {

                        // Call the original callback
                        if (packet && packet.callback) packet.callback(err, parsedPacket.response);

                    });
                    break;
                default:
                        console.log("Malformed packet returned...");
            }                
		}
	});
}

/*************************************************************
PUBLIC API
*************************************************************/
module.exports.connect = connect;
module.exports.BluetoothController = BluetoothController;
module.exports.Events = Events;