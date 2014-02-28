var Peripheral = require('./lib/peripheral');
var Characteristic = require('./lib/characteristic');
var Service = require('./lib/service');
var Messenger = require('./lib/messenger');
var events = require('events');
var util = require('util');

var TX_HANDLE=20;

var characteristicHandles = [21, 25, 29, 33, 37, 41, 45, 49, 53, 57, 61, 65];

/*************************************************************
Function:     connect
Description:  Set the module port of the Bluetooth module
        so the Tessel can begin communicating.
Params:     hardware - the module port ble was plugged in to
        callback - a callback for what happens after connecting
*************************************************************/
function use(hardware, callback) {
  var controller = new BluetoothController(hardware, callback);

  return controller;
}

/*************************************************************
Function:     BluetoothController
Description:  Instantiate a Bluetooth Controller object. Controls
        all BLE Central and Peripheral methods (depending)
        on role.
Params:     hardware - the module port ble was plugged in to
*************************************************************/
function BluetoothController(hardware, callback) {
  this.hardware = hardware;
  this.isAdvertising = false;
  this.messenger = new Messenger(hardware, name);
  this._connectedPeripherals = {};
  this._discoveredPeripherals = {};

  this.messenger.on('scanStart', this.onScanStart.bind(this));
  this.messenger.on('scanStop', this.onScanStop.bind(this));
  this.messenger.on('discover', this.onDiscover.bind(this));
  this.messenger.on('connectionStatus', this.onConnectionStatus.bind(this));
  this.messenger.on('disconnect', this.onDisconnect.bind(this));
  this.messenger.on('groupFound', this.onGroupFound.bind(this));
  this.messenger.on('completedProcedure', this.onCompletedProcedure.bind(this));
  this.messenger.on('findInformationFound', this.onFindInformationFound.bind(this));

  // Once the messenger says we're ready, call callback and emit event
  this.messenger.once('ready', this.bootSequence.bind(this, callback));

  // If there was an error, let us know
  this.messenger.once('error', this.bootSequence.bind(this, callback));
}

util.inherits(BluetoothController, events.EventEmitter);

BluetoothController.prototype.bootSequence = function(callback, err) {

// Tell any ble listeners
  if (!err) {
    setImmediate(function() {
      this.emit('ready');
    }.bind(this));
  }
  else {
    // Emit the error
    setImmediate(function() {
      this.emit('error', err);
    }.bind(this));
  }

  this.messenger.removeAllListeners('error');
  this.messenger.removeAllListeners('ready');

  // Call the callback
  callback && callback(err);
}

BluetoothController.prototype.reset = function(callback) {
  this.messenger.reset(callback);
}
/**********************************************************
 Event Handlers
**********************************************************/
BluetoothController.prototype.onScanStart = function(err, result) {
  this.emit('scanStart', err, result);
}

BluetoothController.prototype.onScanStop = function(err, result) {
  this.emit('scanStop', err, result);
}

BluetoothController.prototype.onDiscover = function(peripheralData) {
  // Try to grab this peripheral from list of previously discovered peripherals
  this.getPeripheralFromData(peripheralData.rssi, peripheralData.data, peripheralData.sender, function(peripheral, undiscovered) {
  // If this peripheral hasn't been discovered or we allow duplicates
  if (undiscovered || (this._allowDuplicates)) {
      setImmediate(function() {
        this.emit('discover', peripheral);
      }.bind(this));
    }
  }.bind(this));
}

BluetoothController.prototype.onConnectionStatus = function(status) {

  this.getPeripheralFromData(null, null, status.address, function(peripheral, undiscovered) {
    peripheral.connection = status.connection;
    peripheral.flags = status.flags;

    this._connectedPeripherals[peripheral.connection] = peripheral;

    // If this new connection was just made
    // Let any listeners know
    if (peripheral.flags & (1 << 2)) {
      this.emit('startConnection' + peripheral.address, peripheral);
    }
  }.bind(this));
}

BluetoothController.prototype.onDisconnect = function(response) {
  // TODO: Get corresponding peripheral somehow, set connected property to false
  this.emit('endConnection' + response.connection, response.reason);
}

/* 
 Called when services or groups found
*/
BluetoothController.prototype.onGroupFound = function(group) {
  this.emit('groupFound', group);
}
/* 
 Called when discovery operation completed
*/
BluetoothController.prototype.onCompletedProcedure = function(procedure) {
  this.emit('completedProcedure', procedure);
}

/*
 Called when characteristic discovery is complete
 */
BluetoothController.prototype.onFindInformationFound = function(info) {
  this.emit('findInformationFound', info);
}


/**********************************************************
 Bluetooth API
**********************************************************/
BluetoothController.prototype.startScanning = function(allowDuplicates, callback) {

  // If the user just passed in a function, make allow duplicates a null
  if (typeof allowDuplicates == "function") {
    callback = allowDuplicates;
    allowDuplicates = null;
  }

  // Set duplicate rule
  this._allowDuplicates = allowDuplicates;

  // Reset discovered peripherals
  this._discoveredPeripherals = {};

  // Start scanning
  this.messenger.startScanning(this.manageRequestResult.bind(this, 'scanStart', callback));
}
BluetoothController.prototype.stopScanning = function(callback) {
  this.messenger.stopScanning(this.manageRequestResult.bind(this, 'scanStop', callback));
}

BluetoothController.prototype.manageRequestResult = function(event, callback, err, response) {
   // If there wasn't error with comms but with ble113 logic
  if (!err && response.result) {
    // Set result as error
    err = response.result;
  } 
  // If there wasn't an error
  if (!err) {
    // Emit the event
    setImmediate(function() {
      this.emit(event);
    }.bind(this));
  }
  else {
    setImmediate(function() {
      this.emit('error', err);
    }.bind(this));
  }

  // Call the callback
  callback && callback(err);
}

BluetoothController.prototype.filterDiscover = function(filter, callback) {

  // Cancel the previous discover event
  this.messenger.removeAllListeners('discover');

  // When we discover a peripheral, have our filter matcher test it
  this.messenger.on('discover', this.filterMatcher.bind(this, filter, callback));
}

BluetoothController.prototype.stopFilterDiscover = function(callback) {

  // Remove our discover listener
  this.messenger.removeAllListeners('discover');

  // Make the normal discover listener the default
  this.messenger.on('discover', this.onDiscover.bind(this));

  callback && callback();
}

BluetoothController.prototype.filterMatcher = function(filter, callback, peripheralData) {
  // Get saved for peripheral or make a new one
  this.getPeripheralFromData(peripheralData.rssi, peripheralData.data, peripheralData.sender, function(peripheral, undiscovered) {
    // Apply the filter to the peripheral
    filter(peripheral, function(match) {
      // If we've got a match and it's undiscovered (or if it's old and we allow duplicated)
      if (match && (undiscovered || this._allowDuplicates)) {

        // Call the callback
        callback && callback(null, peripheral);

        // Emit the event
        setImmediate(function() {
          this.emit('discover', peripheral);
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
}

BluetoothController.prototype.getPeripheralFromData = function(rssi, data, address, callback) {

  var strAddr = this.addressBufferToString(address);

  // Try to grab this peripheral from list of previously discovered peripherals
  var peripheral = this._discoveredPeripherals[strAddr];

  // If it hasn't been discovered yet
  if (!peripheral) {
    // Make a peripheral object from the data
    peripheral = new Peripheral(
                this,
                rssi, 
                data,
                strAddr);

    // Put it in our discovered data structure
    this._discoveredPeripherals[strAddr] = peripheral;

    callback && callback(peripheral, true);
  } 
  else {
    callback && callback(peripheral, false);
  }  
}

BluetoothController.prototype.connect = function(peripheral, callback) {
  var bufferAddress = this.addressStringToBuffer(peripheral.address);
  this.messenger.connect(bufferAddress, peripheral.addressType, function(err, response) {
    if (!err && response.result) {
      // Set result as error
      err = response.result;
    } 
    // If there was an error
    if (err) {
      // Call the callback
      return callback && callback(err);
    } 
    
    // If there wasn't
    else {
      // Wait for a connection Update
      this.once('startConnection' + peripheral.address.toString(), function() {
        // Call the callback
        callback && callback();

        setImmediate(function() {
          // Let any listeners know
          this.emit('connect', peripheral);
          peripheral.emit('connect');
        }.bind(this));

      }.bind(this));
    }
  }.bind(this));
}

BluetoothController.prototype.disconnect = function(peripheral, callback) {
  this.messenger.disconnect(peripheral.connection, function(err, response) {
    if (!err && response.result) {
      // Set result as error
      err = response.result;
    } 
    // If there was an error
    if (err) {
      // Call the callback
      return callback && callback(err);
    } 
    else {
      // Wait for a connection Update
      this.once('endConnection' + peripheral.connection.toString(), 
        function(connection, reason) {
        // Call the callback
        callback && callback();

        setImmediate(function() {
          // Let any listeners know
          this.emit('disconnect', peripheral, reason);
          peripheral.emit('disconnect', reason);
        }.bind(this));

      }.bind(this));
    }
  }.bind(this));
}

BluetoothController.prototype.discoverAllServicesAndCharacteristics = function(peripheral, callback) {
  this.discoverAllServices(peripheral, function(err, services) {
    if (err) {
      callback && callback(err);
    }
    else {
      this.discoverAllCharacteristics(peripheral, function(err, characteristics) {
        if (err) {
          callback && callback(err);
        }
        else {
          callback && callback(err, {services : services, characteristics : characteristics});
        }
      }.bind(this));
    }
  }.bind(this));
}
BluetoothController.prototype.discoverAllServices = function(peripheral, callback)
{
  this.discoverServices(peripheral, [], callback);
}

BluetoothController.prototype.discoverServices = function(peripheral, filter, callback)
{

  // Discover the services of this device
  this.serviceDiscovery(peripheral, function(err, allServices) {
    this.attributeDiscoveryHandler(err, filter, allServices, function(err, services) {

      // Set flag that we've received all services
      peripheral._allServicesCached = true;

      // Return the values
      callback && callback(err, services);

      if (!err && services.length) {
        // Set the events to be emitted.
        setImmediate(function() {
          this.emit('servicesDiscover', services);
          peripheral.emit('servicesDiscover', services);
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
}

// TODO: Implement this function
BluetoothController.prototype.discoverIncludedServices = function(peripheral, serviceUUID) {

  this.on('groupFound', this.createService)
  this.messenger.discoverIncludedServices(peripheral, serviceUUID, callback);
}

BluetoothController.prototype.serviceDiscovery = function(peripheral, callback) {

  // If we've already discovered all services
  if (peripheral._allServicesCached) {

    var services = [];

    // Just return all the services. No need to spend the time re-fetching
    for (var service in peripheral.services) {
      services.push(peripheral.services[service]);
    }

    return callback && callback(null, services);

  }
  else {
    
    var services = [];

    // The 'groupFound' event is called when we find a service
    var groupFoundListener = this.createServiceFromGroup.bind(this, peripheral, services);

    this.on('groupFound', groupFoundListener);

    // The 'completed Procedure' event is called when we're done looking for services
    this.once('completedProcedure', function(procedure) {
      // If this was called for this peripheral
      if (procedure.connection === peripheral.connection) {
        // Remove the listener
        this.removeListener('groupFound', groupFoundListener);

        // Call the callback
        callback && callback(null, services);
      }
    }.bind(this));

    // Request the messenger to start discovering services
    this.messenger.discoverServices(peripheral, function(err, response) {
      // If there was a problem with the request
      if (err || response.result != 0) {
        // If it was an error reported by module, set that as error
        if (!err) err = response.result;

        // Call callback immediately
        return callback && callback(err);
      }
    }.bind(this));
  }
}

BluetoothController.prototype.createServiceFromGroup = function(peripheral, ret, groupItem) {
  // If this is the right peripheral
  if (groupItem.connection === peripheral.connection) {
    // Convert the UUID to a string instead of buffer
    var strUUID = this.uuidToString(groupItem.uuid);
    // Create a new service
    var service = new Service(peripheral, strUUID, groupItem.start, groupItem.end);
    // Add this services to the peripherals data structure
    peripheral.syncService(service);
    // Add to the service we will report as having discovered
    ret.push(service);
  }
}

BluetoothController.prototype.discoverAllCharacteristics = function(peripheral, callback) {
  this.discoverCharacteristics(peripheral, [], callback);
}

BluetoothController.prototype.discoverCharacteristics = function(peripheral, filter, callback) {
  console.log("Listeners before: ", this.messenger.listeners('completedProcedure').length);
  // Discover the services of this device
  this.characteristicDiscovery(peripheral, 0x0001, 0xFFFF, function(err, allCharacteristics) {
    console.log("Listeners after: ", this.messenger.listeners('completedProcedure').length);
    // Format results and report any errors
    this.attributeDiscoveryHandler(err, filter, allCharacteristics, function(err, characteristics) {

      peripheral._allCharacteristicsCached = true;

      callback && callback(err, characteristics);

      // If we have characteristics to report
      if (characteristics.length) {
        // Also emit it from appropriate sources
        setImmediate(function() {
          this.emit('characteristicsDiscover', characteristics);
          peripheral.emit('characteristicsDiscover', characteristics);
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
}

BluetoothController.prototype.discoverAllCharacteristicsOfService = function(service, callback) {
  this.discoverCharacteristicsOfService(service, [], callback);
}

BluetoothController.prototype.discoverCharacteristicsOfService = function(service, filter, callback) {
  // Discover the characteristics of this specific service
  this.characteristicDiscovery(service._peripheral, service._startHandle, service._endHandle, function(err, allCharacteristics) {
    // Format results and report any errors
    this.attributeDiscoveryHandler(err, filter, allCharacteristics, function(err, characteristics) {
      callback && callback(err, characteristics);
      // If we have characteristics to report
      if (characteristics.length) {
        // Also emit it from appropriate sources
        setImmediate(function() {
          this.emit('characteristicsDiscover', characteristics);
          service._peripheral.emit('characteristicsDiscover', characteristics);
          service.emit('characteristicsDiscover', characteristics);
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
}

BluetoothController.prototype.attributeDiscoveryHandler = function(err, filter, attributes, callback) {
  // If there was an error, report it
  if (err) {
    callback && callback(err);

    setImmediate(function() {
      this.emit('error', err);
    }.bind(this));

    return;
  }
  // If not
  else {
    // Create a return array
    var ret = []; 
          // If consumer has requested a subset of services
    if (filter.length != 0) {
      // Iterate through the services requested
      for (var i = 0; i < filter.length; i++) {
        // Convert filter to lower case
        var match = filter[i].toLowerCase();
        // If the service details exist and was returned
        for (var j = 0; j < attributes.length; j++) {
          // If the attribute's uuid is the filter
          if (attributes[j].uuid == match) {
            // Add it to the array
            ret.push(attributes[j]); 
            break;
          }
        }
      }
    }
    // If the consumer has requested all services
    else {
      ret = attributes;
    }

    // Return the values
    callback && callback(null, ret);
  }
}

BluetoothController.prototype.characteristicDiscovery = function(peripheral, startHandle, endHandle, callback) {
    // If we've already discovered all services
  if (peripheral._allCharacteristicsCached) {

    var characteristics = [];

    // Add all the matched characteristics
    for (var characteristic in peripheral.services.characteristics) {
      characteristics.push(peripheral.services.characteristics[characteristic]);
    }

    // Add all the unmatched characteristics
    for (var unassigned in peripheral._unassignedCharacteristics) {
      characteristics.push(peripheral._unassignedCharacteristics[unassigned]);
    }

    return callback && callback(null, characteristics);

  }
  else {

    var characteristics = [];

    // The 'groupFound' event is called when we find a service
    var infoFoundListener = this.createCharacteristicFromInfo.bind(this, peripheral, characteristics);

    this.on('findInformationFound', infoFoundListener);

    // The 'completed Procedure' event is called when we're done looking for services
    this.messenger.once('completedProcedure', function(procedure) {

      // If this was called for this peripheral
      if (procedure.connection === peripheral.connection) {

        // Stop listening for more characteristics
        this.removeListener('findInformationFound', infoFoundListener);

        // If it didn't succeed
        if (procedure.result != 0) {

          callback && callback(procedure.result, null);
        }
        else {
          // Call the callback
          callback && callback(null, characteristics);
        }
      }
    }.bind(this));

    // Request the messenger to start discovering services
    this.messenger.discoverCharacteristicsInRange(peripheral, startHandle, endHandle, function(err, response) {
      // If there was a problem with the request
      if (err || response.result != 0) {
        // If it was an error reported by module, set that as error
        if (!err) err = response.result;

        // Call callback immediately
        callback && callback(err);

        setImmediate(function() {
          this.emit('error', err);
        }.bind(this));
      }
    }.bind(this));
  }
}


BluetoothController.prototype.createCharacteristicFromInfo = function(peripheral, ret, info) {
  // If this is the correct connection
  if (peripheral.connection == info.connection) {
    // Convert UUID to string
    var stringUUID = this.uuidToString(info.uuid);
    // Create the characteristic
    var characteristic = new Characteristic(peripheral, stringUUID, info.chrhandle);
    // Add it to our peripheral
    peripheral.syncCharacteristic(characteristic);
    // Add to the characteristics we will report as having discovered
    ret.push(characteristic);
  }
}

BluetoothController.prototype.clearCache = function(peripheral, callback) {
  peripheral.clearCache(callback);
}

BluetoothController.prototype.read = function(characteristic, callback) {

  var valueListener = this.setCharacteristicValue.bind(this, characteristic, 0);
  
  this.messenger.on('attributeValue', valueListener);

  // The 'completed Procedure' event is called when we're done looking for services
  this.messenger.once('completedProcedure', function(procedure) {

    // If this was called for this peripheral
    if (procedure.connection === characteristic._peripheral.connection) {

      // Stop listening for more characteristics
      this.removeListener('attributeValue', valueListener);

      // If it didn't succeed
      if (procedure.result != 0) {

        callback && callback(procedure.result, null);
      }
      else {
        // Call the callback
        callback && callback(null, characteristic.lastReadValue);

        setImmediate(function() {
          this.emit('read', characteristic, characteristic.lastReadValue);
          characteristic._peripheral.emit('read', characteristic, characteristic.lastReadValue);
          characteristic.emit('read', characteristic.lastReadValue);
        }.bind(this));
      }
    }
  }.bind(this));

    // Request the messenger to start discovering services
  this.messenger.readCharacteristicValue(characteristic, function(err, response) {
    // If there was a problem with the request
    if (err || response.result != 0) {
      // If it was an error reported by module, set that as error
      if (!err) err = response.result;

      // Call callback immediately
      return callback && callback(err);
    }
  }.bind(this));
}

/*
* Called when we get new values. May be called multiple times per value, which is why we have to
* stitch buffers together.
*/
BluetoothController.prototype.setCharacteristicValue = function(characteristic, readNum, reading) {

  // If this is our first read of several or if this will be the only read
  if (readNum === 0 || (reading.type == 0)) {
    // Assign the value
    characteristic.lastReadValue = reading.value;
  }
  // If not
  else {
    // Concat the buffers
    characteristic.lastReadValue = Buffer.concat([characteristic.lastReadValue, reading.value]);
  }

  readNum++;
}

BluetoothController.prototype.write = function(characteristic, value, callback) {

  // Write has to be in 20 byte increments
  this.splitWriteIntoBuffers(value, function(err, buffers) {
    if (err) {
      return callback && callback(err);
    }
    else {
      // If there is only one buffer
      if (buffers.length == 1) {
        // We can send it immediately
        this.writeImmediately(characteristic, buffers[0], callback);
      }
      else {
        // If there are multiple buffers, we've got to prepare several writes, then execute
        this.prepareWrite(characteristic, buffers, callback);
      }
    }
  });
}
BluetoothController.prototype.writeImmediately = function(characteristic, singleBuffer, callback) {
  // The 'completed Procedure' event is called when we're done writing
  this.messenger.once('completedProcedure', function(procedure) {

    // If this was called for this peripheral
    if (procedure.connection === characteristic._peripheral.connection && 
          procedure.chrhandle === characteristic.handle) {

      // If it didn't succeed
      if (procedure.result != 0) {

        callback && callback(procedure.result, null);
      }
      else {
        // Call the callback
        callback && callback(null, singleBuffer);

        setImmediate(function() {
          this.emit('write', characteristic, singleBuffer);
          characteristic._peripheral.emit('write', characteristic, singleBuffer);
          characteristic.emit('write', singleBuffer);
        }.bind(this));
      }
    }
  }.bind(this));

  this.messenger.writeImmediately(characteristic, singleBuffer, function(err, response) {
    // If there was a problem with the request
    if (err || response.result != 0) {
      // If it was an error reported by module, set that as error
      if (!err) err = response.result;

      // Call callback immediately
      return callback && callback(err);
    }
  })
}
BluetoothController.prototype.prepareWrite = function(characteristic, multipleBuffers, callback) {
  var bufSize = 20;
  var offset = 0;

  // Keep this around
  var self = this;

  // Function for writing each subsequent buffer 
  function bufferWriteIterate(procedure) {
    // If this is for our connection
    if (procedure.connection === characteristic._peripheral.connection
      && procedure.chrhandle === characteristic.handle) {
      // If there was an error, report it and cancel write
      if (procedure.result != 0) {
        // Cancel any previous writes
        self.messenger.cancelWrite(characteristic, function(cancelErr, response) {
          // Call callback immediately
          return callback && callback(procedure.result);
        });
      }
      // If there was no error
      else {
        // If we've completed the procedure but still have more to write
        if (offset < multipleBuffers.length) {

          // Send another part of the buffer off 
          self.messenger.prepareWrite(characteristic, multipleBuffers[offset], offset*bufSize, function(err, response) {
            // If there was a problem with the request
            if (err || response.result != 0) {
              // Cancel any previous writes
              self.messenger.cancelWrite(characteristic, function(cancelErr, response) {
                // If it was an error reported by module, set that as error
                if (!err) err = response.result;

                // Call callback immediately
                return callback && callback(err);
              });
            }
            // Increment offset so we send the next buffer next time
            offset++;
          });
        }
        // If we've sent all the prepare writes...
        else if (offset === multipleBuffers.length) {
          // Remove the buffer write iterator listener so we don't send any more packets
          self.messenger.removeListener('completedProcedure', bufferWriteIterate);

          // Once our write execution is complete
          self.messenger.once('completedProcedure', function(procedure) {
            // If there was an error
            if (procedure.result != 0) {
              // Report the error
              callback && callback(procedure.result);
            }
            // If there was no error
            else {
              //Concat all the buffers into one
              var ret;
              for (var i = 0; i < multipleBuffers.length; i++) {
                ret = Buffer.concat(ret, multipleBuffers[i]);
              }

              // Call callback
              callback && callback(null, ret);

              // Emit the events
              setImmediate(function() {
                self.emit('write', characteristic, ret);
                characteristic._peripheral.emit('write', characteristic, ret);
                characteristic.emit('write', ret);
              });
            }
          });
          // Execute the write of the packets
          self.messenger.executeWrite(characteristic, function(err, response) {
            // If there was a problem with the request
            if (err || response.result != 0) {
              // If it was an error reported by module, set that as error
              if (!err) err = response.result;

              // Call callback immediately
              return callback && callback(err);
            } 
          });
        }
      }
    }
  }

  this.messenger.on('completedProcedure', bufferWriteIterate);

  this.messenger.prepareWrite(characteristic, multipleBuffers[offset], offset * bufSize, function(err, response) {
     // If there was a problem with the request
    if (err || response.result != 0) {
      // If it was an error reported by module, set that as error
      if (!err) err = response.result;

      // Call callback immediately
      return callback && callback(err);
    } 
    offset++;
  });
}

BluetoothController.prototype.splitWriteIntoBuffers = function(value, callback) {
  // If nothing was passed in, just return an error
  if (!value) {
    return callback && callback(new Error("No value passed to write function"));
  }
  // If something was passed in
  else {
    var buf;

    // If it is a string, make a buf with utf-8 encoding
    if (typeof value === "string") {
      buf = new Buffer(value);
    }
    // If it's already a buffer, keep as is
    else if (Buffer.isBuffer(value)) {
      buf = value;
    }
    // If it's a number
    else if (!isNaN(value)) {
      // Make a new buffer for the 32 bit number
      buf = new Buffer(4);
      buf.writeUInt32BE(value, 0);
    }
    // If none of the above, it's invalid. Throw an error
    else {
      return callback && callback("Can only write strings, numbers, and buffers.");
    }

    // Max number of bytes per buffer
    var maxBufLen = 20;
    var maxNumBufs = 5;

    // Get the number of buffers we'll need
    var iter = Math.ceil(buf.length/maxBufLen);

    // Prepare array for buffers
    var ret = new Array(iter);
    // For each buffer
    for (var i = 0; i < iter; i++) {
      // Grab the start byte
      var start = i * maxBufLen;
      // Put that start plus next 20 bytes (or if it's the last, just grab remainder)
      var end = (i == iter-1 ? buf.length % maxBufLen : maxBufLen);
      // Slice it and throw it into our return array
      ret[i] = buf.slice(start, start + end);
    }

    if (ret.length > maxNumBufs) {
      callback && callback(new Error("Write data must be 100 bytes or less"));
    }
    else {
      // Return array
      callback && callback(null, ret);
    }
  }
  
}


// BluetoothController.prototype.startAdvertising = function(callback) {
//   this.advertising = true;
//   this.messenger.startAdvertising(callback);
// }

// BluetoothController.prototype.readValue = function(index, callback) {
//   this.messenger.readValue(characteristicHandles[index], callback);
// }

// BluetoothController.prototype.writeValue = function(index, value, callback) {
//   this.messenger.writeValue(characteristicHandles[index], value, callback);
// }



// BluetoothController.prototype.getAddress = function(callback) {
//   this.messenger.getAddress(function(err, response) {
//     callback && callback(err, response.address);
//   });
// }

// BluetoothController.prototype.whitelistAppend = function(address, callback) {
//   this.messenger.whitelistAppend(address, callback);
// }

// BluetoothController.prototype.clearWhitelist = function(callback) {
//   this.messenger.clearWhitelist(callback);
// }
// BluetoothController.prototype.connectSelective = function(callback) {
//   this.messenger.connectSelective(callback);
// }

// BluetoothController.prototype.updateRssi = function(peripheral, callback) {
//   this.messenger.updateRssi(peripheral, function(err, rssi) {
//     if (!err) {
//       setImmediate(function() {
//         this.emit('rssiUpdate', rssi);
//         peripheral.emit('rssiUpdate', rssi);
//       }.bind(this));
//     }
//     callback && callback(err, rssi);
//   }.bind(this));
// }

BluetoothController.prototype.addressBufferToString = function(addressBuffer) {
  var str = "";
  for (var i = 0; i < addressBuffer.length; i++) {
    str+= addressBuffer.readUInt8(i).toString(10);
    if (i != addressBuffer.length-1) {
      str+=".";
    }
  }
  return str;
}

BluetoothController.prototype.addressStringToBuffer = function(addressString) {
  var b = new Buffer(6);
  var bytes = addressString.split('.');
  for (var i = 0; i < bytes.length; i++) {
    b.writeUInt8(bytes[i], i);
  }
  return b;
}

BluetoothController.prototype.uuidToString = function(uuidBuffer) {
  var str = "";
  var length = uuidBuffer.length;
  var elem;
  for (var i = 0; i < length; i++) {
    elem = uuidBuffer.readUInt8(length-1-i).toString(16);
    if (elem.length === 1) {
      elem = "0" + elem;
    }
    str += elem;

  }
  return str;
}
/*************************************************************
PUBLIC API
*************************************************************/
module.exports.use = use;
module.exports.BluetoothController = BluetoothController;