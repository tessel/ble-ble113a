var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Peripheral(rssi, data, address, addressType, packetType) {
  this.rssi = rssi;
  this.services = [];
  this.characteristics = [];
  this.advertisingData = data;
  this.address = address;
  this.addressType = type;
  this.packetType = packetType; 
}

util.inherits(Peripheral, EventEmitter);

Peripheral.prototype.toString = function() {
  // return JSON.stringify({
  //   uuid: this.uuid,
  //   // advertisement: this.advertisement,
  //   rssi: this.rssi
  // });
};

Peripheral.prototype.connect = function(callback) {
  // if (callback) {
  //   this.once('connect', function(error) {
  //     callback(error);
  //   });
  // }

  // this._controller.connect(this.uuid);
};

Peripheral.prototype.disconnect = function(callback) {
  // if (callback) {
  //   this.once('disconnect', function() {
  //     callback(null);
  //   });
  // }

  // this._controller.disconnect(this.uuid);
};

// /*************************************************************
// Function:    getSignalStrength (Central Role)
// Description:   Get the signal strength (0.0-1.0) of a peripheral
// Params:    peripheral - the device to get the signal strength of.    
//        next - A callback that should expect to receive
//        an array of available devices.
// *************************************************************/
Peripheral.prototype.getSignalStrength = function(callback) {
  // if (callback) {
  //   this.once('rssiUpdate', function(rssi) {
  //     callback(null, rssi);
  //   });
  // }

  // this._controller.updateRssi(this.uuid);
};

Peripheral.prototype.discoverServices = function(uuids, callback) {
  // if (callback) {
  //   this.once('servicesDiscover', function(services) {
  //     callback(null, services);
  //   });
  // }

  // this._controller.discoverServices(this.uuid, uuids);
};

Peripheral.prototype.discoverSomeServicesAndCharacteristics = function(serviceUuids, characteristicsUuids, callback) {
  // this.discoverServices(serviceUuids, function(err, services) {
  //   var numDiscovered = 0;
  //   var allCharacteristics = [];

  //   for (var i in services) {
  //     var service = services[i];

  //     service.discoverCharacteristics(characteristicsUuids, function(error, characteristics) {
  //       numDiscovered++;

  //       if (error === null) {
  //         for (var j in characteristics) {
  //           var characteristic = characteristics[j];

  //           allCharacteristics.push(characteristic);
  //         }
  //       }

  //       if (numDiscovered === services.length) {
  //         if (callback) {
  //           callback(null, services, allCharacteristics);
  //         }
  //       }
  //     }.bind(this));
  //   }
  // }.bind(this));
};

Peripheral.prototype.discoverAllServicesAndCharacteristics = function(callback) {
  // this.discoverSomeServicesAndCharacteristics([], [], callback);
};

Peripheral.prototype.readHandle = function(handle, callback) {
  // if (callback) {
  //   this.once('handleRead' + handle, function(data) {
  //     callback(null, data);
  //   });
  // }

  // this._controller.readHandle(this.uuid, handle);
};

Peripheral.prototype.writeHandle = function(handle, data, withoutResponse, callback) {
//   if (!(data instanceof Buffer)) {
//     throw new Error('data must be a Buffer');
//   }
  
//   if (callback) {
//     this.once('handleWrite' + handle, function() {
//       callback(null);
//     });
//   }

//   this._controller.writeHandle(this.uuid, handle, data, withoutResponse);
};

module.exports = Peripheral;