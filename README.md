#Bluetooth Low Energy

##Under Development

The BLE Library is still under heavy development and most functionality isn't available but the functions outlined below work. There are two big hurdles we're working on to make this library work as intended:

 * The Tessel CLI is running into USB packet sending issues which limit it to code packets of about 12kB (sometimes it works up to ~16kB). The CLI will just hang on pushing. We're actively working on this one because it really sucks. 

 You will probably want to delete this README and the example folder from your local repo to save space.

 * The Runtime runs out of memory if a script is left running long enough. This should be a quick fix, so expect it soon.

You can add more functionality if you want to look at the [BlueGiga BLE113 Datasheet](http://www.bluegiga.com/en-US/products/bluetooth-4.0-modules/ble113-bluetooth--smart-module/documentation/). You'll have to make an account on their website.

This module uses the bglib npm module which is a node port of the BlueGiga API. It is also under heavy development. You will need to 
```
npm install
``` 
after cloning.	

If you are using Tessel V1 (should say TM-00-00 on the back), you should wire the module to the GPIO port because UART isn't routed to the module ports in that hardware revision. GPIO 3, 2, and 1 on GPIO port goes to GPIO 3, 2, and 1 on module, respectively. 


###Example
```
var tessel = require('tessel');

// Pick one of the two lines based on which version Tessel you have:
// Tessel V1 (should say TM-00-00 on back) must use GPIO port
var hardware = tessel.port('gpio');

// Tessel V2 (should say TM-00-02 on back) can use any port but C
var hardware = tessel.port('a')

var ble = require('../');

var bleController = ble.connect(hardware, function(err) {
	if (err) return console.log(err);

	// Use the device as a peripheral
	// bleController.startAdvertising();

	// Use the device as a master
	// bleController.scanForPeripherals()
});

bleController.on('discoveredPeripheral', function(peripheral) {
    console.log("Discovered a Peripheral!");
    console.log("RSSI: ", peripheral.rssi);
    console.log("Sender: ", peripheral.sender);
});
```

##Events

* "discoveredPeripheral"
* "connectedPeripheral"
* "disconnectedPeripheral"
* "connectionStatus" for when you connect to a peripheral or a master connects to you
* "completedProcedure" should be called after searching for peripheral handles 
* "readValue" should be called after reading the value of a handle
* "foundInformation" called when information about characteristics is found
* "booted"

##API
```
scanForPeripherals(callback);
stopScanning(callback);
startAdvertising(callback);
writeValue(value, callback); // Write the value to be read by a master (only 1 value available now, will increase to 64 soon)
connectToPeripheral(address, address_type, conn_interval_min, conn_interval_max, timeout, latency, next);
disconnectFromPeripheral(connection_handle, next);
findInformation(connection_handle, start_handle, end_handle, next); // Used to find services/characteristics used by peripheral
readRemoteHandle(connection_handle, attHandle, next); // Used to read a remote value being advertised by slave.
```

When used in Master mode, typically, you connect to a peripheral, call `findInformation` to get a list of available characteristics to read, then call `readRemoteHandle` with the handle returned from the foundInformation event.


Email jon@technical.io with any questions/concerns

