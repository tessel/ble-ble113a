var events = require('events');
var util = require('util');

var characteristics = require('./characteristics.json');

function Characteristic(peripheral, uuid, handle, value) {
  this._peripheral = peripheral;

  this.uuid = uuid;
  this.handle = handle;
  // this.properties = properties;
  this.descriptors = null;
  this.name = null;
  this.type = null;
  this.lastReadValue = value;

  var characteristic = characteristics[uuid];
  if (characteristic) {
    this.name = characteristic.name;
    this.type = characteristic.type;
  }
}

util.inherits(Characteristic, events.EventEmitter);

Characteristic.prototype.toString = function() {
  return JSON.stringify({
    uuid: this.uuid,
    name: this.name,
    type: this.type,
    handle : this.handle,
  });
};

Characteristic.prototype.read = function(callback) {
  // if (callback) {
  //   this.once('read', function(data) {
  //     callback(null, data);
  //   });
  // }

  // this._noble.read(
  //   this._peripheralUuid,
  //   this._serviceUuid,
  //   this.uuid
  // );
};

Characteristic.prototype.write = function(data, withoutResponse, callback) {
  // if (!(data instanceof Buffer)) {
  //   throw new Error('data must be a Buffer');
  // }

  // if (callback) {
  //   this.once('write', function() {
  //     callback(null);
  //   });
  // }

  // this._noble.write(
  //   this._peripheralUuid,
  //   this._serviceUuid,
  //   this.uuid,
  //   data,
  //   withoutResponse
  // );
};

Characteristic.prototype.broadcast = function(broadcast, callback) {
  // if (callback) {
  //   this.once('broadcast', function() {
  //     callback(null);
  //   });
  // }

  // this._noble.broadcast(
  //   this._peripheralUuid,
  //   this._serviceUuid,
  //   this.uuid,
  //   broadcast
  // );
};

Characteristic.prototype.notify = function(notify, callback) {
  // if (callback) {
  //   this.once('notify', function() {
  //     callback(null);
  //   });
  // }

  // this._noble.notify(
  //   this._peripheralUuid,
  //   this._serviceUuid,
  //   this.uuid,
  //   notify
  // );
};

Characteristic.prototype.discoverDescriptors = function(callback) {
  // if (callback) {
  //   this.once('descriptorsDiscover', function(descriptors) {
  //     callback(null, descriptors);
  //   });
  // }

  // this._noble.discoverDescriptors(
  //   this._peripheralUuid,
  //   this._serviceUuid,
  //   this.uuid
  // );
};

// /*************************************************************
// Function:    subscribe (Central Role)
// Description:   Begin receiving notifications when there are new values
//        for a given characteristic
// Params:    characteristic - the characteristic to listen to. 
//        callback - A callback that should expect to receive
//        an array of available devices.
// *************************************************************/
// Characteristic.prototype.subscribe = function(characteristic, callback) {

// }
// /*************************************************************
// Function:    unsubscribe (Central Role)
// Description:   Start receiving notifications when there are new values
//        for a given characteristic
// Params:    characteristic - the characteristic to stop listening to. 
//        callback - A callback that should expect to receive
//        an array of available devices.
// *************************************************************/
// Characteristic.prototype.unsubscribe = function(characteristic, callback) {

// }

module.exports = Characteristic;
