var events = require('events');
var util = require('util');

var descriptors = require('./descriptors.json');

function Descriptor(peripheral, uuid, handle) {
  this._peripheral = peripheral;
  this.uuid = uuid;
  this.handle = handle;
  this.name = null;
  this.type = null;

  var descriptor = descriptors[uuid];
  if (descriptor) {
    this.name = descriptor.name;
    this.type = descriptor.type;
  }
}

util.inherits(Descriptor, events.EventEmitter);

Descriptor.isStandardDescriptor = function(uuid) {
  return (descriptors[uuid] ? true : false);
}

Descriptor.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type
  });
};

Descriptor.prototype.readValue = function(callback) {

};

Descriptor.prototype.writeValue = function(data, callback) {
  
};

module.exports = Descriptor;
