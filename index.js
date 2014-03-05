var Peripheral = require('./lib/peripheral');
var Descriptor = require('./lib/descriptor');
var Characteristic = require('./lib/characteristic');
var Service = require('./lib/service');
var Messenger = require('./lib/messenger');
var UUID = require('./lib/uuid');
var Address = require('./lib/address');
var attributes = require('./lib/attributes.json');
var events = require('events');
var util = require('util');
var async = require('async');

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
  this.messenger.on('attributeValue', this.onAttributeValue.bind(this));

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
  this.getPeripheralFromData(peripheralData.rssi, peripheralData.data, peripheralData.sender, peripheral.address_type, function(peripheral, undiscovered) {
  // If this peripheral hasn't been discovered or we allow duplicates
  if (undiscovered || (this._allowDuplicates)) {
      setImmediate(function() {
        this.emit('discover', peripheral);
      }.bind(this));
    }
  }.bind(this));
}

BluetoothController.prototype.onConnectionStatus = function(status) {

  this.getPeripheralFromData(null, null, status.address, status.address_type, function(peripheral, undiscovered) {
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
  console.log("SHIT ITS DISCONNECTED!", response.reason);
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

/*
 Called when an attribute value is found
 */
BluetoothController.prototype.onAttributeValue = function(value) {
  this.emit('attributeValue', value);
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
  this.getPeripheralFromData(peripheralData.rssi, peripheralData.data, peripheralData.sender, peripheralData.address_type, function(peripheral, undiscovered) {
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

BluetoothController.prototype.getPeripheralFromData = function(rssi, data, address, addressType, callback) {

  var addr = new Address(address);

  // Try to grab this peripheral from list of previously discovered peripherals
  var peripheral = this._discoveredPeripherals[addr.toString()];

  // If it hasn't been discovered yet
  if (!peripheral) {
    // Make a peripheral object from the data
    peripheral = new Peripheral(
                this,
                rssi,
                data,
                addr);

    peripheral.addressType = addressType;

    // Put it in our discovered data structure
    this._discoveredPeripherals[addr.toString()] = peripheral;

    callback && callback(peripheral, true);
  }
  else {
    callback && callback(peripheral, false);
  }
}

BluetoothController.prototype.connect = function(peripheral, callback) {

  this.messenger.connect(peripheral.address.toBuffer(), peripheral.addressType, function(err, response) {
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
BluetoothController.prototype.discoverAllAttributes = function(peripheral, callback) {
  // Discover all of our services and characteristics
  this.discoverAllServicesAndCharacteristics(peripheral, function(err, results) {
    var funcs = [];
    for (var characteristic in results.characteristics) {
      funcs.push(this.discoverDescriptorsOfCharacteristic.bind(this, results.characteristics[characteristic]));
    }
    // Get an array of arrays of descriptors
    async.series(funcs, function(err, charDescriptors) {
      // Make return array
      var allDescriptors = []
      // For each array of descriptors
      for (var i in charDescriptors) {
        // For each descriptor in that array
        for (var descriptor in charDescriptors[i]) {
          // Push the descriptor
          allDescriptors.push(charDescriptors[i][descriptor]);
        }
      }

      // Add descriptors to the resulting object
      results["descriptors"] = allDescriptors;

      // Call the callback
      callback && callback(err, results);
    });
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
    if (err) {
      return callback && callback(err);
    }
    else {
      this.attributeDiscoveryHandler(err, filter, allServices, function(err, services) {

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
    }
  }.bind(this));
}

// TODO: Implement this function
BluetoothController.prototype.discoverIncludedServices = function(peripheral, serviceUUID) {

  this.on('groupFound', this.createService)
  this.messenger.discoverIncludedServices(peripheral, serviceUUID, callback);
}

BluetoothController.prototype.serviceDiscovery = function(peripheral, callback) {

  var services = [];

  // The 'groupFound' event is called when we find a service
  var groupFoundListener = this.createServiceFromGroup.bind(this, peripheral, services);

  this.on('groupFound', groupFoundListener);

  var self = this;
  // The 'completed Procedure' event is called when we're done looking for services
  this.on('completedProcedure', function serviceDiscoveryComplete(procedure) {
    // If this was called for this peripheral
    if (procedure.connection === peripheral.connection) {

      // Remove the listener
      self.removeListener('groupFound', groupFoundListener);
      self.removeListener('completedProcedure', serviceDiscoveryComplete);

      // Call the callback
      callback && callback(null, services);
    }
  });

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
          if (attributes[j].uuid.toString() == match) {
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

BluetoothController.prototype.createServiceFromGroup = function(peripheral, ret, groupItem) {
  // If this is the right peripheral
  if (groupItem.connection === peripheral.connection) {
    // Convert the UUID to a string instead of buffer
    var uuid = new UUID(groupItem.uuid);

    var service;

    // If the service doesn't already exist
    if (!(service = peripheral[uuid.toString()])) {
      // Make a new service
      service = new Service(peripheral, uuid, groupItem.start, groupItem.end);

      // Add this services to the peripherals data structure
      peripheral.syncService(service);
    }

    // Add to the service we will report as having discovered
    ret.push(service);
  }
}

BluetoothController.prototype.discoverAllCharacteristics = function(peripheral, callback) {

  this.discoverAllServices(peripheral, function(err, services) {
    if (err) {
      return callback && callback(err);
    }
    else {
      var characteristics = [];

      var self = this;

      var discoveryListener = this.createCharacteristicFromInformationFound.bind(this, peripheral, characteristics);

      this.on('findInformationFound', discoveryListener);

      this.on('completedProcedure', function charDiscoveryComplete(procedure) {
        if (procedure.connection === peripheral.connection) {

          self.removeListener('findInformationFound', discoveryListener);
          self.removeListener('completedProcedure', charDiscoveryComplete);

          // If it didn't succeed
          if (procedure.result != 0) {

            callback && callback(procedure.result, null);
          }
          else {

            callback && callback(null, characteristics);

            setImmediate(function() {
              self.emit('characteristicsDiscover', characteristics);
              peripheral.emit('characteristicsDiscover', characteristics);
            });
          }
        }
      });

      this.messenger.discoverAllAttributes(peripheral, function(err, response) {
        // If there was a problem with the request
        if (err || response.result != 0) {
          // If it was an error reported by module, set that as error
          if (!err) err = response.result;

          // Call callback immediately
          return callback && callback(err);
        }
      }.bind(this));
    }
  }.bind(this));
}

// TODO: Make work with actual array
BluetoothController.prototype.discoverCharacteristics = function(peripheral, uuids, callback) {

  // Somehow assemble the functions such that the next element is the callback to the previous
  var funcs = [];
  for (var i = 0; i < uuids.length; i++) {
    funcs.push(this.discoverCharacteristic.bind(this, peripheral, new UUID(uuids[i])));
  }

  async.series(funcs, function(err, characteristics) {

    for (var i in characteristics) {
      console.log(characteristics[i].toString());
    }

    callback && callback(err, characteristics)

    if (!err && characteristics.length) {
      setImmediate(function() {
        this.emit('characteristicsDiscover', characteristics);
        peripheral.emit('characteristicsDiscover', characteristics);
      }.bind(this));
    }

  }.bind(this));
}

BluetoothController.prototype.discoverCharacteristic = function(peripheral, characteristicUUID, callback) {

  var self = this;
  var ret = [];
  var listener = this.createCharacteristicFromAttributeValue.bind(this, peripheral, ret);

  this.on('attributeValue', listener);

  this.on('completedProcedure', function charDiscoveryComplete(procedure) {
    if (procedure.connection === peripheral.connection) {
      if (procedure.result != 0) {
        callback && callback(procedure.result);
      }
      else {

        self.removeListener('attributeValue', listener);
        self.removeListener('completedProcedure', charDiscoveryComplete);

        if (ret.length != 1) {
          return callback && callback(null, []);
        }
        else {
          self.discoverCharacteristicUUID(peripheral, ret[0], callback);
        }
      }
    }
  });

  // Request only the value of the characteristic with this handle
  this.messenger.discoverCharacteristicsInRangeForUUID(peripheral, 0x0001, 0xFFFF, characteristicUUID, function(err, response) {
    // If there was a problem with the request
    if (err || response.result != 0) {
      // If it was an error reported by module, set that as error
      if (!err) err = response.result;

      // Call callback immediately
      return callback && callback(err);
    }
  }.bind(this));
}

BluetoothController.prototype.discoverCharacteristicUUID = function(peripheral, characteristic, callback) {

  // Save reference to self
  var self = this;

  // Once we have found info containing UUID about this char
  this.on('findInformationFound', function setCharacteristicUUID(info) {

    // If this is for the correct connection and char handle
    if (peripheral.connection === info.connection
      && characteristic.handle === info.chrhandle) {

      // Set the uuid of this characteristic
      characteristic.setUUID(new UUID(info.uuid));

      // Remove this listener
      self.removeListener('findInformationFound', setCharacteristicUUID);
    }
  });

  // Once we complete the search
  this.on('completedProcedure', function procedureComplete(procedure) {

    // If this was called for this peripheral
    if (procedure.connection === peripheral.connection) {

      // Stop listening for more characteristics
      self.removeListener('completedProcedure', procedureComplete);

      // If it didn't succeed
      if (procedure.result != 0) {

        // Call the callback with the error
        callback && callback(procedure.result, null);
      }
      else {
        // Call the callback with result
        callback && callback(null, characteristic);
      }
    }
  });

  // Tell the messenger to begin the search for the uuid of this characteristic
  this.messenger.discoverCharacteristicUUID(characteristic, function(err, response) {
  // If there was a problem with the request
    if (err || response.result != 0) {
      // If it was an error reported by module, set that as error
      if (!err) err = response.result;

      // Call callback immediately
      callback && callback(err);
    }
  }.bind(this));
}

/*
* Method for turning a bit of information into a characteristic. Must discover all services before calling. (sucks, I know)
*/
BluetoothController.prototype.discoverAllServicesAndCharacteristics = function(peripheral, callback) {

  // Discover all characteristics already requires a discovery of all services
  this.discoverAllCharacteristics(peripheral, function(err, characteristics) {
    // If there is an error
    if (err) {
      // Call the callback
      callback && callback(err);
    }
    // If there is no error
    else {
      // Services to return
      var services = [];

      // For each service in this peripheral
      for (var service in peripheral.services) {
        // Push it into the array
        services.push(peripheral.services[service]);
      }
      // Call callback with our results
      callback && callback(err, {services : services, characteristics : characteristics});
    }
  }.bind(this));
}
BluetoothController.prototype.createCharacteristicFromInformationFound = function(peripheral, ret, info) {
  if (peripheral.connection === info.connection) {
    // Turn the uuid into a string
    var uuid = new UUID(info.uuid);
    // If this uuid isn't a service or a descriptor, or any other generic type
    if (!peripheral.services[uuid.toString()] &&
        !Service.isStandardService(uuid.toString()) &&
        !(Descriptor.isStandardDescriptor(uuid.toString())) &&
        !attributes[uuid.toString()]) {

      // Make a new one
      var characteristic = new Characteristic(peripheral, uuid, info.chrhandle);

      // Sync the new one with the correct service
      peripheral.syncCharacteristic(characteristic);

      // Push it into the return array
      ret.push(characteristic);
    }
  }
}
BluetoothController.prototype.createCharacteristicFromAttributeValue = function(peripheral, ret, value) {
  // If this is the correct connection
  if (peripheral.connection === value.connection) {
    // Create the characteristic
    var characteristic = new Characteristic(peripheral, null, value.atthandle, value.value);
    // Add to the characteristics we will report as having discovered
    ret.push(characteristic);
  }
}

BluetoothController.prototype.discoverAllCharacteristicsOfService = function(service, callback) {
  this.discoverCharacteristicsOfService(service, [], callback);
}

// TODO: This currently writes new characteristics over old ones because we have no way of
// checking which characteristics we should construct and what we shouldn't
BluetoothController.prototype.discoverCharacteristicsOfService = function(service, filter, callback) {

  // Discover the characteristics of this specific service
  this.serviceCharacteristicDiscovery(service, function(err, allCharacteristics) {
    // Format results and report any errors
    this.attributeDiscoveryHandler(err, filter, allCharacteristics, function(err, characteristics) {

      // Call that callback
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

BluetoothController.prototype.serviceCharacteristicDiscovery = function(service, callback) {
  // Save reference to self
  var self = this;

  var characteristics = [];

  var listener = this.createCharacteristicFromInformationFound.bind(this, service._peripheral, characteristics);

  // Once we have found info containing UUID about this char
  this.on('findInformationFound', listener);

  // Once we complete the search
  this.on('completedProcedure', function procedureComplete(procedure) {

    // If this was called for this peripheral
    if (procedure.connection === service._peripheral.connection) {

      // Stop listening for more characteristics
      self.removeListener('completedProcedure', procedureComplete);
      self.removeListener('findInformationFound', listener);

      // If it didn't succeed
      if (procedure.result != 0) {

        // Call the callback with the error
        callback && callback(procedure.result, null);
      }
      else {
        // Call the callback with result
        callback && callback(null, characteristics);
      }
    }
  });

  // Tell the messenger to begin the search for the uuid of this characteristic
  this.messenger.discoverCharacteristicsInRange(service._peripheral, service._startHandle, service._endHandle, function(err, response) {
  // If there was a problem with the request
    if (err || response.result != 0) {
      // If it was an error reported by module, set that as error
      if (!err) err = response.result;

      // Call callback immediately
      callback && callback(err);
    }
  }.bind(this));
}

BluetoothController.prototype.read = function(characteristic, callback) {

  var valueListener = this.setCharacteristicValue.bind(this, characteristic, 0);

  this.messenger.on('attributeValue', valueListener);

  // The 'completed Procedure' event is called when we're done looking for services
  this.once('completedProcedure', function(procedure) {

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
  this.once('completedProcedure', function(procedure) {

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

/*
* Continues reading and storing subsequent handles of a characteristic until a non-descriptor is found
*/
BluetoothController.prototype.discoverDescriptorsOfCharacteristic = function(characteristic, callback) {

  var self = this;

  var descriptors = [];

  var offset = 1;

  var done = false;

  // Keep reading the next handle until it is not a descriptor
  this.on('findInformationFound', function findDescriptorInformation(info) {

    // If this for the correct connection
    if (characteristic._peripheral.connection === info.connection) {

      // Turn the uuid into a string
      var uuid = new UUID(info.uuid);

      // If this uuid isn of a descriptor
      if (Descriptor.isStandardDescriptor(uuid.toString())) {

        // Make a new one
        var descriptor = new Descriptor(characteristic._peripheral, uuid, info.chrhandle);

        // Add it to the characteristic's descriptors
        characteristic.descriptors[uuid.toString()] = descriptor;

        // Push it into the return array
        descriptors.push(descriptor);
      }
      else {
        // Set the done flag
        done = true;

        // Remove this listener
        self.removeListener('findInformationFound', findDescriptorInformation);
      }
    }
  });

  // Once we have finished finding a single descriptor
  this.on('completedProcedure', function descriptorDiscoveryComplete(procedure) {

    // If this was called for this peripheral
    if (procedure.connection === characteristic._peripheral.connection) {

      // If it didn't succeed
      if (procedure.result != 0) {

        // If the error is not that their is no Attribute found (which will happen
        // if the final characteristic is called upon)
        if (procedure.result.message != 'Attribute Not Found') {

          // Call the callback with the error
          callback && callback(procedure.result, null);

          // Emit the event
          setImmediate(function() {
            self.emit('error', procedure.result);
          });

          return;
        }
        else {
          done = true;
        }
      }

      // If we have finished finding all descriptors
      if (done) {

        // Stop listening for more descriptors
        self.removeListener('completedProcedure', descriptorDiscoveryComplete);

        // Call the callback with result
        callback && callback(null, descriptors);

        // Emit events
        setImmediate(function() {
          self.emit('descriptorsDiscover', descriptors);
          characteristic._peripheral.emit('descriptorsDiscover', descriptors);
        });
      }
      // If we have not finished finding descriptors
      else {

        // Increase the offset
        offset++;

        // And make the call for the next attribute
        self.messenger.readHandle(characteristic._peripheral, characteristic.handle + offset, function(err, response) {
          // If there was a problem with the request
          if (err || response.result != 0) {
           // If it was an error reported by module, set that as error
           if (!err) err = response.result;

           // Call callback immediately
           callback && callback(err);

           setImmediate(function() {
             self.emit('error', err);
           });
          }
        });
      }
    }
  });

  // Read the first subsequent handle
  this.messenger.readHandle(characteristic._peripheral, characteristic.handle + offset, function(err, response) {
    // If there was a problem with the request
    if (err || response.result != 0) {
     // If it was an error reported by module, set that as error
     if (!err) err = response.result;

      // Call callback immediately
      callback && callback(err);

      // Emit the error
      setImmediate(function() {
        this.emit('error', err);
      }.bind(this))
    }
  });
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
/*************************************************************
PUBLIC API
*************************************************************/
module.exports.use = use;
module.exports.BluetoothController = BluetoothController;
