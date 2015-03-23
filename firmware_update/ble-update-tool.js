var bleLib = require('../');
var tessel = require('tessel');
var portArg = process.argv[2]

if (portArg && !tessel.port[portArg]) {
  return console.log("Usage: tessel run ble-update-tool.js <PORT_NAME>");
}

var portName = portArg || "A";

var ble = bleLib.use(tessel.port[portName]);

ble.on('ready', function() {
  console.log('Connected to module. Beginning update process...');
  require('./update-lib/ble-dfu')(ble.messenger, function(err) {
    if (err) throw err;

    console.log("Finished updating!");
    process.exit(1);
  })
})