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
  this.writeToConfigDescriptor(new Buffer([0x01, 0x00]), function(err) {
    callback && callback(err);
  });
}

Characteristic.prototype.stopNotifications = function(callback) {
  this.stopRemoteUpdates(callback);
}

Characteristic.prototype.startIndications = function(callback) {
  this.writeToConfigDescriptor(new Buffer([0x02, 0x00]), function(err) {
    callback && callback(err);
  });
}

Characteristic.prototype.stopIndications = function(callback) {
  this.stopRemoteUpdates(callback);
}

Characteristic.prototype.stopRemoteUpdates = function(callback) {
  this.writeToConfigDescriptor(new Buffer([0x00, 0x00]), function(err) {
    callback && callback(err);
  });
}

Characteristic.prototype.writeToConfigDescriptor = function(value, callback) {
  // Check if we've already fetched the config descriptor
  this.retrieveConfigDescriptor(function(err, descriptor) {
    if (err) {
      return callback && callback(err);
    }
    else {
      if (!descriptor) {
        return callback && callback(new Error("Characteristic is not configured for notifications"));
      }
      else {
        descriptor.write(value, function(err, written) {
          return callback && callback(err);
        });
      }
    }
  });
}
Characteristic.prototype.retrieveConfigDescriptor = function(callback) {
  // Check if we've already fetched the config descriptor
  this.getConfigDescriptorFromFetched(function(descriptor) {
    // If we haven't
    if (!descriptor) {
      // Discover all descriptors
      this.discoverAllDescriptors(function(err, descriptors) {
        if (err) {
          return callback && callback(err);
        }
        else {
          // Now check again for the config descriptor
          this.getConfigDescriptorFromFetched(function(descriptor) {
            // If there is no descriptor, you can't get notifications from this char
            if (!descriptor) {
              return callback && callback();
            }
            else {
              return callback && callback(null, descriptor);
            }
          }.bind(this));
        }
      }.bind(this));
    }
    else {
      return callback && callback(null, descriptor);
    }
  }.bind(this));
}

Characteristic.prototype.getConfigDescriptorFromFetched = function(callback) {
  for (var d in this.descriptors) {
    if (this.descriptors[d].uuid.toString() == "2902") {
      return callback && callback(this.descriptors[d]);
    }
  }
  callback && callback();
}
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

Characteristic.prototype.discoverAllDescriptors = function(callback) {
  this._peripheral._controller.discoverDescriptorsOfCharacteristic(this, callback)
};
// }

module.exports = Characteristic;
