#Bluetooth Low Energy
Driver for the ble-ble113 Tessel Bluetooth Low Energy module ([BlueGiga BLE113](http://www.mouser.com/ds/2/52/BLE113_Datasheet-224874.pdf)).

##Under Development

The BLE Library is still under heavy development and most functionality isn't available but the functions outlined below work. __You will need to update your firmware to our [January 3 release](https://github.com/tessel/firmware/releases/tag/2014-01-03) (or later) in order to use this library__. That's because this is a relatively bulky code package and our old USB driver code didn't allocate enough memory.

You can add more functionality if you want to look at the [BlueGiga BLE113 Datasheet](http://www.bluegiga.com/en-US/products/bluetooth-4.0-modules/ble113-bluetooth--smart-module/documentation/). You'll have to make an account on their website.

##Installation
```sh
npm install ble-ble113a
```

If you are using Tessel V1 (should say TM-00-00 on the back), you should wire the module to the GPIO port because UART isn't routed to the module ports in that hardware revision. GPIO 3, 2, and 1 on GPIO port goes to GPIO 3, 2, and 1 on module, respectively. 

If you have Tessel V2 or later, you can use module port a, b, or d.

##Example
## API 

## Bluetooth (Primary Controller)

### Master Commands

```js
var tessel = require('tessel');
var bluetooth = require('ble-ble113a').use(tessel.port('a'));

// Start searching for BLE peripherals (options dict is... optional)
bluetooth.startScanning([options], function(err) {...} );
// allowed options are:
/*
options = 
{
  // Boolean of whether duplicate peripherals should be reported
  allowDuplicates:true/false,
  // An array of uuids that, if existing in advertising data, will cause peripheral to be reported as discovered
  serviceUUIDs:['ffa0']
}
*/
// Stop Searching for BLE peripherals
bluetooth.stopScanning( function(err) {...} );

bluetooth.connect( peripheral, function(err) {...} );

bluetooth.disconnect( peripheral, function(err) {..} );

// Search for specific Services by passing in array of uuids. Returns array of Service objects
bluetooth.discoverServices( peripheral, [serviceUUIDs], function(err, services) {...} );

// Search for all Services of a peripheral. Returns array of Service objects
bluetooth.discoverAllServices( peripheral, function(err, services) {...} );

// Find what services are included in this service, if any (pretty rare)
bluetooth.discoverIncludedServices( periphreal, serviceUUID, function(err, includedServices) {...} );

// Search for specific Characteristics by passing in array of uuids. Returns array of Characteristic objects
bluetooth.discoverCharacteristics( peripheral, [characteristicsUUIDs], function(err, characteristics) {...} );

// Search for all Characterisitcs of a peripheral. Returns array of Charateristic objects
bluetooth.discoverAllCharacteristics( peripheral, function(err, characteristics) {...} );

// Return all services and characteristics of a peripheral. Returns 
bluetooth.discoverAllServicesAndCharacteristics( peripheral, function(err, results) {...} );

// Discover specific UUIDs of a service
bluetooth.discoverCharacteristicsOfService( service, [characteristicUUIDs], function(err, characteristics) {...} );

// Discover the characteristics of a specific service
bluetooth.discoverAllCharacteristicsOfService( service, function(err, characteristics) {...} );

// Discover the descriptors of a specific service
bluetooth.discoverDescriptorsOfCharacteristic( characteristic, function(err, descriptors) {...} );

// Read all the services, characteristics, and descriptors of a peripheral
bluetooth.discoverAllAttributes( peripheral, function(err, attributes) {...} );

// Get the value of a remote characteristic
bluetooth.read( characteristic, function(err, value) {...} );

// Write the value of a remote characteristic. Value should be a buffer
bluetooth.write( characteristic, value, function(err) {...} );

// Get the value of a remote descriptor
bluetooth.readDescriptor( descriptor, function(err, value) {...} );

// Get the value of a remote descriptor
bluetooth.writeDescriptor( descriptor, value function(err) {...} );

// Subscribe to remote characteristic updates without having to indicate it was received
bluetooth.startNotifications( characteristic, function(err) {...} );

// stop being notified about remote characteristic updates
bluetooth.stopNotifications( characteristic, function(err) {...} );

// Subscribe to remote characteristic updates and indicate it was received
bluetooth.startIndications( characteristic, function(err) {...} );

// Stop receiving remote characteristic updates and indicate it was received
bluetooth.stopIndications( characteristic, function(err) {...} );

// Indicate that a notification was received (should always be called after receiving notification)
bluetooth.confirmIndication( characteristic, function(err) {...} );

// Get signal strength of peripheral that we're conneted to
bluetooth.updateRSSI( peripheral, function(err, rssi) {...} );

// Reset the module (useful in case of unexpected state)
bluetooth.reset( function(err) {...} );

```

### Master Events

```js
bluetooth.on( 'error', function(err) {...} );

bluetooth.on( 'scanStart', function() {...} );

bluetooth.on( 'scanStop', function() {...} );

bluetooth.on( 'discover', function(peripheral) {...} );

bluetooth.on( 'connect', function(peripheral) {...} );

bluetooth.on( 'disconnect', function(peripheral, reason) {...} );

bluetooth.on( 'servicesDiscover', function(services) {...} );

bluetooth.on( 'characteristicsDiscover', function(characteristics) {...} );

bluetooth.on( 'descriptorsDiscover', function(descriptors) {...} );

bluetooth.on( 'characteristicRead', function(characteristicRead, valueRead) {...} );

bluetooth.on( 'characteristicWrite', function(characteristicWritten, valueWritten) {...} );

bluetooth.on( 'descriptorRead', function(characteristicRead, valueRead) {...} );

bluetooth.on( 'descriptorWrite', function(characteristicWritten, valueWritten) {...} );

bluetooth.on( 'notification', function(characteristic, valueUpdated) {...} );

bluetooth.on( 'indication', function(characteristic, valueUpdated) {...} );

bluetooth.on( 'rssiUpdate', function(peripheral, rssi) {...} );
```

### Slave Commands

```js
// Begin advertising to master devices
bluetooth.startAdvertising( function(err) {...} );

// Stop advertising
bluetooth.stopAdvertising( function(err) {...} );

// Set the data the master receives in advertising packet
bluetooth.setAdvertisingData( data, function(err) {...} );

// Write a local value to be read by a master
bluetooth.writeLocalValue( index, data, function(err) {...} );

// Read local values that have been written. Offset is how many bytes in to read (reads in 32 byte chunks max)
bluetooth.readLocalValue( index, offset, function(err, value) {...} );

// If a master device requests to read a "user" attribute, you'll need to manually send it to them
// This should be called after the "remoteReadRequest" event. If errorCode is zero, it will send 
// the value, else it will send the errocode back
bluetooth.sendReadResponse( connection, errorCode, value, function(err) {...} );

// Get max number of values (V1.0.1 is 12)
bluetooth.maxNumValues( function(err, maxNumValues) {...} );

```
### Slave Events
```js
bluetooth.on( 'startAdvertising', function() {...} );

bluetooth.on( 'stopAdvertising', function() {...} );

bluetooth.on( 'connect', function(connection) {...} );

bluetooth.on( 'disconnect', function(connection, reason) {...} );

bluetooth.on( 'remoteWrite', function(connection, index, valueWritten) {...} );

bluetooth.on( 'remoteReadRequest', function(connection, index) {...} );

bluetooth.on( 'remoteNotification', function(index) {...} );

bluetooth.on( 'remoteIndication', function(index) {...} );

bluetooth.on( 'remoteUpdateStop', function(index) {...} );

```

### Hardware
```js

// Make a new I2C port on the BLE hardware
bleI2C = bluetooth.I2C( address );

// Transfer data over I2C
bleI2C.transfer( txbuf, rxLen, function(err, rxbuf) {...} );

// Receive data over I2C
bleI2C.receive( len, function(err, rxbuf) {...} );

// Send data over I2C
bleI2C.send( txbuf, function(err) {...} );

// Get one of the two GPIO ports (pin must be 'p0_2' or 'p0_3')
var bleGPIO = bluetooth.gpio( pin );

// Configured as input or output
bleGPIO.direction;

// Set as an input
bleGPIO.setInput( function(err) {...} );

// Set as an output with initial value
bleGPIO.setOutput( initial, function(err) {...} );

// Write a value to the gpio port
bleGPIO.write( value, function(err) {...} );

// Read a value 
bleGPIO.read( function(err, value) {...} );

// Watch one of the GPIOs for an interrupt
bleGPIO.watch( type, function(err, time, type) {...} );

// Stop watching the interrupt
bleGPIO.unwatch( [type], callback );

// Read the ADC
bluetooth.readADC( function(err, value) {...} );
```

### Security (Probably needs revision)

```js
// Set whether a peripheral can be bonded to (not sure if this pertains to master mode as well)
bluetooth.setBondable(peripheral, bondable, function(err) {...} );

// Get bonds with current devices
bluetooth.getBonds(function(err, bonds) {...} );

// Delete any bonds with devices
bluetooth.deleteBonds( peripheral, function(err) {...} );

// Start the encyrption process
bluetooth.startEncryption( peripheral, function(err) {...} );

// When a remote requests a passkey, you'll need to enter it
bluetooth.enterPasskey( peripheral, function(err) {...} );

// Set the size of the encryption key
bluetooth.setEncryptionKeySize( keysize, function(err) {...} );

// Set the out of band data
bluetooth.setOOBData( data, function(err) {...} );

// Choose whether to enable or disable MITM protection
bluetooth.enableMITMProtection( enable, function(err) {...} );
```

### System
```js
// Get the current address of the device
bluetooth.getBluetoothAddress( function(err, address) {...} );

// Get how many connections are supported by the module (currently at 4)
bluetooth.getMaxConnections(function(err, maxConnections) {...} );

// Reset the module
bluetooth.reset( function(err) {...} );
```

## Object Functions
### Peripheral Properties
```js
peripheral.rssi;
peripheral.services;
peripheral.characteristics;
peripheral.advertisingData;
peripheral.address;
peripheral.connection;
peripheral.flags;
```

### Peripheral Commands

```js
// Connect to a peripheral as a master
peripheral.connect( function(err) {...} );

// Disconnected from a peripheral as a master
peripheral.disconnect( function(err) {...} );

// Get the peripheral's signal strength
peripheral.updateRSSI( function(err, rssi) {...} );

// Discover a subset of the peripheral's services
peripheral.discoverServices( uuids, function(err, services) {...} );

// Discover all the peripheral's services
peripheral.discoverAllServices( function(services) {...} );

// Disocver all the services and characteristics of a peripheral
peripheral.discoverAllServicesAndCharacteristics( uuids, function(err, results) {...} );

// Discover specific characteristics of a peripheral
peripheral.discoverCharacteristics( uuids, function(err, characteristics) {..} );

// Discover all services, characteristics, and descriptors
peripheral.discoverAllAttributes( function(err, attributes) {...} );

// Delete bonding data from peripheral
peripheral.deleteBond( function(err) {...} );

// Make connection encrypted with device
peripheral.startEncryption( function(err) {...} );

// Enter passkey for bonding
peripheral.enterPasskey( function(err) {...} );

// print out the peripheral's data
peripheral.toString();

```

### Peripheral Events
```js

peripheral.on( 'connect', function() {...} );

peripheral.on( 'disconnect', function(reason) {...} );

peripheral.on( 'servicesDiscover', function(services) {...} );

peripheral.on( 'characteristicsDiscover', function(characteristics) {...} );

peripheral.on( 'descriptorsDiscover', function(descriptors) {...} );

peripheral.on( 'characteristicRead', function(characteristic, value) {...} );

peripheral.on( 'characteristicWrite', function(characteristic, value) {...} );

peripheral.on( 'descriptorRead', function(characteristic, value) {...} );

peripheral.on( 'descriptorWrite', function(characteristic, value) {...} );

peripheral.on( 'notification', function(characteristic, valueUpdated) {...} );

peripheral.on( 'indication', function(characteristic, valueUpdated) {...} );

peripheral.on( 'rssiUpdate', function(rssi) {...} );

```
### Service Properties
```js
service.uuid
service.handle
service.name
service.type
service.characteristics
service.includedServices
```
### Service Commands

```js
// Discover what other sercices are included by this one
service.discoverIncludedServices( function(err, includedServices) {...} ) ;

// Discover the characteristics in this service
service.discoverAllCharacteristics( function(err, characteristics) {...} );

service.discoverCharacteristics( [characteristicUUIDs], function(err, characteristics) {...} );

// Print out the service
service.toString();
```

### Service Events

```js

service.on( 'discoverIncludedServices', function(includedServices) {...} );

service.on( 'characteristicsDiscover', function(characteristics) {...} );
```

### Characteristic Properties
```js
characteristic.uuid
characteristic.handle
characteristic.name
characteristic.type
characteristic.descriptors
characteristic.lastReadValue
```
### Characteristic Commands
```js
// Gather all descriptors for a characteristic
characteristic.discoverAllDescriptors( function(err, descriptors) {...} );

// Read the value of a characteristic
characteristic.read( function(err, value) {...} );

// Write the value of a characteristic
characteristic.write( value, function(err) {...} );

// Subscribe to async notifications 
characteristic.startNotifications( function(err, value) {...} );

// Unsubscribe to async notifications 
characteristic.disableNotifications( listener, function(err) {...} );

// Subscribe to indications (same as notification except you must indicate received)
characteristic.startIndications( function(err) {...} );

// Unsubscribe from indications 
characteristic.stopIndications( function(err) {...} );

// Tell remote you received indication (same as notification except you must indicate received)
characterstic.confirmIndication(function(err) {...} );

// Print out the characteristic
characteristic.toString();
```

### Characteristic Events
```js

characteristic.on( 'characteristicRead', function(valueRead) {...} );

characteristic.on( 'characteristicWrite', function(valueWritten) {...} );

characteristic.on( 'discoverDescriptors', function(descriptors) {...} );

characteristic.on( 'notification', function(data) {...} );

characteristic.on( 'indication', function(data) {...} );
```
### Descriptor Properties
```js
descriptor.uuid
descriptor.handle
descriptor.name
descriptor.type
descriptor.value
```

### Descriptor Commands
```js
// Read the value of a descriptor
descriptor.read( function(err, value) {...} );

// Write the value of a descriptor
descriptor.write( value, function(err) {...} );

// Print out the descriptor
descriptor.toString();
```

### Descriptor Events
```js

descriptor.on('descriptorRead', function(valueRead) {...} );

descriptor.on('descriptorWrite', function(valuewritten) {...} );
```


Email jon@technical.io with any questions/concerns

## License

MIT
