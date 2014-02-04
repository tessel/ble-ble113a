var Peripheral = require('./lib/peripheral');
var Characteristic = require('./lib/characteristic');
var Service = require('./lib/service');
var Messenger = require('./lib/messenger');
var events = require('events');
var util = require('util');

var DEBUG = 0;

var TX_HANDLE=20;

var characteristicHandles = [21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65];

/*************************************************************
Function:     connect
Description:  Set the module port of the Bluetooth module
        so the Tessel can begin communicating.
Params:     hardware - the module port ble was plugged in to
        next - a callback for what happens after connecting
*************************************************************/
function init(hardware, next) {
  var controller = new BluetoothController(hardware, next);

  return controller;
}

/*************************************************************
Function:     BluetoothController
Description:  Instantiate a Bluetooth Controller object. Controls
        all BLE Central and Peripheral methods (depending)
        on role.
Params:     hardware - the module port ble was plugged in to
*************************************************************/
function BluetoothController(hardware, next) {
  this.hardware = hardware;
  this.isAdvertising = false;
  this.messenger = new Messenger(hardware);
  this.connected;
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


  this.messenger.verifyCommunication(next);
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
  if (peripheral) {
    peripheral.connection = status.connection;
    peripheral.flags = status.flags;
    peripheral.connInterval = status.conn_interval;
    peripheral.timeout = status.timeout;
    peripheral.latenct = status.latency;
    peripheral.bonding = status.bonding;
  }

  if (peripheral.flags & (1 << 2)) {
    peripheral.emit('connected');
    this.emit('connected', peripheral);
  }

}


// BluetoothController.prototype.findInformation = function(connection, start, end, next) {
//   this.messenger.execute(bgLib.api.attClientFindInformation, [connection, start, end], next);
// }

// BluetoothController.prototype.readRemoteHandle = function(connection, handle, next) {
//   this.messenger.execute(bgLib.api.attClientReadByHandle, [connection, handle], next);
// }

// BluetoothController.prototype.setAdvertisementData = function(data, next) {
//   var length = data.length;

//   var arr = [];
//   arr.push(length);
//   arr.push(0x09); // Flag for a name
//   if (typeof data == "string") {
//     for (var i = 0; i < data.length; i++) {
//       arr.push(data.charCodeAt(i));
//     }
//   }
//   else if (Array.isArray(data)) {
//     arr = arr.concat(data);
//   };

//   console.log("Setting data: ", arr);

//   this.messenger.execute(bgLib.api.gapSetAdvData, [1, data], next);
// }

/**********************************************************
 Bluetooth API
**********************************************************/
BluetoothController.prototype.startScanning = function(allowDuplicates, next) {
  this._discoveredPeripheralsAddresses = [];
  this._allowDuplicates = allowDuplicates;
  this.messenger.startScanning(next);
}
BluetoothController.prototype.stopScanning = function(next) {
  this.messenger.stopScanning(next);
}

BluetoothController.prototype.startAdvertising = function(next) {
  this.advertising = true;
  this.messenger.startAdvertising(next);
}

BluetoothController.prototype.readValue = function(index, next) {
  this.messenger.readValue(characteristicHandles[index], next);
}

BluetoothController.prototype.writeValue = function(index, value, next) {
  this.messenger.writeValue(characteristicHandles[index], value, next);
}

BluetoothController.prototype.connect = function(peripheral, next) {
  this.messenger.connect(peripheral.address, peripheral.addressType, next);
}

BluetoothController.prototype.disconnect = function(peripheral, next) {
  this.messenger.disconnect(peripheral.connection, next);
}


// /*************************************************************
// Function:    connectPeripheral (Central Role)
// Description:   Establish a connection with a peripheral
// Params:    peripheral - the Peripheral to connect to
//        next - A callback that should expect to receive
//        an array of available devices.
// *************************************************************/
// BluetoothController.prototype.connectPeripheral = function(peripheral, next) {
    

// }

// /*************************************************************
// Function:    disconnectPeripheral (Central Role)
// Description:   End a connection with a peripheral
// Params:    peripheral - the Peripheral to connect to
//        next - A callback that should expect to receive
//        an array of available devices.
// *************************************************************/
// BluetoothController.prototype.disconnectPeripheral = function(peripheral, next) {
    

// }

// /*************************************************************
// Function:    getSignalStrength (Central Role)
// Description:   Get the signal strength (0.0-1.0) of a peripheral
// Params:    peripheral - the device to get the signal strength of.    
//        next - A callback that should expect to receive
//        an array of available devices.
// *************************************************************/
// BluetoothController.prototype.getSignalStrength = function(peripheral, next) {

// }





/*************************************************************
PUBLIC API
*************************************************************/
module.exports.init = init;
module.exports.BluetoothController = BluetoothController;
module.exports.Events = Events;