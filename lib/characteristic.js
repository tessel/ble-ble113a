var events = require('events');
var util = require('util');
var characteristics = require('./characteristics.json');

function Characteristic(peripheral, uuid, handle, value) {
  this._peripheral = peripheral;

  this.uuid = uuid;
  this.handle = handle;
  this.descriptors = {};
  this.name = null;
  this.type = null;
  this.value = value;

  if (uuid) {
    this.setUUID(uuid);
  }
}

util.inherits(Characteristic, events.EventEmitter);

Characteristic.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type,
    handle : this.handle,
    value : this.value,
  });
}

Characteristic.prototype.setUUID = function(uuid) {
  this.uuid = uuid;

  var characteristic = characteristics[uuid.toString()];
  if (characteristic) {
    this.name = characteristic.name;
    this.type = characteristic.type;
  }
}

Characteristic.prototype.read = function(callback) {
  this._peripheral._controller.read(this, callback);
};

Characteristic.prototype.write = function(data, callback) {
 this._peripheral._controller.write(this, data, callback);
};

Characteristic.prototype.startNotifications = function(callback) {
  this._peripheral._controller.startNotifications(this, callback);
}

Characteristic.prototype.stopNotifications = function(callback) {
  this._peripheral._controller.stopNotifications(this, callback);
}

Characteristic.prototype.startIndications = function(callback) {
  this._peripheral._controller.startNotifications(this, callback);
}

Characteristic.prototype.stopIndications = function(callback) {
  this._peripheral._controller.stopIndications(this, callback);
}

Characteristic.prototype.confirmIndication = function(callback) {
  this._peripheral._controller.confirmIndication(this, callback);
}
Characteristic.prototype.discoverAllDescriptors = function(callback) {
  this._peripheral._controller.discoverDescriptorsOfCharacteristic(this, callback);
};
// }

module.exports = Characteristic;
