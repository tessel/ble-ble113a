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
  this._peripherals = {};
  this._services = {};
  this._characteristics = {};
  this._descriptors = {};
  this._discoveredPeripheralsAddresses = [];

  this.messenger.on('ready', this.onReady.bind(this));
  this.messenger.on('error', this.onError.bind(this));
  this.messenger.on('advertiseStarted', this.onAdvertiseStarted.bind(this));
  this.messenger.on('valueRead', this.onValueRead.bind(this));
  this.messenger.on('valueWritten', this.onValueWritten.bind(this));
  this.messenger.on('scanStart', this.onScanStart.bind(this));
  this.messenger.on('scanStop', this.onScanStop.bind(this));
  this.messenger.on('discover', this.onDiscover.bind(this));
  this.messenger.on('connectionStatus', this.onConnectionStatus.bind(this));
  this.messenger.on('disconnected', this.onDisconnect.bind(this));
  this.messenger.on('findInformationFound', this.onFindInformationFound.bind(this));
  this.messenger.on('groupFound', this.onGroupFound.bind(this));
  this.messenger.on('attributeValue', this.onAttributeValue.bind(this));

  this.messenger.on('booted', this.messenger.verifyCommunication.bind(this.messenger, callback));
}

util.inherits(BluetoothController, events.EventEmitter);

/**********************************************************
 Event Handlers
**********************************************************/

BluetoothController.prototype.onReady = function(err) {
  this.connected = true;
  this.emit('ready', err);
}
BluetoothController.prototype.onError = function(err) {
  this.connected = false;
  this.emit('error', err);
}

BluetoothController.prototype.onAdvertiseStarted = function(err, response) {
  this.isAdvertising = true;
  this.emit('advertising', err, response.result);
}

BluetoothController.prototype.onDiscover = function(peripheralData) {

  var tempKey = peripheralData.sender[0];

  var peripheral = this._peripherals[tempKey];

  if (!peripheral) {
    peripheral = new Peripheral(
                this,
                peripheralData.rssi, 
                peripheralData.data,
                // BlueGiga's version of address
                peripheralData.sender,
                peripheralData.address_type,
                peripheralData.packet_type);

    // TODO: Take out after buffer property issue is resolved
    this._peripherals[tempKey] = peripheral;
    this._services[tempKey] = {};
    this._characteristics[tempKey] = {};
    this._descriptors[tempKey] = {};
  }

  var previouslyDiscovered = (this._discoveredPeripheralsAddresses.indexOf(tempKey) !== -1);

  if (!previouslyDiscovered) {
    this._discoveredPeripheralsAddresses.push(tempKey);
  }

  if (this._allowDuplicates || !previouslyDiscovered) {
    this.emit('discover', peripheral);
  }
}

BluetoothController.prototype.onValueRead = function(err, value) {
  this.emit('valueRead', err, value);
}
BluetoothController.prototype.onValueWritten = function(err, value) {
  this.emit('valueWritten', err, value);
}
BluetoothController.prototype.onScanStart = function(err, result) {
  this.emit('scanStart', err, result);
}

BluetoothController.prototype.onScanStop = function(err, result) {
  this.emit('scanStop', err, result);
}

BluetoothController.prototype.onConnectionStatus = function(status) {
  var tempKey = status.address[0];
  var peripheral = this._peripherals[tempKey];

  if (!peripheral) {
    peripheral = new Peripheral(
            this,
            null, 
            null,
            // BlueGiga's version of address
            status.bd_addr,
            status.address_type,
            null);

    // TODO: Take out after buffer property issue is resolved
    this._peripherals[tempKey] = peripheral;
    this._services[tempKey] = {};
    this._characteristics[tempKey] = {};
    this._descriptors[tempKey] = {};

  }

  peripheral.connection = status.connection;
  peripheral.flags = status.flags;
  peripheral.connInterval = status.conn_interval;
  peripheral.timeout = status.timeout;
  peripheral.latency = status.latency;
  peripheral.bonding = status.bonding;

  this._connectedPeripherals[peripheral.connection] = peripheral;

  if (peripheral.flags & (1 << 2)) {
    peripheral.emit('connected');
    this.emit('connected', peripheral);
  }
}

BluetoothController.prototype.onDisconnect = function(response) {
  // TODO: Get corresponding peripheral somehow, set connected property to false
  this.emit('disconnect', response.reason);
}

BluetoothController.prototype.onFindInformationFound = function(information) {
  console.log("Found information!", information);
  // If this is for the correct peripheral
  // Get the correct peripheral that this is for
  var peripheral = this._connectedPeripherals[information.connection];

  if (peripheral) {
    console.log("Found UUID: ", information.uuid);
    var stringUUID = this.uuidToString(information.uuid);

    peripheral.characteristics[stringUUID] = new Characteristic(this, peripheral, stringUUID, information.handle);
  }
}

// how should we structure the code? What are the keys in object structures?
// Should it be handles or UUIDs? Can we get UUIDs of characteristics? What are descriptors?

/* 
 Called when services or groups found
*/
BluetoothController.prototype.onGroupFound = function(group) {
  this.emit('groupFound', group);
}

BluetoothController.prototype.onAttributeValue = function(attribute) {
  console.log("Found this attribute: ", attribute);

  // var peripheral = this._connectedPeripherals[information.connection];

  // if (peripheral) {

  // }

}

/**********************************************************
 Bluetooth API
**********************************************************/
BluetoothController.prototype.startScanning = function(allowDuplicates, callback) {
  this._discoveredPeripheralsAddresses = [];
  this._allowDuplicates = allowDuplicates;
  this.messenger.startScanning(callback);
}
BluetoothController.prototype.stopScanning = function(callback) {
  this.messenger.stopScanning(callback);
}

BluetoothController.prototype.startAdvertising = function(callback) {
  this.advertising = true;
  this.messenger.startAdvertising(callback);
}

BluetoothController.prototype.readRemoteHandle = function(peripheral, uuid, callback) {

  // Once the handle is read
  this.messenger.once('handleRead', function(attribute) {
    console.log("Oh shit, we're reading a handle", attribute);
    // If it is for the same connection as this peripheral
    if (attribute.connection == peripheral.connection) {
      // Try to grab a pre-exisiting characterisitc
      var characteristic = peripheral.characteristics[uuid];
      // If it doesn't exist
      if (!characteristic) {
        // Create it 
        characteristic = new Characteristic(this, peripheral.uuid, attribute.type, attribute.atthandle);
      }
      // Save the last value
      characteristic.lastReadValue = attribute.value;

      // Wait for the procedure to complete...
    }
  }.bind(this));

  console.log("Setting the event...");
  // Once the procedure completes
  this.messenger.once('completedProcedure', function(result) {

    console.log("Procedure completed!");
    console.log("Uuid: ", uuid);
    setImmediate(function() {
      // Emit the event with
      this.emit('handleRead' + uuid, peripheral.characteristics[uuid].lastReadValue);
    }.bind(this));

  }.bind(this));

  this.messenger.readRemoteHandle(peripheral, uuid, function(err, response) {
    if (err) {
      if (err) console.log("Error sending read request: ", err);
      else callback && callback(err);
    }
  }.bind(this));
}

BluetoothController.prototype.writeRemoteHandle = function(peripheral, uuid, callback) {

}

BluetoothController.prototype.readValue = function(index, callback) {
  this.messenger.readValue(characteristicHandles[index], callback);
}

BluetoothController.prototype.writeValue = function(index, value, callback) {
  this.messenger.writeValue(characteristicHandles[index], value, callback);
}

BluetoothController.prototype.connect = function(peripheral, callback) {
  this.messenger.connect(peripheral.address, peripheral.addressType, callback);
}

BluetoothController.prototype.disconnect = function(peripheral, callback) {
  this.messenger.disconnect(peripheral.connection, callback);
}

BluetoothController.prototype.discoverAllServices = function(peripheral, callback) {
  // The 'groupFound' event is called when we find a service
  this.on('groupFound', function(groupItem) {
    // If this is the right peripheral
    if (groupItem.connection == peripheral.connection) {
      // Convert the UUID to a string instead of buffer
      var strUUID = this.uuidToString(groupItem.uuid);
      // Create a new service
      var service = new Service(this, peripheral, strUUID, groupItem.start, groupItem.end);
      // Add this services to the peripherals data structure
      peripheral.services[service.uuid] = service;
      console.log(service.toString());
    }
  }.bind(this));
  // The 'completed Procedure' event is called when we're done looking for services
  this.messenger.once('completedProcedure', function(procedure) {
    // If this was called for this peripheral
    if (procedure.connection == peripheral.connection) {
      // Call the callback
      callback && callback(null, peripheral.services);
      // Prepare event emission
      setImmediate(function() {
        // Emit to any listeners on controller object
        this.emit('servicesDiscovered', peripheral, peripheral.services);
        // Emit for peripheral itself
        peripheral.emit('servicesDiscovered', peripheral.services);
      }.bind(this));
    }
  }.bind(this));
  // Request the messenger to start discovering services
  this.messenger.discoverAllServices(peripheral, function(err, response) {
    // If there was a problem with the request
    if (err || response.result != 0) {
      // If it was an error reported by module, set that as error
      if (!err) err = response.result;

      // Call callback immediately
      return callback && callback(err);
    }
  }.bind(this));
}
BluetoothController.prototype.discoverAllCharacteristics = function(peripheral, callback) {
  // The 'completed Procedure' event is called when we're done looking for services
  this.messenger.once('completedProcedure', function(procedure) {
    console.log("PROCEDURE COMPLETED");
    // If it didn't succeed
    if (procedure.result != 0) {
      console.log("Procedure failed: ", procedure.result);
      callback && callback(procedure.result, null);
    }
    // If this was called for this peripheral
    else if (procedure.connection == peripheral.connection) {
      // Call the callback
      callback && callback(null, peripheral.characteristics);
      // Prepare event emission
      setImmediate(function() {
        // Emit to any listeners on controller object
        this.emit('characteristicsDiscovered', peripheral, peripheral.characteristics);
        // Emit for peripheral itself
        peripheral.emit('characteristicsDiscovered', peripheral.characteristics);
      }.bind(this));
    }
  }.bind(this));
  // Request the messenger to start discovering services
  this.messenger.discoverCharacteristics(peripheral, 0x0001, 0xFFFF, function(err, response) {
    // If there was a problem with the request
    if (err || response.result != 0) {
      // If it was an error reported by module, set that as error
      if (!err) err = response.result;
      console.log("Was there  problem officer", err);
      // Call callback immediately
      return callback && callback(err);
    }
  }.bind(this));
}

BluetoothController.prototype.getAddress = function(callback) {
  this.messenger.getAddress(function(err, response) {
    callback && callback(err, response.address);
  });
}

BluetoothController.prototype.whitelistAppend = function(address, callback) {
  this.messenger.whitelistAppend(address, callback);
}

BluetoothController.prototype.clearWhitelist = function(callback) {
  this.messenger.clearWhitelist(callback);
}
BluetoothController.prototype.connectSelective = function(callback) {
  this.messenger.connectSelective(callback);
}

BluetoothController.prototype.updateRssi = function(peripheral, callback) {
  this.messenger.updateRssi(peripheral, function(err, rssi) {
    if (!err) {
      setImmediate(function() {
        this.emit('rssiUpdate', rssi);
        peripheral.emit('rssiUpdate', rssi);
      }.bind(this));
    }
    callback && callback(err, rssi);
  }.bind(this));
}

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