var events = require('events');
var util = require('util');

var services = require('./services.json');

function Service(peripheral, uuid, startHandle, endHandle) {
  this._peripheral = peripheral;
  this._startHandle = startHandle;
  this._endHandle = endHandle;

  this.uuid = uuid;
  this.name = null;
  this.type = null;
  this.includedServiceUuids = null;
  this.characteristics = {};

  var service = services[uuid];
  if (service) {
    this.name = service.name;
    this.type = service.type;
  }
}

util.inherits(Service, events.EventEmitter);

Service.isStandardService = function(uuid) {
  return (services[uuid] ? true : false);
}
Service.prototype.toString = function() {
  var str = JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type,
    startHandle : this._startHandle,
    endHandle : this._endHandle,
    // includedServiceUuids: this.includedServiceUuids
  });
  console.log('service.js stringify:',str);
  return str;
};

// TODO: Implement this
Service.prototype.discoverIncludedServices = function(callback) {
  this._peripheral._controller.discoverIncludedServices(this, callback);
};
Service.prototype.discoverCharacteristics = function(characteristicUuids, callback) {
  this._peripheral._controller.discoverCharacteristicsOfService(this, characteristicUuids, callback);
};

Service.prototype.discoverAllCharacteristics = function(callback) {
  this._peripheral._controller.discoverAllCharacteristicsOfService(this, callback);
};

module.exports = Service;
