var tessel = require('tessel');
var bgLib = require('bglib');
bgLib.setPacketMode(1);
var events = require('events');
var util = require('util');

var DEBUG = 0;

function Messenger(hardware) {
  this.uart = hardware.UART({baudrate:9600});
  this.resetPin = hardware.gpio(3);
  this.awaitingResponse = [];

  this.uart.on('data', this.parseIncomingPackets.bind(this));

  this.commandPacketTimeoutDuration = 5000;

  var connectTimeout = setTimeout(function() {
    setImmediate(function() {
      this.emit('error', new Error("Unable to connect to module."));
    }.bind(this));
  }.bind(this), this.commandPacketTimeoutDuration);

  this.on('booted', function() { 
    this.verifyCommunication( function(err) {
      clearTimeout(connectTimeout);

      if (err) {
        setImmediate(function() {
          this.emit('error', err);
        }.bind(this));
      }
      else {
        setImmediate(function() {
          this.emit('ready');
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));

  // Reset the module to clear any possible comms issues
  this.resetModule();
}

util.inherits(Messenger, events.EventEmitter);

Messenger.prototype.resetModule = function() {
  this.resetPin.output().low();
  this.resetPin.high();
}

Messenger.prototype.verifyCommunication = function(callback) {
  this.execute(bgLib.api.systemHello, callback);
}

Messenger.prototype.startScanning = function(callback) {
  this.execute(bgLib.api.gapSetScanParameters, [75, 50, 0], function(err, response) {
    if (!err) {
      this.execute(bgLib.api.gapDiscover, [bgLib.GAPDiscoverMode.gap_discover_generic], function(err, response) {
        callback && callback(err, response.result);
        this.emit('scanStart', err, response.result);
      }.bind(this));
    }
    else {
      console.log("Error setting scan parameters: ", err);
    }

  }.bind(this));
}

Messenger.prototype.stopScanning = function(callback) {
  var self = this;
  this.execute(bgLib.api.gapEndProcedure, function(err, response) {
    callback && callback(err, response.result);
    self.emit('scanStop', err, response.result);
  });
}

Messenger.prototype.startAdvertising = function(callback) {
  this.execute(bgLib.api.gapSetMode, [bgLib.GAPDiscoverableModes.gap_general_discoverable, bgLib.GAPConnectableMode.gap_directed_connectable], callback);
}

Messenger.prototype.writeValue = function(handle, value, callback) {
  var self = this;
  this.execute(bgLib.api.attributesWrite, [handle, 0, value], function(err, response) {
    callback && callback(err, response);
    self.emit('valueWritten', err, response);
  });
}

Messenger.prototype.readValue = function(handle, callback) {
  var self = this;
  // Execute the read
  this.execute(bgLib.api.attributesRead, [handle, 0], function(err, response) {
    // Call callback with value
    callback && callback(err, response.value);
    // Emit event
    self.emit('valueRead', err, response.value);
  });
}
Messenger.prototype.connect = function(address, addressType, callback) {
  // params: address, address_type, conn_interval_min, conn_interval_max, timeout, latency
  // TODO: Make last four params configurable?
  this.execute(bgLib.api.gapConnectDirect, [address, address_type, 25, 50, 500, 8], callback);
}
Messenger.prototype.disconnect = function(connection, callback) {
  // params: address, address_type, conn_interval_min, conn_interval_max, timeout, latency
  // TODO: Make last four params configurable?
  this.execute(bgLib.api.connectionDisconnect, [connection], callback);
}

Messenger.prototype.getAddress = function(callback) {
  this.execute(bgLib.api.systemAddressGet, [], callback);
}

Messenger.prototype.whitelistAppend = function(address, callback) {
  this.execute(bgLib.api.systemWhitelistAppend, [address, 0], callback);
}
Messenger.prototype.clearWhitelist = function(callback) {
  this.execute(bgLib.api.systemWhiteListClear, [], callback);
}

Messenger.prototype.connectSelective = function(callback) {
  this.execute(bgLib.api.gapConnectSelective, [25, 50, 500, 8], callback);
}

Messenger.prototype.setAdvertisementData = function(advOrScan, data, callback) {
  this.execute(bgLib.api.gapSetAdvData, [advOrScan, data], callback);
}

Messenger.prototype.discoverAllServices = function(peripheral, callback) {
  this.execute(bgLib.api.attClientReadByGroupType, [peripheral.connection, 00001, 0xFFFF, [0x00, 0x28]], callback);
}
Messenger.prototype.discoverCharacteristics = function(peripheral, start, end, callback) {
  this.execute(bgLib.api.attClientFindInformation, [peripheral.connection, start, end], callback);
}

Messenger.prototype.updateRssi = function(peripheral, callback) {
  this.execute(bgLib.api.connectionGetRSSI, [peripheral.connection], callback);
}

Messenger.prototype.readRemoteHandle = function(peripheral, uuid, callback) {
  this.execute(bgLib.api.attClientReadByType, [peripheral.connection, 0x0001, 0xFFFF, [0xFF, 0xA6]], callback);
};
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
  bgLib.getPacket(command, params, function(err, packet) {

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

  this.popMatchingResponsePacket(commandPacket, function(err, packet) {

    if (err) return console.log(err);
    if (packet) {
      try {
        return packet.callback && packet.callback(new Error("Packet Timeout..."));
      }
      catch (e) { 
        console.log(e); 
      }
    }
  })
}

Messenger.prototype.popMatchingResponsePacket = function(parsedPacket, callback) {

  if (!parsedPacket) console.log("Yep, that shit is undefined");

  // Grab the first packet that matches the command and class
  var matchedPacket;
  // Iterating through packets waiting response
  for (var i in this.awaitingResponse) {
    // Grab the packet
    var packet = this.awaitingResponse[i]; 
    // If the class and ID are the same, we have a match
    if (packet && packet.cClass == parsedPacket.cClass
      && packet.cID == parsedPacket.cID) {

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

  if (DEBUG) console.log("Just received this data: ", data);

  var self = this;

  // Grab the one or more responses from the library
  var incomingPackets = bgLib.parseIncoming(data, function(err, parsedPackets) {
    // if (DEBUG) console.log("And that turned into ", parsedPackets.length, "packets")
    
    if (err){
      console.log(err);
      return;
    } 

    //For each response
    for (var i in parsedPackets) {
      var parsedPacket = parsedPackets[i];
      var cClass = parsedPacket.packet.cClass;
      var cID = parsedPacket.packet.cID;

      // console.log("Class: ", cClass, "ID: ", cID);

      // If it's an event, emit the event
      // Find the type of packet
            switch (parsedPacket.packet.mType & 0x80) {
                // It's an event
                case 0x80: 
                  if (parsedPacket.response) {
                    if (cClass == 0x07 && cID == 0x00) {
                      self.emit("hardwareIOPortStatusChange", parsedPacket.response);
                    }
                    else if (cClass == 0x06 && cID == 0x00) {
                      self.emit("discover", parsedPacket.response);
                    }
                    else if (cClass == 0x00 && cID == 0x00) {
                      self.emit("booted");
                    }
                    else if (cClass == 0x03 && cID == 0x00) {
                      self.emit("connectionStatus", parsedPacket.response);
                    }
                    else if (cClass == 0x03 && cID == 0x04) {
                      self.emit('disconnected', parsedPacket.response);
                    }
                    else if (cClass == 0x04 && cID == 0x00) {
                      self.emit('remoteHandleRead', parsedPacket.response);
                    }
                    else if (cClass == 0x04 && cID == 0x01) {
                      self.emit('completedProcedure', parsedPacket.response);
                    }
                    else if (cClass == 0x04 && cID == 0x02) {
                      self.emit('groupFound', parsedPacket.response);
                    }
                    else if (cClass == 0x04 && cID == 0x04) {
                      self.emit('findInformationFound', parsedPacket.response);
                    }
                    else if (cClass == 0x04 && cID == 0x05) {
                      self.emit('attributeValue', parsedPacket.response);
                    }
                  }
                    break;

                // It's a response
                case 0x00:
                    // Find the command that requested it
                    self.popMatchingResponsePacket(parsedPacket.packet, function(err, packet) {
                        // Call the original callback
                        if (packet && packet.callback) packet.callback(err, parsedPacket.response);

                    });
                    break;
                default:
                        console.log("Malformed packet returned...");
            }                
    }
  });
}

module.exports = Messenger;