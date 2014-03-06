var EventEmitter = require('events').EventEmitter;
var util = require('util');

function Peripheral(controller, rssi, data, address) {
  this.rssi = rssi;
  this.services = {};
  this.advertisingData = data;
  this.address = address;
  this.connection = null;
  this.flags = null;

  // Characteristics discovered. Handles are keys
  this.characteristics = {};

  this._controller = controller;
  this._unassignedCharacteristics = [];
  this._unassignedDescriptors = [];
}

util.inherits(Peripheral, EventEmitter);

Peripheral.prototype.toString = function() {
  return JSON.stringify({
    address: this.address.toString(),
    services: this.services,
    rssi: this.rssi
  });
};

Peripheral.prototype.connect = function(callback) {
  this._controller.connect(this, callback);
};

Peripheral.prototype.disconnect = function(callback) {
  this._controller.disconnect(this, callback);
};

Peripheral.prototype.discoverServices = function(services, callback) {
  this._controller.discoverServices(this, services, callback);
};

Peripheral.prototype.discoverAllServices = function(callback) {
  this._controller.discoverAllServices(this, callback);
};

/*
* When we make a new service, we should add it to our peripheral and
* find any unmatched characteristics that belong to it (if the user called
* discoverCharacteristics before finding services, for example)
*/
Peripheral.prototype.syncService = function(service, callback) {
  // Save the service to the services object
  this.services[service.uuid.toString()] = service;
  // Iterate through unassigned characteristics
  newUnassigned = [];

  for (var i in this._unassignedCharacteristics) {
    // Grab the characteristic
    var characteristic = this._unassignedCharacteristics[i];
    // If the handle falls in range of this service
    if (characteristic.handle >= service._startHandle && characteristic.handle <= service._endHandle) {

      // Add it to the service
      service.characteristics[characteristic.uuid.toString()] = characteristic;

      // Emit the characteristic from service when it's matched
      setImmediate(function() {
        service.emit('characteristicDiscover', characteristic);
      });
    }
    else {
      // Add it to the list of characteristics to put back
      newUnassigned.push(characteristic);
    }
  }

  // Re-assign unmatched characteristics
  this._unassignedCharacteristics = newUnassigned;

  callback && callback();
}

// Note that this won't sort correctly until beta/189 is fixed...
Peripheral.prototype.sortServices = function(callback) {
  var sortable = [];

  for (var service in this.services) {
    sortable.push(this.services[service]);
  }

  sortable.sort(function(a, b) {return a._startHandle - b._startHandle});

  callback && callback(sortable);

  return sortable;
}

Peripheral.prototype.discoverCharacteristics = function(characteristics, callback) {
  this._controller.discoverCharacteristics(this, characteristics, callback);
};

Peripheral.prototype.discoverAllCharacteristics = function(callback) {
  this._controller.discoverAllCharacteristics(this, callback);
};

/*
* When characteristics are found after services, they need to be matched up
* to the appropriate service
*/
Peripheral.prototype.syncCharacteristic = function(characteristic, callback) {

  this.characteristics[characteristic.handle] = characteristic;

  // Sort the services to speed things up a bit
  this.sortServices(function(sortedServices) {
    // Iterate through the services
    for (var i = 0; i < sortedServices.length; i++) {
      // Grab each service
      var service = sortedServices[i];
      // If this characteristic handle falls in the range of the start and end handle
      if (characteristic.handle >= service._startHandle && characteristic.handle <= service._endHandle) {
        // Assign this characteristic to this service
        service.characteristics[characteristic.uuid.toString()] = characteristic;

        return;
      }
    }
    // If there is no match for this characteristic, leave it unassigned
    this._unassignedCharacteristics.push(characteristic);

    return;
  }.bind(this));
}

Peripheral.prototype.discoverAllAttributes = function(callback) {
  this._controller.discoverAllAttributes(this, callback);
}

Peripheral.prototype.discoverAllServicesAndCharacteristics = function(callback) {
  this._controller.discoverAllServicesAndCharacteristics(this, callback);
}

Peripheral.prototype.discoverAllDescriptors = function(callback) {
  this._controller.discoverAllDescriptors(this, callback);
}

// Peripheral.prototype.readRemoteHandle = function(handle, callback) {
//   if (callback) {
//     this.once('handleRead' + handle, function(data) {
//       callback(null, data);
//     });
//   }

//   // TODO: Should use events...
//   this._controller.readRemoteHandle(this, this.uuid, callback);
// };

// Peripheral.prototype.writeRemoteHandle = function(handle, data, withoutResponse, callback) {
//   if (!(data instanceof Buffer)) {
//     throw new Error('data must be a Buffer');
//   }

//   if (callback) {
//     this.once('handleWrite' + handle, function() {
//       callback(null);
//     });
//   }

//   this._controller.writeHandle(this.uuid, handle, data, withoutResponse);
// };
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
module.exports = Peripheral;
