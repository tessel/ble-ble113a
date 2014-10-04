var tessel = require('tessel');
var blePort = tessel.port['A'];
var bleLib = require('../');
 
var ble = bleLib.use(blePort, function(err) {
  if (err) return console.log("Error connecting to slave", err);
 
  ble.setAdvertisingData(createIBeaconAdvertisementPacket(0, 0), function (e2){
    if (e2) console.log("Error setting advertisement packet", e2);
    // start adveristing to any listening masters
    ble.startAdvertising(function(e3) {
      if (e3) return console.log("Err starting to advertise", e3);
      console.log('waiting to be discovered...');
    });
  });
});

// Major is usually meant to differentiate discrete locations (store A, store B)
// Minor is meant to differentiate microlocations within a discrete location (corners of a store)
function createIBeaconAdvertisementPacket(major, minor, peripheral) {
  // LE General Discovery, Single Mode Device
  var flags = new Buffer([0x02, 0x01, 0x06]);
  // Manufacturer data
  var manufacturerData = new Buffer([0x1a, 0xff]);
  // Preamble
  var preamble = new Buffer([0x4c, 0x00, 0x02, 0x15]);
  // Apple AirLocate Service UUID
  var airLocate = new Buffer([0xe2, 0xc5, 0x6d, 0xb5, 0xdf, 0xfb, 0x48, 0xd2, 0xb0, 0x60, 0xd0, 0xf5, 0xa7, 0x10, 0x96, 0xe0]);

  var majorBuf = new Buffer(2);
  majorBuf.writeUInt16BE(major, 0);

  var minorBuf = new Buffer(2);
  minorBuf.writeUInt16BE(minor, 0);

  // Measured signal strength
  var signalStrength = 0xc6
  if (peripheral) {
    signalStrength = peripheral.rssi;
  }

  return Buffer.concat([flags, manufacturerData, preamble, airLocate, majorBuf, minorBuf, new Buffer([signalStrength])]);
}