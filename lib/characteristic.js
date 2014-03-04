var events = require('events');
var util = require('util');
var UUID = require('./uuid');
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
    uuid: this.uuid.toString(),
    name: this.name,
    type: this.type,
    handle : this.handle,
  });
};

Characteristic.prototype.read = function(callback) {
  this._peripheral._controller.read(this, callback);
};

Characteristic.prototype.write = function(data, callback) {
 this._peripheral._controller.write(this, data, callback);
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
