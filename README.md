#Bluetooth Low Energy
Driver for the ble-ble113 Tessel Bluetooth Low Energy module ([BlueGiga BLE113](http://www.mouser.com/ds/2/52/BLE113_Datasheet-224874.pdf)).

##Installation
```sh
npm install ble-ble113a
```
You can use module port A, B, or D. We'll be implementing software UART on port C in the near future.

##Examples
### Master - Subscribing to updates from a peripheral with known profile (example with bluetooth-enabled multimeter, mooshimeter).

```js
var tessel = require('tessel');
var blePort = tessel.port['a'];
var bleDriver = require('ble113a');

bluetooth = bleDriver.use(blePort, function(err) {
  if (err) {
    return console.log("Failed to connect", err);
  }
  else {
    // Connect to moosh
    connectToMoosh(function(moosh) {
      // Tell the meter to start reading, pass back char to read
      setMeterSettings(moosh, function(meterSample) {
        // Start reading that char
        startReadingMeter(meterSample);
      });
    });
  }
});

function startReadingMeter(meterSample) {

    meterSample.on('notification', function(value) {
      var voltage = 0;
      for (var i = 0; i < 3; i++) {
        voltage += value[3+i] << (i*8);
      }
      voltage = (0x1000000 - voltage) * (1.51292917e-04);

      console.log("Voltage", voltage);
    });

    console.log("Turning on async readings...");
    meterSample.startNotifications();
}

function setMeterSettings(mooshimeter, callback) {
  if (mooshimeter) {
    // Find the characteristic with meter settings
    console.log("Searching for characteristics...");
    mooshimeter.discoverCharacteristics(['ffa2', 'ffa6'], function(err, characteristics) {

      console.log("Characteristics Found.");
      var meterSample = characteristics[0];
      var meterSettings = characteristics[1];

      // Update meter settings struct to start reading...
      console.log("Turning on analog reads");
      meterSettings.write(new Buffer([3, 2, 0, 0, 0, 0, 0, 0, 23]), function(err, valueWritten) {
        console.log("Turned on!");
        callback && callback(meterSample);
      });
    });
  }
}

function connectToMoosh(callback) {

  bluetooth.startScanning({serviceUUIDs:['ffa0']});

  bluetooth.once('discover', function(moosh) {
    bluetooth.stopScanning(function(stopError) {
      moosh.connect(function(connectError) {
        callback && callback(moosh);
      })
    })
  });
}
```

### Peripheral - Updating multiple characteristics
```js
var tessel= require('tessel');
var blePort = tessel.port['a'];
var accelPort = tessel.port['b'];
var ambientPort = tessel.port['c'];

var ble;
var accel;
var ambient;

// Connect to BLE
ble = require('ble-ble113a').use(blePort, function(err) {
  // Connect to Accel
  accel = require('accel-mma84', function(err) {
    // Connect to ambient
    ambient = require('ambient-attx4', function(err) {
      // start adveristing to any listening masters
      ble.startAdvertising();
    });
  });
});

// Once a master connects
ble.on('ready', function(master) {
  // Start streaming light data
  ambient.on('light', function(lightValues) {
    // Save it to the first available characteristic
    ble.writeLocalValue(0, lightValues);
  });

  // Start streaming sound data
  ambient.on('sound', function(soundValues) {
    // Save it to the next available characteristic
    ble.writeLocalValue(1, soundValues);
  });

  // Start streaming accelerometer data
  accel.on('data', function(accelValues) {
    // Save it to the next available characteristic
    ble.writeLocalValue(2, accelValues);
  });
});

```
## API

## Bluetooth (Primary Controller)

### Master Commands

##### * `bluetooth.startScanning([options], callback(err))` Start searching for BLE peripherals (options dict is... optional).
```js
options =
{
  // Boolean of whether duplicate peripherals should be reported
  allowDuplicates:true/false,
  // An array of uuids that, if existing in advertising data, will cause peripheral to be reported as discovered
  serviceUUIDs:['ffa0']
}
```

##### * `bluetooth.stopScanning(callback(err))` Stop Searching for BLE peripherals

##### * `bluetooth.connect(peripheral, callback(err))`

##### * `bluetooth.disconnect(peripheral, callback(err)`

##### * `bluetooth.discoverServices(peripheral, [serviceUUIDs], callback(err, services))` Search for specific Services by passing in array of uuids. Returns array of Service objects

##### * `bluetooth.discoverAllServices(peripheral, callback(err, services))` Search for all Services of a peripheral. Returns array of Service objects.

##### * `bluetooth.discoverIncludedServices(periphreal, serviceUUID, callback(err, includedServices))` Find what services are included in this service, if any (pretty rare)

##### * `bluetooth.discoverCharacteristics(peripheral, [characteristicsUUIDs], callback(err, characteristics))` Search for specific Characteristics by passing in array of uuids. Returns array of Characteristic objects

##### * `bluetooth.discoverAllCharacteristics(peripheral, callback(err, characteristics))` Search for all Characteristics of a peripheral. Returns array of Characteristic objects

##### * `bluetooth.discoverAllServicesAndCharacteristics(peripheral, callback(err, results))` Return all services and characteristics of a peripheral.

##### * `bluetooth.discoverCharacteristicsOfService(service, [characteristicUUIDs], callback(err, characteristics))` Discover specific UUIDs of a service.

##### * `bluetooth.discoverAllCharacteristicsOfService(service, callback(err, characteristics))` Discover the characteristics of a specific service.

##### * `bluetooth.discoverDescriptorsOfCharacteristic(characteristic, callback(err, descriptors))` Discover the descriptors of a specific service.

##### * `bluetooth.discoverAllAttributes(peripheral, callback(err, attributes))` Read all the services, characteristics, and descriptors of a peripheral.

##### * `bluetooth.read(characteristic, callback(err, value))` Get the value of a remote characteristic.

##### * `bluetooth.write(characteristic, value, callback(err))` Write the value of a remote characteristic. Value should be a buffer.

##### * `bluetooth.readDescriptor(descriptor, callback(err, value))` Get the value of a remote descriptor.

##### * `bluetooth.writeDescriptor(descriptor, value callback(err))` Get the value of a remote descriptor.

##### * `bluetooth.startNotifications(characteristic, callback(err))` Subscribe to remote characteristic updates without having to indicate it was received.

##### * `bluetooth.stopNotifications(characteristic, callback(err))` Stop being notified about remote characteristic updates.

##### * `bluetooth.startIndications(characteristic, callback(err))` Subscribe to remote characteristic updates and indicate it was received.

##### * `bluetooth.stopIndications(characteristic, callback(err))` Stop receiving remote characteristic updates and indicate it was received.

##### * `bluetooth.updateRSSI(peripheral, callback(err, rssi))` Get signal strength of peripheral that we're connected to.

##### * `bluetooth.reset(callback(err))` Reset the module (useful in case of unexpected state).


### Master Events

##### * `bluetooth.on('error', callback(err))` Emitted on error.

##### * `bluetooth.on('scanStart', callback())`

##### * `bluetooth.on('scanStop', callback())`

##### * `bluetooth.on('discover', callback(peripheral))`

##### * `bluetooth.on('connect', callback(peripheral))`

##### * `bluetooth.on('disconnect', callback(peripheral, reason))`

##### * `bluetooth.on('servicesDiscover', callback(services))`

##### * `bluetooth.on('characteristicsDiscover', callback(characteristics))`

##### * `bluetooth.on('descriptorsDiscover', callback(descriptors))`

##### * `bluetooth.on('characteristicRead', callback(characteristicRead, valueRead))`

##### * `bluetooth.on('characteristicWrite', callback(characteristicWritten, valueWritten))`

##### * `bluetooth.on('descriptorRead', callback(descriptorRead, valueRead))`

##### * `bluetooth.on('descriptorWrite', callback(descriptorWritten, valueWritten))`

##### * `bluetooth.on('notification', callback(characteristic, valueUpdated))`

##### * `bluetooth.on('indication', callback(characteristic, valueUpdated))`

##### * `bluetooth.on('rssiUpdate', callback(peripheral, rssi))`


### Slave Commands

##### * `bluetooth.startAdvertising(callback(err))` Begin advertising to master devices.

##### * `bluetooth.stopAdvertising(callback(err))` Stop advertising.

##### * `bluetooth.setAdvertisingData(data, callback(err))` Set the data the master receives in advertising packet.

##### * `bluetooth.writeLocalValue(index, data, callback(err))` Write a local value to be read by a master.

##### * `bluetooth.readLocalValue(index, offset, callback(err, value))` Read local values that have been written. Offset is how many bytes in to read (reads in 32 byte chunks max).

##### * `bluetooth.sendReadResponse(connection, errorCode, value, callback(err))` If a master device requests to read a "user" attribute, you'll need to manually send it to them. This should be called after the "remoteReadRequest" event. If errorCode is zero, it will send the value, else it will send the error code back.

##### * `bluetooth.maxNumValues(callback(err, maxNumValues))` Get max number of values (V1.0.1 is 12).


### Slave Events

##### * `bluetooth.on('startAdvertising', callback())`

##### * `bluetooth.on('stopAdvertising', callback())`

##### * `bluetooth.on('connect', callback(connection))`

##### * `bluetooth.on('disconnect', callback(connection, reason))`

##### * `bluetooth.on('remoteWrite', callback(connection, index, valueWritten))`

##### * `bluetooth.on('remoteReadRequest', callback(connection, index))`

##### * `bluetooth.on('remoteNotification', callback(connection, index))`

##### * `bluetooth.on('remoteIndication', callback(connection, index))`

##### * `bluetooth.on('remoteUpdateStop', callback(connection, index))`

##### * `bluetooth.on('indicated', callback(connection, index))`


### Hardware

##### * `bleI2C = bluetooth.I2C(address)` Make a new I2C port on the BLE hardware.

##### * `bleI2C.transfer(txbuf, rxLen, callback(err, rxbuf))` Transfer data over I2C.

##### * `bleI2C.receive(len, callback(err, rxbuf))` Receive data over I2C.

##### * `bleI2C.send(txbuf, callback(err))` Send data over I2C.

##### * `var bleGPIO = bluetooth.gpio(pin)` Get one of the two GPIO ports (pin must be 'p0_2' or 'p0_3').

##### * `bleGPIO.direction` Configured as input or output.

##### * `bleGPIO.setInput(callback(err))` Set as an input.

##### * `bleGPIO.setOutput(initial, callback(err))` Set as an output with initial value.

##### * `bleGPIO.write(value, callback(err))` Write a value to the GPIO port.

##### * `bleGPIO.read(callback(err, value))` Read a value.

##### * `bleGPIO.watch(type, callback(err, time, type));` Watch one of the GPIOs for an interrupt.

##### * `bleGPIO.unwatch([type], callback())` Stop watching the interrupt.

##### * `bluetooth.readADC(callback(err, value))` Read the ADC.


### Security (Probably needs revision)

##### * `bluetooth.setBondable(peripheral, bondable, callback(err))` Set whether a peripheral can be bonded to (not sure if this pertains to master mode as well).

##### * `bluetooth.getBonds(callback(err, bonds))` Get bonds with current devices.

##### * `bluetooth.deleteBonds(peripheral, callback(err))` Delete any bonds with devices.

##### * `bluetooth.startEncryption(peripheral, callback(err))` Start the encryption process.

##### * `bluetooth.enterPasskey(peripheral, callback(err))` When a remote requests a passkey, you'll need to enter it.

##### * `bluetooth.setEncryptionKeySize(keysize, callback(err))` Set the size of the encryption key.

##### * `bluetooth.setOOBData(data, callback(err))` Set the out of band data.

##### * `bluetooth.enableMITMProtection(enable, callback(err))` Choose whether to enable or disable MITM protection.


### System

##### * `bluetooth.getBluetoothAddress(callback(err, address))` Get the current address of the device.

##### * `bluetooth.getMaxConnections(callback(err, maxConnections))` Get how many connections are supported by the module (currently at 4).

##### * `bluetooth.reset(callback(err))` Reset the module.


## Object Functions

### Peripheral Properties

##### * `peripheral.rssi`
##### * `peripheral.services`
##### * `peripheral.characteristics`
##### * `peripheral.advertisingData`
##### * `peripheral.address`
##### * `peripheral.connection`
##### * `peripheral.flags`

### Peripheral Commands

##### * `peripheral.connect(function(err))` Connect to a peripheral as a master

##### * `peripheral.disconnect(function(err))` Disconnected from a peripheral as a master

##### * `peripheral.updateRSSI(function(err, rssi))` Get the peripheral's signal strength

##### * `peripheral.discoverServices(uuids, function(err, services))` Discover a subset of the peripheral's services

##### * `peripheral.discoverAllServices(function(services))` Discover all the peripheral's services

##### * `peripheral.discoverAllServicesAndCharacteristics(uuids, function(err, results))` Discover all the services and characteristics of a peripheral

##### * `peripheral.discoverCharacteristics(uuids, function(err, characteristic))` Discover specific characteristics of a peripheral

##### * `peripheral.discoverAllAttributes(function(err, attributes))` Discover all services, characteristics, and descriptors

##### * `peripheral.deleteBond(function(err))` Delete bonding data from peripheral

##### * `peripheral.startEncryption(function(err))` Make connection encrypted with device

##### * `peripheral.enterPasskey(function(err))` Enter passkey for bonding

##### * `peripheral.toString()` Print out the peripheral's data


### Peripheral Events

##### * `peripheral.on('connect', callback())`

##### * `peripheral.on('disconnect', callback(reason))`

##### * `peripheral.on('servicesDiscover', callback(services))`

##### * `peripheral.on('characteristicsDiscover', callback(characteristics))`

##### * `peripheral.on('descriptorsDiscover', callback(descriptors))`

##### * `peripheral.on('characteristicRead', callback(characteristic, value))`

##### * `peripheral.on('characteristicWrite', callback(characteristic, value))`

##### * `peripheral.on('descriptorRead', callback(characteristic, value))`

##### * `peripheral.on('descriptorWrite', callback(characteristic, value))`

##### * `peripheral.on('notification', callback(characteristic, valueUpdated))`

##### * `peripheral.on('indication', callback(characteristic, valueUpdated))`

##### * `peripheral.on('rssiUpdate', callback(rssi))`


### Service Properties

##### * `service.uuid`
##### * `service.handle`
##### * `service.name`
##### * `service.type`
##### * `service.characteristics`
##### * `service.includedServices`

### Service Commands

##### * `service.discoverIncludedServices(callback(err, includedServices)) ` Discover what other sercices are included by this one

##### * `service.discoverAllCharacteristics(callback(err, characteristics))` Discover the characteristics in this service

##### * `service.discoverCharacteristics([characteristicUUIDs], callback(err, characteristics))`

##### * `service.toString()` Print out the service


### Service Events

##### * `service.on('discoverIncludedServices', callback(includedServices))`

##### * `service.on('characteristicsDiscover', callback(characteristics))`


### Characteristic Properties

##### * `characteristic.uuid`
##### * `characteristic.handle`
##### * `characteristic.name`
##### * `characteristic.type`
##### * `characteristic.descriptors`
##### * `characteristic.value`

### Characteristic Commands

##### * `characteristic.discoverAllDescriptors(callback(err, descriptors))` Gather all descriptors for a characteristic.

##### * `characteristic.read(callback(err, value))` Read the value of a characteristic.

##### * `characteristic.write(value, callback(err))` Write the value of a characteristic.

##### * `characteristic.startNotifications(callback(err, value))` Subscribe to async notifications.

##### * `characteristic.disableNotifications(listener, callback(err))` Unsubscribe to async notifications.

##### * `characteristic.startIndications(callback(err))` Subscribe to indications (same as notification except you must indicate received).

##### * `characteristic.stopIndications(callback(err))` Unsubscribe from indications.

##### * `characteristic.confirmIndication(callback(err))` Tell remote you received indication (same as notification except you must indicate received).

##### * `characteristic.toString()` Print out the characteristic.


### Characteristic Events

##### * `characteristic.on('characteristicRead', callback(valueRead))`

##### * `characteristic.on('characteristicWrite', callback(valueWritten))`

##### * `characteristic.on('discoverDescriptors', callback(descriptors))`

##### * `characteristic.on('notification', callback(data))`

##### * `characteristic.on('indication', callback(data))`


### Descriptor Properties

##### * `descriptor.uuid`
##### * `descriptor.handle`
##### * `descriptor.name`
##### * `descriptor.type`
##### * `descriptor.value`


### Descriptor Commands

##### * `descriptor.read(callback(err, value))` Read the value of a descriptor.

##### * `descriptor.write(value, callback(err))` Write the value of a descriptor.

##### * `descriptor.toString()` Print out the descriptor.


### Descriptor Events

##### * `descriptor.on('descriptorRead', callback(valueRead)`

##### * `descriptor.on('descriptorWrite', callback(valuewritten)`


## License

MIT
APACHE
