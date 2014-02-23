var Peripheral = require('./lib/peripheral');
var Characteristic = require('./lib/characteristic');
var Service = require('./lib/service');
var Messenger = require('./lib/messenger');
var events = require('events');
var util = require('util');

var TX_HANDLE=20;

var characteristicHandles = [21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65];

/*************************************************************
Function:     connect
Description:  Set the module port of the Bluetooth module
        so the Tessel can begin communicating.
Params:     hardware - the module port ble was plugged in to
        callback - a callback for what happens after connecting
*************************************************************/
function use(hardware, callback) {
  var controller = new BluetoothController(hardware, callback);

  return controller;
}

/*************************************************************
Function:     BluetoothController
Description:  Instantiate a Bluetooth Controller object. Controls
        all BLE Central and Peripheral methods (depending)
        on role.
Params:     hardware - the module port ble was plugged in to
*************************************************************/
function BluetoothController(hardware, callback) {
  this.hardware = hardware;
  this.isAdvertising = false;
  this.messenger = new Messenger(hardware);
  this._connectedPeripherals = {};
  this._discoveredPeripherals = {};

  this.messenger.on('scanStart', this.onScanStart.bind(this));
  this.messenger.on('scanStop', this.onScanStop.bind(this));
  this.messenger.on('discover', this.onDiscover.bind(this));
  // this.messenger.on('advertiseStarted', this.onAdvertiseStarted.bind(this));
  // this.messenger.on('valueRead', this.onValueRead.bind(this));
  // this.messenger.on('valueWritten', this.onValueWritten.bind(this));
  // this.messenger.on('connectionStatus', this.onConnectionStatus.bind(this));
  // this.messenger.on('disconnect', this.onDisconnect.bind(this));
  // this.messenger.on('findInformationFound', this.onFindInformationFound.bind(this));
  // this.messenger.on('groupFound', this.onGroupFound.bind(this));
  // this.messenger.on('attributeValue', this.onAttributeValue.bind(this));

  // Once the messenger says we're ready
  this.messenger.once('ready', function() {
    // Tell any ble listeners
    setImmediate(function() {
      this.emit('ready');
    }.bind(this));
    // Call the callback
    callback && callback();
  }.bind(this));

  // If there was an error
  this.messenger.once('error', function(err) {
    // Emit the error
    setImmediate(function() {
      this.emit('error', err);
    }.bind(this));
    // Call the callback
    callback && callback(err);
  }.bind(this));
}

util.inherits(BluetoothController, events.EventEmitter);

/**********************************************************
 Event Handlers
**********************************************************/
BluetoothController.prototype.onScanStart = function(err, result) {
  this.emit('scanStart', err, result);
}

BluetoothController.prototype.onScanStop = function(err, result) {
  this.emit('scanStop', err, result);
}

BluetoothController.prototype.onDiscover = function(peripheralData) {
  // Try to grab this peripheral from list of previously discovered peripherals
  this.getPeripheralFromData(peripheralData, function(peripheral, undiscovered) {

  // If this peripheral hasn't been discovered or we allow duplicates
  if (undiscovered || (this._allowDuplicates)) {
      setImmediate(function() {
        this.emit('discover', peripheral);
      }.bind(this));
    }
  }.bind(this));
}

// BluetoothController.prototype.onAdvertiseStarted = function(err, response) {
//   this.isAdvertising = true;
//   this.emit('advertising', err, response.result);
// }

// BluetoothController.prototype.onValueRead = function(err, value) {
//   this.emit('valueRead', err, value);
// }
// BluetoothController.prototype.onValueWritten = function(err, value) {
//   this.emit('valueWritten', err, value);
// }

// BluetoothController.prototype.onConnectionStatus = function(status) {
//   var tempKey = status.address[0];
//   var peripheral = this._peripherals[tempKey];

//   if (!peripheral) {
//     peripheral = new Peripheral(
//             this,
//             null, 
//             null,
//             // BlueGiga's version of address
//             status.bd_addr,
//             status.address_type,
//             null);

//     // TODO: Take out after buffer property issue is resolved
//     this._peripherals[tempKey] = peripheral;
//     this._services[tempKey] = {};
//     this._characteristics[tempKey] = {};
//     this._descriptors[tempKey] = {};

//   }

//   peripheral.connection = status.connection;
//   peripheral.flags = status.flags;
//   peripheral.connInterval = status.conn_interval;
//   peripheral.timeout = status.timeout;
//   peripheral.latency = status.latency;
//   peripheral.bonding = status.bonding;

//   this._connectedPeripherals[peripheral.connection] = peripheral;

//   if (peripheral.flags & (1 << 2)) {
//     peripheral.emit('connected');
//     this.emit('connected', peripheral);
//   }
// }

// BluetoothController.prototype.onDisconnect = function(response) {
//   // TODO: Get corresponding peripheral somehow, set connected property to false
//   this.emit('disconnect', response.reason);
// }

// BluetoothController.prototype.onFindInformationFound = function(information) {
//   console.log("Found information!", information);
//   // If this is for the correct peripheral
//   // Get the correct peripheral that this is for
//   var peripheral = this._connectedPeripherals[information.connection];

//   if (peripheral) {
//     console.log("Found UUID: ", information.uuid);
//     var stringUUID = this.uuidToString(information.uuid);
//     peripheral.characteristics[stringUUID] = new Characteristic(this, peripheral, stringUUID, information.handle);
//   }
// }

// // how should we structure the code? What are the keys in object structures?
// // Should it be handles or UUIDs? Can we get UUIDs of characteristics? What are descriptors?

// /* 
//  Called when services or groups found
// */
// BluetoothController.prototype.onGroupFound = function(group) {
//   this.emit('groupFound', group);
// }

// BluetoothController.prototype.onAttributeValue = function(attribute) {
//   console.log("Found this attribute: ", attribute);

//   // var peripheral = this._connectedPeripherals[information.connection];

//   // if (peripheral) {

//   // }

// }

/**********************************************************
 Bluetooth API
**********************************************************/
BluetoothController.prototype.startScanning = function(allowDuplicates, callback) {

  // If the user just passed in a function, make allow duplicates a null
  if (typeof allowDuplicates == "function") {
    callback = allowDuplicates;
    allowDuplicates = null;
  }

  this._allowDuplicates = allowDuplicates;

  // Start scanning
  this.messenger.startScanning(this.manageRequestResult.bind(this, 'scanStart', callback));
}
BluetoothController.prototype.stopScanning = function(callback) {
  this.messenger.stopScanning(this.manageRequestResult.bind(this, 'scanStop', callback));
}

BluetoothController.prototype.manageRequestResult = function(event, callback, err, response) {
   // If there wasn't error with comms but with ble113 logic
  if (!err && response.result) {
    // Set result as error
    err = response.result;
  } 
  // If there wasn't an error
  if (!err) {
    // Emit the event
    setImmediate(function() {
      this.emit(event);
    }.bind(this));
  }
  // Call the callback
  callback && callback(err);
}

BluetoothController.prototype.filterDiscover = function(filter, callback) {

  // Cancel the previous discover event
  this.messenger.removeAllListeners('discover');

  // When we discover a peripheral, have our filter matcher test it
  this.messenger.on('discover', this.filterMatcher.bind(this, filter, callback));
}

BluetoothController.prototype.stopFilterDiscover = function(callback) {

  // Remove our discover listener
  this.messenger.removeAllListeners('discover');

  // Make the normal discover listener the default
  this.messenger.on('discover', this.onDiscover.bind(this));

  callback && callback();
}

BluetoothController.prototype.filterMatcher = function(filter, callback, peripheralData) {
  // Get saved for peripheral or make a new one
  this.getPeripheralFromData(peripheralData, function(peripheral, undiscovered) {
    // Apply the filter to the peripheral
    filter(peripheral, function(match) {
      // If we've got a match and it's undiscovered (or if it's old and we allow duplicated)
      if (match && (undiscovered || this._allowDuplicates)) {
        // Emit the event
        setImmediate(function() {
          this.emit('discover', peripheral);
        }.bind(this));

        // Call the callback
        callback && callback(null, peripheral);
      }
    }.bind(this));
  }.bind(this));
}

BluetoothController.prototype.getPeripheralFromData = function(peripheralData, callback) {
  // Try to grab this peripheral from list of previously discovered peripherals
  var peripheral = this._discoveredPeripherals[peripheralData.sender];

  // If it hasn't been discovered yet
  if (!peripheral) {
    // Make a peripheral object from the data
    peripheral = new Peripheral(
                this,
                peripheralData.rssi, 
                peripheralData.data,
                // BlueGiga's version of address
                peripheralData.sender,
                peripheralData.address_type,
                peripheralData.packet_type);

    // Put it in our discovered data structure
    this._discoveredPeripherals[peripheral.address] = peripheral;

    callback && callback(peripheral, true);
  }

  callback && callback(peripheral, false);
}

// BluetoothController.prototype.startAdvertising = function(callback) {
//   this.advertising = true;
//   this.messenger.startAdvertising(callback);
// }

// BluetoothController.prototype.readRemoteHandle = function(peripheral, uuid, callback) {

//   // Once the handle is read
//   this.messenger.once('handleRead', function(attribute) {
//     console.log("Oh shit, we're reading a handle", attribute);
//     // If it is for the same connection as this peripheral
//     if (attribute.connection == peripheral.connection) {
//       // Try to grab a pre-exisiting characterisitc
//       var characteristic = peripheral.characteristics[uuid];
//       // If it doesn't exist
//       if (!characteristic) {
//         // Create it 
//         characteristic = new Characteristic(this, peripheral.uuid, attribute.type, attribute.atthandle);
//       }
//       // Save the last value
//       characteristic.lastReadValue = attribute.value;

//       // Wait for the procedure to complete...
//     }
//   }.bind(this));

//   console.log("Setting the event...");
//   // Once the procedure completes
//   this.messenger.once('completedProcedure', function(result) {

//     console.log("Procedure completed!");
//     console.log("Uuid: ", uuid);
//     setImmediate(function() {
//       // Emit the event with
//       this.emit('handleRead' + uuid, peripheral.characteristics[uuid].lastReadValue);
//     }.bind(this));

//   }.bind(this));

//   this.messenger.readRemoteHandle(peripheral, uuid, function(err, response) {
//     if (err) {
//       if (err) console.log("Error sending read request: ", err);
//       else callback && callback(err);
//     }
//   }.bind(this));
// }

// BluetoothController.prototype.writeRemoteHandle = function(peripheral, uuid, callback) {

// }

// BluetoothController.prototype.readValue = function(index, callback) {
//   this.messenger.readValue(characteristicHandles[index], callback);
// }

// BluetoothController.prototype.writeValue = function(index, value, callback) {
//   this.messenger.writeValue(characteristicHandles[index], value, callback);
// }

// BluetoothController.prototype.connect = function(peripheral, callback) {
//   this.messenger.connect(peripheral.address, peripheral.addressType, callback);
// }

// BluetoothController.prototype.disconnect = function(peripheral, callback) {
//   this.messenger.disconnect(peripheral.connection, callback);
// }

// BluetoothController.prototype.discoverAllServices = function(peripheral, callback) {
//   // The 'groupFound' event is called when we find a service
//   this.on('groupFound', function(groupItem) {
//     // If this is the right peripheral
//     if (groupItem.connection == peripheral.connection) {
//       // Convert the UUID to a string instead of buffer
//       var strUUID = this.uuidToString(groupItem.uuid);
//       // Create a new service
//       var service = new Service(this, peripheral, strUUID, groupItem.start, groupItem.end);
//       // Add this services to the peripherals data structure
//       peripheral.services[service.uuid] = service;
//       console.log(service.toString());
//     }
//   }.bind(this));
//   // The 'completed Procedure' event is called when we're done looking for services
//   this.messenger.once('completedProcedure', function(procedure) {
//     // If this was called for this peripheral
//     if (procedure.connection == peripheral.connection) {
//       // Call the callback
//       callback && callback(null, peripheral.services);
//       // Prepare event emission
//       setImmediate(function() {
//         // Emit to any listeners on controller object
//         this.emit('servicesDiscovered', peripheral, peripheral.services);
//         // Emit for peripheral itself
//         peripheral.emit('servicesDiscovered', peripheral.services);
//       }.bind(this));
//     }
//   }.bind(this));
//   // Request the messenger to start discovering services
//   this.messenger.discoverAllServices(peripheral, function(err, response) {
//     // If there was a problem with the request
//     if (err || response.result != 0) {
//       // If it was an error reported by module, set that as error
//       if (!err) err = response.result;

//       // Call callback immediately
//       return callback && callback(err);
//     }
//   }.bind(this));
// }
// BluetoothController.prototype.discoverAllCharacteristics = function(peripheral, callback) {
//   // The 'completed Procedure' event is called when we're done looking for services
//   this.messenger.once('completedProcedure', function(procedure) {
//     console.log("PROCEDURE COMPLETED");
//     // If it didn't succeed
//     if (procedure.result != 0) {
//       console.log("Procedure failed: ", procedure.result);
//       callback && callback(procedure.result, null);
//     }
//     // If this was called for this peripheral
//     else if (procedure.connection == peripheral.connection) {
//       // Call the callback
//       callback && callback(null, peripheral.characteristics);
//       // Prepare event emission
//       setImmediate(function() {
//         // Emit to any listeners on controller object
//         this.emit('characteristicsDiscovered', peripheral, peripheral.characteristics);
//         // Emit for peripheral itself
//         peripheral.emit('characteristicsDiscovered', peripheral.characteristics);
//       }.bind(this));
//     }
//   }.bind(this));
//   // Request the messenger to start discovering services
//   this.messenger.discoverCharacteristics(peripheral, 0x0001, 0xFFFF, function(err, response) {
//     // If there was a problem with the request
//     if (err || response.result != 0) {
//       // If it was an error reported by module, set that as error
//       if (!err) err = response.result;
//       console.log("Was there  problem officer", err);
//       // Call callback immediately
//       return callback && callback(err);
//     }
//   }.bind(this));
// }

// BluetoothController.prototype.getAddress = function(callback) {
//   this.messenger.getAddress(function(err, response) {
//     callback && callback(err, response.address);
//   });
// }

// BluetoothController.prototype.whitelistAppend = function(address, callback) {
//   this.messenger.whitelistAppend(address, callback);
// }

// BluetoothController.prototype.clearWhitelist = function(callback) {
//   this.messenger.clearWhitelist(callback);
// }
// BluetoothController.prototype.connectSelective = function(callback) {
//   this.messenger.connectSelective(callback);
// }

// BluetoothController.prototype.updateRssi = function(peripheral, callback) {
//   this.messenger.updateRssi(peripheral, function(err, rssi) {
//     if (!err) {
//       setImmediate(function() {
//         this.emit('rssiUpdate', rssi);
//         peripheral.emit('rssiUpdate', rssi);
//       }.bind(this));
//     }
//     callback && callback(err, rssi);
//   }.bind(this));
// }

BluetoothController.prototype.uuidToString = function(uuidBuffer) {
  var str = "0x";
  var length = uuidBuffer.length;
  var elem;
  for (var i = 0; i < length; i++) {
    elem = uuidBuffer.readUInt8(length-1-i).toString(16);
    if (elem.length == 1) {
      elem = "0" + elem;
    }
    str += elem;

  }
  return str;
}
/*************************************************************
PUBLIC API
*************************************************************/
module.exports.use = use;
module.exports.BluetoothController = BluetoothController;