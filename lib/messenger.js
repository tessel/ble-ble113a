var tessel = require('tessel');
var bglib = require('bglib');
var uuid = require('./uuid');
var attributes = require('./attributes.json');
var events = require('events');
var util = require('util');


var DEBUG = false;

var __firstHandle = 0x0001;
var __lastHandle = 0xFFFF;

function Messenger(hardware) {

  this.bgLib = new bglib();

  this.bgLib.setPacketMode(1);

  // Initialize UART
  this.uart = hardware.UART({baudrate:9600});

  // Start listening for UART data
  this.uart.on('data', this.parseIncomingPackets.bind(this));

  // Set the reset pin
  this.resetPin = hardware.gpio(3);

  // Array of packets awaiting a response
  this.awaitingResponse = [];

  // Amount of time to wait before a packet timeout
  this.commandPacketTimeoutDuration = 60000;

  // Reset the module to clear any possible comms issues
  // Should call 'booted' event after reset
  this.reset();
}

util.inherits(Messenger, events.EventEmitter);

Messenger.prototype.connectTimeout = function() {
  // If it gets fired
  setImmediate(function() {
    // Emit an error
    this.emit('error', new Error("Unable to connect to module."));
  }.bind(this));
}

Messenger.prototype.bootSequence = function(connectTimeout, callback) {

  // Send data to the module to ensure we have comms
  this.verifyCommunication( function(err) {

    // Clear the timeout when we get a response
    clearTimeout(connectTimeout);

    callback && callback(err);
    // If there was a problem
    if (err) {
      // Report the error
      setImmediate(function() {
        this.emit('error', err);
      }.bind(this));
    }
    // If not
    else {
      // Report that we are ready
      setImmediate(function() {
        this.emit('ready');
      }.bind(this));
    }
  }.bind(this));

  // Temporary hack until #179 is fixed
  this.removeAllListeners('booted');
}

Messenger.prototype.reset = function(callback) {
  // Make a timeout for connecting to the module
  var connectTimeout = setTimeout(this.connectTimeout.bind(this), 5000);

  // When we've booted ensure we can communicate
  this.once('booted', this.bootSequence.bind(this, connectTimeout, callback));

  this.resetPin.output().low();
  this.resetPin.high();
}

Messenger.prototype.verifyCommunication = function(callback) {
  this.execute(bglib.api.systemHello, callback);
}

Messenger.prototype.startScanning = function(callback) {
  this.execute(bglib.api.gapDiscover, [this.bgLib.GAPDiscoverMode.gap_discover_generic], callback);
}

Messenger.prototype.stopScanning = function(callback) {
  this.execute(bglib.api.gapEndProcedure, callback);
}

Messenger.prototype.connect = function(address, addressType, callback) {
  // params: address, address_type, conn_interval_min, conn_interval_max, timeout, latency
  // TODO: Make last four params configurable?
  this.execute(bglib.api.gapConnectDirect, [address, address_type, 1000, 2000, 3200, 0], callback);
}
Messenger.prototype.disconnect = function(connection, callback) {
  // params: address, address_type, conn_interval_min, conn_interval_max, timeout, latency
  // TODO: Make last four params configurable?
  this.execute(bglib.api.connectionDisconnect, [connection], callback);
}

Messenger.prototype.discoverServices = function(peripheral, callback) {
  this.execute(bglib.api.attClientReadByGroupType, [peripheral.connection, __firstHandle, __lastHandle, [0x00, 0x28]], callback);
}

Messenger.prototype.discoverAllAttributes = function(peripheral, callback) {
  this.execute(bglib.api.attClientFindInformation, [peripheral.connection, __firstHandle, __lastHandle], callback);
}

Messenger.prototype.discoverCharacteristicsInRangeForUUID = function(peripheral, startHandle, endHandle, uuid, callback) {
  this.execute(bglib.api.attClientReadByType, [peripheral.connection, startHandle, endHandle, uuid.toBuffer()], callback);
}

Messenger.prototype.discoverCharacteristicUUID = function(characteristic, callback) {
  this.execute(bglib.api.attClientFindInformation, [characteristic._peripheral.connection, characteristic.handle, characteristic.handle + 1], callback);
}

Messenger.prototype.discoverCharacteristicsInRange = function(peripheral, startHandle, endHandle, callback) {
  this.execute(bglib.api.attClientFindInformation, [peripheral.connection, startHandle, endHandle], callback);
}

Messenger.prototype.findHandle = function(peripheral, offset, callback) {
  this.execute(bglib.api.attClientFindInformation, [peripheral.connection, offset, offset+0], callback);
}

Messenger.prototype.readCharacteristicValue = function(characteristic, callback) {
  this.execute(bglib.api.attClientReadLong, [characteristic._peripheral.connection, characteristic.handle], callback);
}

Messenger.prototype.writeAttributeImmediately = function(attribute, buf, callback) {
  this.execute(bglib.api.attClientAttributeWrite, [attribute._peripheral.connection, attribute.handle, buf], callback);
}

Messenger.prototype.prepareWrite = function(attribute, buf, offset, callback) {
  this.execute(bglib.api.attClientPrepareWrite, [attribute._peripheral.connection, attribute.handle, offset, buf], callback);
}

Messenger.prototype.executeWrite = function(attribute, callback) {
  this.execute(bglib.api.attClientExecuteWrite, [attribute._peripheral.connection, 1], callback);
}

Messenger.prototype.cancelWrite = function(attribute, callback) {
  this.execute(bglib.api.attClientExecuteWrite, [attribute._peripheral.connection, 0], callback);
}

Messenger.prototype.readHandle = function(peripheral, attribute, callback) {
  this.execute(bglib.api.attClientReadLong, [peripheral.connection, attribute.handle], callback);
}

Messenger.prototype.confirmIndication = function(characteristic, callback) {
  this.execute(bglib.api.attClientIndicateConfirm, [characteristic._peripheral.connection], callback);
}

Messenger.prototype.updateRssi = function(peripheral, callback) {
  this.execute(bglib.api.connectionGetRSSI, [peripheral.connection], callback);
}

Messenger.prototype.getAddress = function(callback) {
  this.execute(bglib.api.systemAddressGet, [], callback);
}

Messenger.prototype.getMaxConnections = function(callback) {
  this.execute(bglib.api.systemGetConnections, [], callback);
}


Messenger.prototype.startAdvertising = function(callback) {
  this.execute(bglib.api.gapSetMode, [this.bgLib.GAPDiscoverableModes.gap_general_discoverable, this.bgLib.GAPConnectableMode.gap_directed_connectable], callback);
}

Messenger.prototype.stopAdvertising = function(callback) {
  this.execute(bglib.api.gapSetMode, [this.bgLib.GAPDiscoverableModes.gap_non_discoverable, this.bgLib.GAPConnectableMode.gap_non_connectable], callback);
}

Messenger.prototype.setAdvertisementData = function(advOrScan, data, callback) {
  this.execute(bglib.api.gapSetAdvData, [advOrScan, data], callback);
}

Messenger.prototype.writeLocalHandle = function(handle, value, callback) {
  this.execute(bglib.api.attributesWrite, [handle, 0, value], callback);
}

Messenger.prototype.readLocalHandle = function(handle, offset, callback) {
  this.execute(bglib.api.attributesRead, [handle, offset], callback);
}

Messenger.prototype.remoteWriteAck = function(connection, err, callback) {
  this.execute(bglib.api.attributesUserWriteResponse, [connection, err], callback);
}

Messenger.prototype.readADC = function(input, decimation, aref, callback) {
  this.execute(bglib.api.hwADCRead, [input, decimation, aref], callback);
}

Messenger.prototype.I2CSend = function(address, stopCondition, txbuf, callback) {
  this.execute(bglib.api.hwI2CWrite, [address, stopCondition, txbuf], callback);
}

Messenger.prototype.I2CRead = function(address, stopCondition, length, callback) {
  this.execute(bglib.api.hwI2CRead, [address, stopCondition, length], callback);
}

Messenger.prototype.readPin = function(port, pinMask, callback) {
  this.execute(bglib.api.hwIOPortRead, [port, pinMask], callback);
}

Messenger.prototype.writePin = function(port, pinMask, value, callback) {
  this.execute(bglib.api.hwIOPortWrite, [port, pinMask, value], callback);
}

Messenger.prototype.setPinDirections = function(port, pinMask, callback) {
  this.execute(bglib.api.hwIOPortConfigDirection, [port, pinMask], callback);
}

Messenger.prototype.watchPin = function(port, mask, edge, callback) {
  this.execute(bglib.api.hwIOPortConfigIRQ, [port, mask, edge], callback);
}

Messenger.prototype.setBondable = function(bondable, callback) {
  this.execute(bglib.api.smSetBondableMode, [bondable], callback);
}

Messenger.prototype.getBonds = function(callback) {
  this.execute(bglib.api.smGetBonds, [], callback);
}

Messenger.prototype.deleteBonds = function(peripheral, callback) {
  this.execute(bglib.api.smDeleteBonding, [peripheral.bondHandle], callback);
}

Messenger.prototype.startEncryption = function(peripheral, bond, callback) {
  this.execute(bglib.api.smEncryptStart, [peripheral.connection, bond], callback);
}

Messenger.prototype.enterPasskey = function(peripheral, passkey, callback) {
  this.execute(bglib.api.smPasskeyEntry, [peripheral.connection, passkey], callback);
}

Messenger.prototype.setOOBData = function(data, callback) {
  this.execute(bglib.api.smPasskeyEntry, [data], callback);
}

Messenger.prototype.setSecurityParameters = function(mitm, keysize, smpio, callback) {
  this.execute(bglib.api.smPasskeyEntry, [mitm, keysize, smpio], callback);
}
// TODO:

Messenger.prototype.discoverIncludedServices = function(peripheral, callback) {
  this.execute(bglib.api.attClientReadByGroupType, [peripheral.connection, 00001, 0xFFFF, [0x02, 0x28]], callback);
}




Messenger.prototype.execute = function(command, params, callback) {

  if (!command || command == 'undefined') {
    callback && callback (new Error("Invalid API call."), null);
    return;
  }
  // If they didn't enter any params and only a function
  // Assume there are no params
  if (typeof params == 'function') {
    callback = params;
    params = [];
  }

  var self = this;

  // Grab the packet from the library
  this.bgLib.getPacket(command, params, function(err, packet) {

    if (err) {

      // If we got a problem, let me hear it
      return callback && callback(err);
    }
    // Else we're going to send it down the wire
    else {
      // Get the bytes for the packet
      packet.getByteArray(function(bArray) {

        if (DEBUG) {
          console.log("Byte Array to be sent: ", bArray);
        }

          // Send the message
          self.sendBytes(packet, bArray, callback);

      });
    }
  });
}

Messenger.prototype.sendBytes = function(packet, bArray, callback) {

  // // Send it along
  var numSent = this.uart.write(bArray);

  // If we didn't send every byte, something went wrong
  // Return immediately
  if (bArray.length != numSent) {

    // Not enough bytes sent, somethign went wrong
    callback && callback(new Error("Not all bytes were sent..."), null);

  // Add the callback to the packet and set it to waiting
  } else if (callback) {

    // Set the callback the packet should respond to
    packet.callback = callback;

    // Add a timeout
    var self = this;
    packet.timeout = setTimeout(function() {
      self.commandPacketTimeout.bind(self, packet)();
    }, this.commandPacketTimeoutDuration);

    // Push packet into awaiting queue
    this.awaitingResponse.push(packet);
  }
}

Messenger.prototype.commandPacketTimeout = function(commandPacket) {

  this.popMatchingResponsePacket(commandPacket, function timeoutPacketFetch(err, packet) {

    if (err) return console.warn(err);
    if (packet) {
      try {
        return packet.callback && packet.callback(new Error("Packet Timeout..."));
      }
      catch (e) {
        console.warn(e);
      }
    }
  })
}

Messenger.prototype.popMatchingResponsePacket = function(parsedPacket, callback) {

  // Grab the first packet that matches the command and class
  var matchedPacket;
  // Iterating through packets waiting response
  for (var i = 0; i < this.awaitingResponse.length; i++) {
    // Grab the packet
    var packet = this.awaitingResponse[i];
    // If the class and ID are the same, we have a match
    if (packet && packet.cClass === parsedPacket.cClass
      && packet.cID === parsedPacket.cID) {

      // Clear the packet timeout
      clearTimeout(packet.timeout);

      // Delete it from the array
      this.awaitingResponse.splice(i, 1);

      // Save the command and break the loop
      matchedPacket = packet;
      break;
    }
  }

  callback && callback(null, matchedPacket);

  return matchedPacket;
}



Messenger.prototype.parseIncomingPackets = function(data) {

  // if (DEBUG) console.log("Just received this data: ", data);

  var self = this;

  // Grab the one or more responses from the library
  var incomingPackets = this.bgLib.parseIncoming(data, function callbackSeeker(err, parsedPackets) {
    // if (DEBUG) console.log("And that turned into ", parsedPackets.length, "packets")

    if (err){
      console.warn(err);
      return;
    }

    //For each response
    for (var i = 0; i < parsedPackets.length; i++) {
      var parsedPacket = parsedPackets[i];
      var cClass = parsedPacket.packet.cClass;
      var cID = parsedPacket.packet.cID;

      if (DEBUG) console.log("Got this packet: ", parsedPacket);

      // If it's an event, emit the event
      // Find the type of packet
      switch (parsedPacket.packet.mType & 0x80) {
          // It's an event
          case 0x80:
            if (parsedPacket.response) {
              if (cClass === 0x00 && cID === 0x00) {
                self.emit("booted");
              }
              else if (cClass === 0x02 && cID === 0x00) {
                self.emit("remoteWrite", parsedPacket.response)
              }
              else if (cClass === 0x02 && cID === 0x02) {
                self.emit("remoteStatus", parsedPacket.response)
              }
              else if (cClass === 0x03 && cID === 0x00) {
                self.emit("connectionStatus", parsedPacket.response);
              }
              else if (cClass === 0x03 && cID === 0x04) {
                self.emit('disconnect', parsedPacket.response);
              }
              else if (cClass === 0x04 && cID === 0x00) {
                self.emit('indicated', parsedPacket.response);
              }
              else if (cClass === 0x04 && cID === 0x01) {
                self.emit('completedProcedure', parsedPacket.response);
              }
              else if (cClass === 0x04 && cID === 0x02) {
                self.emit('groupFound', parsedPacket.response);
              }
              else if (cClass === 0x04 && cID === 0x04) {
                self.emit('findInformationFound', parsedPacket.response);
              }
              else if (cClass === 0x04 && cID === 0x05) {
                self.emit('attributeValue', parsedPacket.response);
              }
              else if (cClass === 0x05 && cID === 0x04) {
                self.emit('bondStatus', parsedPacket.response);
              }
              else if (cClass === 0x06 && cID === 0x00) {
                self.emit("discover", parsedPacket.response);
              }
              else if (cClass === 0x07 && cID === 0x00) {
                self.emit("portStatus", parsedPacket.response);
              }
              else if (cClass === 0x07 && cID === 0x02) {
                self.emit("ADCRead", parsedPacket.response);
              }
            }
              break;

          // It's a response
          case 0x00:
              // Find the command that requested it
              self.popMatchingResponsePacket(parsedPacket.packet, function responsePacketPop(err, packet) {

                  // If we didn't have a logical error but had a bglib error
                  if (!err && (packet && packet.result != 0)) {
                    // Set bglib error as error
                    err = packet.result;
                  }

                  // Call the original callback
                  if (packet && packet.callback) packet.callback(err, parsedPacket.response);

              });
              break;
          default:
                  console.warn("Malformed packet returned...");
      }
    }
  });
}

module.exports = Messenger;
