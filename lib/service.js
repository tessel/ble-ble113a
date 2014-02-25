var events = require('events');
var util = require('util');

var services = require('./services.json');

function Service(controller, peripheral, uuid, startHandle, endHandle) {
  this._controller = controller;
  this._peripheral = peripheral;
  this._startHandle = startHandle;
  this._endHandle = endHandle;

  this.uuid = uuid;
  this.name = null;
  this.type = null;
  this.includedServiceUuids = null;
  this.characteristics = {};


  // TODO: This doesn't seem to work yet.

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
    peripheral_connection: this._peripheral.connection,
    name: this.name,
    type: this.type,
    // includedServiceUuids: this.includedServiceUuids
  });
};

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
  // if (callback) {
  //   this.once('characteristicsDiscover', function(characteristics) {
  //     callback(null, characteristics);
  //   });
  // }

  // this._noble.discoverCharacteristics(
  //   this._peripheralUuid,
  //   this.uuid,
  //   characteristicUuids
  // );
};

module.exports = Service;
