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
function connect(hardware, next) {
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

  this.messenger.on('connected', this.onConnected.bind(this));
  this.messenger.on('advertiseStarted', this.onAdvertiseStarted.bind(this));
  this.messenger.on('valueRead', this.onValueRead.bind(this));
  this.messenger.on('valueWritten', this.onValueWritten.bind(this));
  this.messenger.on('scanStart', this.onScanStart.bind(this));
  this.messenger.on('scanStop', this.onScanStop.bind(this));
  this.messenger.on('discover', this.onDiscover.bind(this));


  this.messenger.verifyCommunication(next);
}

util.inherits(BluetoothController, events.EventEmitter);

/**********************************************************
 Event Handlers
**********************************************************/

BluetoothController.prototype.onConnected = function(err) {
  if (!err) {
    this.connected = true;
  }

  this.emit('connected', err);
}

BluetoothController.prototype.onAdvertiseStarted = function(err, response) {
  this.isAdvertising = true;
  this.emit('advertising', err, response.result);
}

BluetoothController.prototype.onDiscover = function(peripheralData) {
  // var peripheral = this._peripherals[peripheral.sender];

  // if (!peripheral) {
    peripheral = new Peripheral(peripheralData.rssi, 
                peripheralData.data,
                peripheralData.sender,
                peripheralData.address_type,
                peripheralData.packet_type);
    // this._peripherals[peripheral.address] = peripheral;
  // }

  this.emit('discover', peripheral);
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


// BluetoothController.prototype.connectToPeripheral = function(address, address_type, conn_interval_min, conn_interval_max, timeout, latency, next) {
//   this.messenger.execute(bgLib.api.gapConnectDirect, [address, address_type, conn_interval_min, conn_interval_max, timeout, latency], next);
// }

// BluetoothController.prototype.disconnectFromPeripheral = function(handle, next) {
//   this.messenger.execute(bgLib.api.connectionDisconnect, [handle], next);
// }

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
BluetoothController.prototype.startScanning = function(next) {
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
module.exports.connect = connect;
module.exports.BluetoothController = BluetoothController;
module.exports.Events = Events;