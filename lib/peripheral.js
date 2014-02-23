var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Peripheral(controller, rssi, data, address, addressType, packetType) {
  this._controller = controller;
  this.rssi = rssi;
  this.services = {};
  this.characteristics = {};
  this.advertisingData = data;
  this.address = address;
  this.connection = null;
  this.flags = null;
}

util.inherits(Peripheral, EventEmitter);

Peripheral.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    address: this.address,
    // advertisement: this.advertisement,
    rssi: this.rssi
  });
};

Peripheral.prototype.connect = function(callback) {
  if (callback) {
    this.once('connect', function(error) {
      callback(error);
    });
  }

  this._controller.connect(this);
};

Peripheral.prototype.disconnect = function(callback) {
  if (callback) {
    this.once('disconnect', function() {
      callback(null);
    });
  }

  this._controller.disconnect(this);
};

// /*************************************************************
// Function:    getSignalStrength (Central Role)
// Description:   Get the signal strength (0.0-1.0) of a peripheral
// Params:    peripheral - the device to get the signal strength of.    
//        callback - A callback that should expect to receive
//        an array of available devices.
// *************************************************************/
Peripheral.prototype.updateRssi = function(callback) {
  if (callback) {
    this.once('rssiUpdate', function(rssi) {
      callback(null, rssi);
    });
  }

  this._controller.updateRssi(this);
};

Peripheral.prototype.discoverServices = function(services, callback) {

};

Peripheral.prototype.discoverAllServices = function(callback) {
  if (callback) {
    this.once('servicesDiscovered', function(services) {
      callback(null, services);
    });
  }

  this._controller.discoverAllServices(this, function (err) {
    if (err) {
      callback && callback(err, null);
    }
  });
};

Peripheral.prototype.discoverAllServicesAndCharacteristics = function(serviceUuids, characteristicsUuids, callback) {
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

Peripheral.prototype.discoverAllCharacteristics = function(callback) {
  this._controller.discoverAllCharacteristics(this, callback);
};

Peripheral.prototype.readRemoteHandle = function(handle, callback) {
  if (callback) {
    this.once('handleRead' + handle, function(data) {
      callback(null, data);
    });
  }

  // TODO: Should use events...
  this._controller.readRemoteHandle(this, this.uuid, callback);
};

Peripheral.prototype.writeRemoteHandle = function(handle, data, withoutResponse, callback) {
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