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

Service.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type,
    // includedServiceUuids: this.includedServiceUuids
  });
};

// TODO: Implement this
Service.prototype.discoverIncludedServices = function(serviceUuids, callback) {
  // if (callback) {
  //   this.once('includedServicesDiscover', function(includedServiceUuids) {
  //     callback(null, includedServiceUuids);
  //   });
  // }

  // this._noble.discoverIncludedServices(
  //   this._peripheralUuid,
  //   this.uuid,
  //   serviceUuids
  // );
};
Service.prototype.discoverCharacteristics = function(characteristicUuids, callback) {
  this._peripheral._controller.discoverCharacteristicsOfService(this, characteristicUuids, callback);
};

Service.prototype.discoverAllCharacteristics = function(callback) {
  this._peripheral._controller.discoverAllCharacteristicsOfService(this, callback);
};

module.exports = Service;
