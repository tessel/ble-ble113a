#Bluetooth Low Energy
Driver for the ble-ble113 Tessel Bluetooth Low Energy module. The hardware documentation for this module can be found [here](https://github.com/tessel/hardware/blob/master/modules-overview.md#ble).

If you run into any issues you can ask for support on the [ble Module Forums](http://forums.tessel.io/category/ble).

###Installation
```sh
npm install ble-ble113a
```
You can use module port A, B, or D. We will be implementing software UART on port C in the near future.

###Examples
####Basic Example
```js
/*********************************************
This Bluetooth Low Energy module demo scans
for nearby BLE peripherals. Much more fun if
you have some BLE peripherals around.
*********************************************/

var tessel = require('tessel');
var blelib = require('ble-ble113a');

var ble = blelib.use(tessel.port['A']);

ble.on('ready', function(err) {
  console.log('Scanning...');
  ble.startScanning();
});

ble.on('discover', function(peripheral) {
  console.log("Discovered peripheral!", peripheral.toString());
});
```

####Master - Subscribing to updates from a peripheral with known profile (example with bluetooth-enabled multimeter, mooshimeter).

```js
var tessel = require('tessel');
var blePort = tessel.port['A'];
var bleDriver = require('ble-ble113a');

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

####Peripheral - Updating multiple characteristics
```js
var tessel = require('tessel');
var blePort = tessel.port['A'];
var accelPort = tessel.port['B'];
var ambientPort = tessel.port['C'];

var ble;
var accel;
var ambient;

// Connect to BLE
ble = require('ble-ble113a').use(blePort, function(err) {
  // Connect to Accel
  accel = require('accel-mma84').use(accelPort, function(err) {
    // Connect to ambient
    ambient = require('ambient-attx4').use(ambientPort, function(err) {
      // start adveristing to any listening masters
      ble.startAdvertising();
    });
  });
});

// Once a master connects
ble.on('connect', function(master) {
  // Start streaming light data
  ambient.on('light', function(lightValues) {
    // Save it to the first available characteristic
    ble.writeLocalValue(0, floatArrayToBuffer(lightValues));
  });

  // Start streaming sound data
  ambient.on('sound', function(soundValues) {
    // Save it to the next available characteristic
    ble.writeLocalValue(1, floatArrayToBuffer(soundValues));
  });

  // Start streaming accelerometer data
  accel.on('data', function(accelValues) {
    // Save it to the next available characteristic
    ble.writeLocalValue(2, floatArrayToBuffer(accelValues));
  });  
});

// Convert an array of floats to a Buffer
function floatArrayToBuffer(array){
  var buf = new Buffer(array.length*4);
  for (var i=0; i < array.length; i++){
    buf.writeFloatLE(array[i], i*4);
  }
  return buf;
}

```

###API
####Bluetooth (Primary Controller)
#####Master Commands
&#x20;<a href="#api-bluetooth-startScanning-options-callback-err-Start-searching-for-BLE-peripherals-options-dict-is-optional" name="api-bluetooth-startScanning-options-callback-err-Start-searching-for-BLE-peripherals-options-dict-is-optional">#</a> bluetooth<b>.startScanning</b>( [options], callback(err)) Start searching for BLE peripherals (options dict is\.\.\. optional ).  
```js
options =
{
  // Boolean of whether duplicate peripherals should be reported
  allowDuplicates:true/false,
  // An array of uuids that, if existing in advertising data, will cause peripheral to be reported as discovered
  serviceUUIDs:['ffa0']
}
```

&#x20;<a href="#api-bluetooth-stopScanning-callback-err-Stop-Searching-for-BLE-peripherals" name="api-bluetooth-stopScanning-callback-err-Stop-Searching-for-BLE-peripherals">#</a> bluetooth<b>.stopScanning</b>( callback(err) ) Stop Searching for BLE peripherals.  

&#x20;<a href="#api-bluetooth-connect-peripheral-callback-err" name="api-bluetooth-connect-peripheral-callback-err">#</a> bluetooth<b>.connect</b>( peripheral, callback(err) )  

&#x20;<a href="#api-bluetooth-disconnect-peripheral-callback-err" name="api-bluetooth-disconnect-peripheral-callback-err">#</a> bluetooth<b>.disconnect</b>( peripheral, callback(err )  

&#x20;<a href="#api-bluetooth-discoverServices-peripheral-serviceUUIDs-callback-err-services-Search-for-specific-Services-by-passing-in-array-of-uuids-Returns-array-of-Service-objects" name="api-bluetooth-discoverServices-peripheral-serviceUUIDs-callback-err-services-Search-for-specific-Services-by-passing-in-array-of-uuids-Returns-array-of-Service-objects">#</a> bluetooth<b>.discoverServices</b>( peripheral, [serviceUUIDs], callback(err, services) ) Search for specific Services by passing in array of uuids. Returns array of Service objects.

&#x20;<a href="#api-bluetooth-discoverAllServices-peripheral-callback-err-services-Search-for-all-Services-of-a-peripheral-Returns-array-of-Service-objects" name="api-bluetooth-discoverAllServices-peripheral-callback-err-services-Search-for-all-Services-of-a-peripheral-Returns-array-of-Service-objects">#</a> bluetooth<b>.discoverAllServices</b>( peripheral, callback(err, services) ) Search for all Services of a peripheral. Returns array of Service objects.  

&#x20;<a href="#api-bluetooth-discoverIncludedServices-periphreal-serviceUUID-callback-err-includedServices-Find-what-services-are-included-in-this-service-if-any-pretty-rare" name="api-bluetooth-discoverIncludedServices-periphreal-serviceUUID-callback-err-includedServices-Find-what-services-are-included-in-this-service-if-any-pretty-rare">#</a> bluetooth<b>.discoverIncludedServices</b>( periphreal, serviceUUID, callback(err, includedServices)) Find what services are included in this service, if any (pretty rare).  

&#x20;<a href="#api-bluetooth-discoverCharacteristics-peripheral-characteristicsUUIDs-callback-err-characteristics-Search-for-specific-Characteristics-by-passing-in-array-of-uuids-Returns-array-of-Characteristic-objects" name="api-bluetooth-discoverCharacteristics-peripheral-characteristicsUUIDs-callback-err-characteristics-Search-for-specific-Characteristics-by-passing-in-array-of-uuids-Returns-array-of-Characteristic-objects">#</a> bluetooth<b>.discoverCharacteristics</b>( peripheral, [characteristicsUUIDs], callback(err, characteristics) ) Search for specific Characteristics by passing in array of uuids. Returns array of Characteristic objects.  

&#x20;<a href="#api-bluetooth-discoverAllCharacteristics-peripheral-callback-err-characteristics-Search-for-all-Characteristics-of-a-peripheral-Returns-array-of-Characteristic-objects" name="api-bluetooth-discoverAllCharacteristics-peripheral-callback-err-characteristics-Search-for-all-Characteristics-of-a-peripheral-Returns-array-of-Characteristic-objects">#</a> bluetooth<b>.discoverAllCharacteristics</b>( peripheral, callback(err, characteristics) ) Search for all Characteristics of a peripheral. Returns array of Characteristic objects.  

&#x20;<a href="#api-bluetooth-discoverAllServicesAndCharacteristics-peripheral-callback-err-results-Return-all-services-and-characteristics-of-a-peripheral" name="api-bluetooth-discoverAllServicesAndCharacteristics-peripheral-callback-err-results-Return-all-services-and-characteristics-of-a-peripheral">#</a> bluetooth<b>.discoverAllServicesAndCharacteristics</b>( peripheral, callback(err, results) ) Return all services and characteristics of a peripheral.  

&#x20;<a href="#api-bluetooth-discoverCharacteristicsOfService-service-characteristicUUIDs-callback-err-characteristics-Discover-specific-UUIDs-of-a-service" name="api-bluetooth-discoverCharacteristicsOfService-service-characteristicUUIDs-callback-err-characteristics-Discover-specific-UUIDs-of-a-service">#</a> bluetooth<b>.discoverCharacteristicsOfService</b>( service, [characteristicUUIDs], callback(err, characteristics) ) Discover specific UUIDs of a service.  

&#x20;<a href="#api-bluetooth-discoverAllCharacteristicsOfService-service-callback-err-characteristics-Discover-the-characteristics-of-a-specific-service" name="api-bluetooth-discoverAllCharacteristicsOfService-service-callback-err-characteristics-Discover-the-characteristics-of-a-specific-service">#</a> bluetooth<b>.discoverAllCharacteristicsOfService</b>( service, callback(err, characteristics) ) Discover the characteristics of a specific service.  

&#x20;<a href="#api-bluetooth-discoverDescriptorsOfCharacteristic-characteristic-callback-err-descriptors-Discover-the-descriptors-of-a-specific-service" name="api-bluetooth-discoverDescriptorsOfCharacteristic-characteristic-callback-err-descriptors-Discover-the-descriptors-of-a-specific-service">#</a> bluetooth<b>.discoverDescriptorsOfCharacteristic</b>( characteristic, callback(err, descriptors) ) Discover the descriptors of a specific service.  

&#x20;<a href="#api-bluetooth-discoverAllAttributes-peripheral-callback-err-attributes-Read-all-the-services-characteristics-and-descriptors-of-a-peripheral" name="api-bluetooth-discoverAllAttributes-peripheral-callback-err-attributes-Read-all-the-services-characteristics-and-descriptors-of-a-peripheral">#</a> bluetooth<b>.discoverAllAttributes</b>( peripheral, callback(err, attributes) ) Read all the services, characteristics, and descriptors of a peripheral.  

&#x20;<a href="#api-bluetooth-read-characteristic-callback-err-value-Get-the-value-of-a-remote-characteristic" name="api-bluetooth-read-characteristic-callback-err-value-Get-the-value-of-a-remote-characteristic">#</a> bluetooth<b>.read</b>( characteristic, callback(err, value) ) Get the value of a remote characteristic.  

&#x20;<a href="#api-bluetooth-write-characteristic-value-callback-err-Write-the-value-of-a-remote-characteristic-Value-should-be-a-buffer" name="api-bluetooth-write-characteristic-value-callback-err-Write-the-value-of-a-remote-characteristic-Value-should-be-a-buffer">#</a> bluetooth<b>.write</b>( characteristic, value, callback(err) ) Write the value of a remote characteristic. Value should be a buffer.  

&#x20;<a href="#api-bluetooth-readDescriptor-descriptor-callback-err-value-Get-the-value-of-a-remote-descriptor" name="api-bluetooth-readDescriptor-descriptor-callback-err-value-Get-the-value-of-a-remote-descriptor">#</a> bluetooth<b>.readDescriptor</b>( descriptor, callback(err, value) ) Get the value of a remote descriptor.  

&#x20;<a href="#api-bluetooth-writeDescriptor-descriptor-value-callback-err-Get-the-value-of-a-remote-descriptor" name="api-bluetooth-writeDescriptor-descriptor-value-callback-err-Get-the-value-of-a-remote-descriptor">#</a> bluetooth<b>.writeDescriptor</b>( descriptor, value callback(err) ) Get the value of a remote descriptor.  

&#x20;<a href="#api-bluetooth-startNotifications-characteristic-callback-err-Subscribe-to-remote-characteristic-updates-without-having-to-indicate-it-was-received" name="api-bluetooth-startNotifications-characteristic-callback-err-Subscribe-to-remote-characteristic-updates-without-having-to-indicate-it-was-received">#</a> bluetooth<b>.startNotifications</b>( characteristic, callback(err) ) Subscribe to remote characteristic updates without having to indicate it was received.  

&#x20;<a href="#api-bluetooth-stopNotifications-characteristic-callback-err-Stop-being-notified-about-remote-characteristic-updates" name="api-bluetooth-stopNotifications-characteristic-callback-err-Stop-being-notified-about-remote-characteristic-updates">#</a> bluetooth<b>.stopNotifications</b>( characteristic, callback(err) ) Stop being notified about remote characteristic updates.  

&#x20;<a href="#api-bluetooth-startIndications-characteristic-callback-err-Subscribe-to-remote-characteristic-updates-and-indicate-it-was-received" name="api-bluetooth-startIndications-characteristic-callback-err-Subscribe-to-remote-characteristic-updates-and-indicate-it-was-received">#</a> bluetooth<b>.startIndications</b>( characteristic, callback(err) ) Subscribe to remote characteristic updates and indicate it was received.  

&#x20;<a href="#api-bluetooth-stopIndications-characteristic-callback-err-Stop-receiving-remote-characteristic-updates-and-indicate-it-was-received" name="api-bluetooth-stopIndications-characteristic-callback-err-Stop-receiving-remote-characteristic-updates-and-indicate-it-was-received">#</a> bluetooth<b>.stopIndications</b>( characteristic, callback(err) ) Stop receiving remote characteristic updates and indicate it was received.  

&#x20;<a href="#api-bluetooth-updateRSSI-peripheral-callback-err-rssi-Get-signal-strength-of-peripheral-that-we-re-connected-to" name="api-bluetooth-updateRSSI-peripheral-callback-err-rssi-Get-signal-strength-of-peripheral-that-we-re-connected-to">#</a> bluetooth<b>.updateRSSI</b>( peripheral, callback(err, rssi) ) Get signal strength of peripheral that we're connected to.  

&#x20;<a href="#api-bluetooth-reset-callback-err-Reset-the-module-useful-in-case-of-unexpected-state" name="api-bluetooth-reset-callback-err-Reset-the-module-useful-in-case-of-unexpected-state">#</a> bluetooth<b>.reset</b>( callback(err)) Reset the module (useful in case of unexpected state ).  

#####Master Events
&#x20;<a href="#api-bluetooth-on-error-callback-err-Emitted-on-error" name="api-bluetooth-on-error-callback-err-Emitted-on-error">#</a> bluetooth<b>.on</b>( 'error', callback(err) ) Emitted on error.  

&#x20;<a href="#api-bluetooth-on-scanStart-callback" name="api-bluetooth-on-scanStart-callback">#</a> bluetooth<b>.on</b>( 'scanStart', callback() )  

&#x20;<a href="#api-bluetooth-on-scanStop-callback" name="api-bluetooth-on-scanStop-callback">#</a> bluetooth<b>.on</b>( 'scanStop', callback() )  

&#x20;<a href="#api-bluetooth-on-discover-callback-peripheral" name="api-bluetooth-on-discover-callback-peripheral">#</a> bluetooth<b>.on</b>( 'discover', callback(peripheral) )  

&#x20;<a href="#api-bluetooth-on-connect-callback-peripheral" name="api-bluetooth-on-connect-callback-peripheral">#</a> bluetooth<b>.on</b>( 'connect', callback(peripheral) )  

&#x20;<a href="#api-bluetooth-on-disconnect-callback-peripheral-reason" name="api-bluetooth-on-disconnect-callback-peripheral-reason">#</a> bluetooth<b>.on</b>( 'disconnect', callback(peripheral, reason) )  

&#x20;<a href="#api-bluetooth-on-servicesDiscover-callback-services" name="api-bluetooth-on-servicesDiscover-callback-services">#</a> bluetooth<b>.on</b>( 'servicesDiscover', callback(services) )  

&#x20;<a href="#api-bluetooth-on-characteristicsDiscover-callback-characteristics" name="api-bluetooth-on-characteristicsDiscover-callback-characteristics">#</a> bluetooth<b>.on</b>( 'characteristicsDiscover', callback(characteristics) )  

&#x20;<a href="#api-bluetooth-on-descriptorsDiscover-callback-descriptors" name="api-bluetooth-on-descriptorsDiscover-callback-descriptors">#</a> bluetooth<b>.on</b>( 'descriptorsDiscover', callback(descriptors) )  

&#x20;<a href="#api-bluetooth-on-characteristicRead-callback-characteristicRead-valueRead" name="api-bluetooth-on-characteristicRead-callback-characteristicRead-valueRead">#</a> bluetooth<b>.on</b>( 'characteristicRead', callback(characteristicRead, valueRead) )  

&#x20;<a href="#api-bluetooth-on-characteristicWrite-callback-characteristicWritten-valueWritten" name="api-bluetooth-on-characteristicWrite-callback-characteristicWritten-valueWritten">#</a> bluetooth<b>.on</b>( 'characteristicWrite', callback(characteristicWritten, valueWritten) )  

&#x20;<a href="#api-bluetooth-on-descriptorRead-callback-descriptorRead-valueRead" name="api-bluetooth-on-descriptorRead-callback-descriptorRead-valueRead">#</a> bluetooth<b>.on</b>( 'descriptorRead', callback(descriptorRead, valueRead) )  

&#x20;<a href="#api-bluetooth-on-descriptorWrite-callback-descriptorWritten-valueWritten" name="api-bluetooth-on-descriptorWrite-callback-descriptorWritten-valueWritten">#</a> bluetooth<b>.on</b>( 'descriptorWrite', callback(descriptorWritten, valueWritten) )  

&#x20;<a href="#api-bluetooth-on-notification-callback-characteristic-valueUpdated" name="api-bluetooth-on-notification-callback-characteristic-valueUpdated">#</a> bluetooth<b>.on</b>( 'notification', callback(characteristic, valueUpdated) )  

&#x20;<a href="#api-bluetooth-on-indication-callback-characteristic-valueUpdated" name="api-bluetooth-on-indication-callback-characteristic-valueUpdated">#</a> bluetooth<b>.on</b>( 'indication', callback(characteristic, valueUpdated) )  

&#x20;<a href="#api-bluetooth-on-rssiUpdate-callback-peripheral-rssi" name="api-bluetooth-on-rssiUpdate-callback-peripheral-rssi">#</a> bluetooth<b>.on</b>( 'rssiUpdate', callback(peripheral, rssi) )  

#####Slave Commands
&#x20;<a href="#api-bluetooth-startAdvertising-callback-err-Start-advertising" name="api-bluetooth-startAdvertising-callback-err-Start-advertising">#</a> bluetooth.<b>startAdvertising</b>(callback(err)) Begin advertising to master devices.

&#x20;<a href="#api-bluetooth-stopAdvertising-callback-err-Stop-advertising" name="api-bluetooth-stopAdvertising-callback-err-Stop-advertising">#</a> bluetooth<b>.stopAdvertising</b>( callback(err) ) Stop advertising.  

&#x20;<a href="#api-bluetooth-setAdvertisingData-data-callback-err-Set-the-data-the-master-receives-in-advertising-packet" name="api-bluetooth-setAdvertisingData-data-callback-err-Set-the-data-the-master-receives-in-advertising-packet">#</a> bluetooth<b>.setAdvertisingData</b>( data, callback(err) ) Set the data the master receives in advertising packet.  

&#x20;<a href="#api-bluetooth-writeLocalValue-index-data-callback-err-Write-a-local-value-to-be-read-by-a-master" name="api-bluetooth-writeLocalValue-index-data-callback-err-Write-a-local-value-to-be-read-by-a-master">#</a> bluetooth<b>.writeLocalValue</b>( index, data, callback(err) ) Write a local value to be read by a master.  

&#x20;<a href="#api-bluetooth-readLocalValue-index-offset-callback-err-value-Read-local-values-that-have-been-written-Offset-is-how-many-bytes-in-to-read-reads-in-32-byte-chunks-max" name="api-bluetooth-readLocalValue-index-offset-callback-err-value-Read-local-values-that-have-been-written-Offset-is-how-many-bytes-in-to-read-reads-in-32-byte-chunks-max">#</a> bluetooth<b>.readLocalValue</b>( index, offset, callback(err, value)) Read local values that have been written\. Offset is how many bytes in to read (reads in 32 byte chunks max ).  

&#x20;<a href="#api-bluetooth-sendReadResponse-connection-errorCode-value-callback-err-If-a-master-device-requests-to-read-a-user-attribute-you-ll-need-to-manually-send-it-to-them-This-should-be-called-after-the-remoteReadRequest-event-If-errorCode-is-zero-it-will-send-the-value-else-it-will-send-the-error-code-back" name="api-bluetooth-sendReadResponse-connection-errorCode-value-callback-err-If-a-master-device-requests-to-read-a-user-attribute-you-ll-need-to-manually-send-it-to-them-This-should-be-called-after-the-remoteReadRequest-event-If-errorCode-is-zero-it-will-send-the-value-else-it-will-send-the-error-code-back">#</a> bluetooth<b>.sendReadResponse</b>( connection, errorCode, value, callback(err) ) If a master device requests to read a "user" attribute, you'll need to manually send it to them. This should be called after the "remoteReadRequest" event. If errorCode is zero, it will send the value, else it will send the error code back.  

&#x20;<a href="#api-bluetooth-maxNumValues-callback-err-maxNumValues-Get-max-number-of-values-V1-0-1-is-12" name="api-bluetooth-maxNumValues-callback-err-maxNumValues-Get-max-number-of-values-V1-0-1-is-12">#</a> bluetooth<b>.maxNumValues</b>( callback(err, maxNumValues)) Get max number of values (<i>V1\.0\.1</i>&nbsp; is 12 ).  

#####Slave Events
&#x20;<a href="#api-bluetooth-on-startAdvertising-callback" name="api-bluetooth-on-startAdvertising-callback">#</a> bluetooth<b>.on</b>( 'startAdvertising', callback() )  

&#x20;<a href="#api-bluetooth-on-stopAdvertising-callback" name="api-bluetooth-on-stopAdvertising-callback">#</a> bluetooth<b>.on</b>( 'stopAdvertising', callback() )  

&#x20;<a href="#api-bluetooth-on-connect-callback-connection" name="api-bluetooth-on-connect-callback-connection">#</a> bluetooth<b>.on</b>( 'connect', callback(connection) )  

&#x20;<a href="#api-bluetooth-on-disconnect-callback-connection-reason" name="api-bluetooth-on-disconnect-callback-connection-reason">#</a> bluetooth<b>.on</b>( 'disconnect', callback(connection, reason) )  

&#x20;<a href="#api-bluetooth-on-remoteWrite-callback-connection-index-valueWritten" name="api-bluetooth-on-remoteWrite-callback-connection-index-valueWritten">#</a> bluetooth<b>.on</b>( 'remoteWrite', callback(connection, index, valueWritten) )  

&#x20;<a href="#api-bluetooth-on-remoteReadRequest-callback-connection-index" name="api-bluetooth-on-remoteReadRequest-callback-connection-index">#</a> bluetooth<b>.on</b>( 'remoteReadRequest', callback(connection, index) )  

&#x20;<a href="#api-bluetooth-on-remoteNotification-callback-connection-index" name="api-bluetooth-on-remoteNotification-callback-connection-index">#</a> bluetooth<b>.on</b>( 'remoteNotification', callback(connection, index) )  

&#x20;<a href="#api-bluetooth-on-remoteIndication-callback-connection-index" name="api-bluetooth-on-remoteIndication-callback-connection-index">#</a> bluetooth<b>.on</b>( 'remoteIndication', callback(connection, index) )  

&#x20;<a href="#api-bluetooth-on-remoteUpdateStop-callback-connection-index" name="api-bluetooth-on-remoteUpdateStop-callback-connection-index">#</a> bluetooth<b>.on</b>( 'remoteUpdateStop', callback(connection, index) )  

&#x20;<a href="#api-bluetooth-on-indicated-callback-connection-index" name="api-bluetooth-on-indicated-callback-connection-index">#</a> bluetooth<b>.on</b>( 'indicated', callback(connection, index) )  

####Hardware
&#x20;<a href="#api-bleI2C-bluetooth-I2C-address-Make-a-new-I2C-port-on-the-BLE-hardware" name="api-bleI2C-bluetooth-I2C-address-Make-a-new-I2C-port-on-the-BLE-hardware">#</a> <b>bleI2C</b> = bluetooth.<b>I2C</b>( address ) Make a new I2C port on the BLE hardware.  

&#x20;<a href="#api-bleI2C-transfer-txbuf-rxLen-callback-err-rxbuf-Transfer-data-over-I2C" name="api-bleI2C-transfer-txbuf-rxLen-callback-err-rxbuf-Transfer-data-over-I2C">#</a> bleI2C<b>.transfer</b>( txbuf, rxLen, callback(err, rxbuf) ) Transfer data over I2C.  

&#x20;<a href="#api-bleI2C-receive-len-callback-err-rxbuf-Receive-data-over-I2C" name="api-bleI2C-receive-len-callback-err-rxbuf-Receive-data-over-I2C">#</a> bleI2C<b>.receive</b>( len, callback(err, rxbuf) ) Receive data over I2C.  

&#x20;<a href="#api-bleI2C-send-txbuf-callback-err-Send-data-over-I2C" name="api-bleI2C-send-txbuf-callback-err-Send-data-over-I2C">#</a> bleI2C<b>.send</b>( txbuf, callback(err) ) Send data over I2C.  

&#x20;<a href="#api-var-bleGPIO-bluetooth-gpio-pin-Get-one-of-the-two-GPIO-ports-pin-must-be-p0_2-or-p0_3" name="api-var-bleGPIO-bluetooth-gpio-pin-Get-one-of-the-two-GPIO-ports-pin-must-be-p0_2-or-p0_3">#</a> var <b>bleGPIO</b> = bluetooth.<b>gpio</b>( pin) Get one of the two GPIO ports (pin must be 'p0\_2' or 'p0\_3' ).  

&#x20;<a href="#api-bleGPIO-direction-Configured-as-input-or-output" name="api-bleGPIO-direction-Configured-as-input-or-output">#</a> bleGPIO.<b>direction</b> Configured as input or output.  

&#x20;<a href="#api-bleGPIO-setInput-callback-err-Set-as-an-input" name="api-bleGPIO-setInput-callback-err-Set-as-an-input">#</a> bleGPIO<b>.setInput</b>( callback(err) ) Set as an input.  

&#x20;<a href="#api-bleGPIO-setOutput-initial-callback-err-Set-as-an-output-with-initial-value" name="api-bleGPIO-setOutput-initial-callback-err-Set-as-an-output-with-initial-value">#</a> bleGPIO<b>.setOutput</b>( initial, callback(err) ) Set as an output with initial value.  

&#x20;<a href="#api-bleGPIO-write-value-callback-err-Write-a-value-to-the-GPIO-port" name="api-bleGPIO-write-value-callback-err-Write-a-value-to-the-GPIO-port">#</a> bleGPIO<b>.write</b>( value, callback(err) ) Write a value to the GPIO port.  

&#x20;<a href="#api-bleGPIO-read-callback-err-value-Read-a-value" name="api-bleGPIO-read-callback-err-value-Read-a-value">#</a> bleGPIO<b>.read</b>( callback(err, value) ) Read a value.  

&#x20;<a href="#api-bleGPIO-watch-type-callback-err-time-type-Watch-one-of-the-GPIOs-for-an-interrupt" name="api-bleGPIO-watch-type-callback-err-time-type-Watch-one-of-the-GPIOs-for-an-interrupt">#</a> bleGPIO<b>.watch</b>( type, callback(err, time, type) ) Watch one of the GPIOs for an interrupt.  

&#x20;<a href="#api-bleGPIO-unwatch-type-callback-Stop-watching-the-interrupt" name="api-bleGPIO-unwatch-type-callback-Stop-watching-the-interrupt">#</a> bleGPIO<b>.unwatch</b>( [type], callback() ) Stop watching the interrupt.  

&#x20;<a href="#api-bluetooth-readADC-callback-err-value-Read-the-ADC" name="api-bluetooth-readADC-callback-err-value-Read-the-ADC">#</a> bluetooth<b>.readADC</b>( callback(err, value) ) Read the ADC.  

####Security
&#x20;<a href="#api-bluetooth-setBondable-peripheral-bondable-callback-err-Set-whether-a-peripheral-can-be-bonded-to-not-sure-if-this-pertains-to-master-mode-as-well" name="api-bluetooth-setBondable-peripheral-bondable-callback-err-Set-whether-a-peripheral-can-be-bonded-to-not-sure-if-this-pertains-to-master-mode-as-well">#</a> bluetooth<b>.setBondable</b>( peripheral, bondable, callback(err)) Set whether a peripheral can be bonded to (not sure if this pertains to master mode as well ).  

&#x20;<a href="#api-bluetooth-getBonds-callback-err-bonds-Get-bonds-with-current-devices" name="api-bluetooth-getBonds-callback-err-bonds-Get-bonds-with-current-devices">#</a>bluetooth<b>.getBonds</b>( callback(err, bonds) ) Get bonds with current devices.  

&#x20;<a href="#api-bluetooth-deleteBonds-peripheral-callback-err-Delete-any-bonds-with-devices" name="api-bluetooth-deleteBonds-peripheral-callback-err-Delete-any-bonds-with-devices">#</a> bluetooth<b>.deleteBonds</b>( peripheral, callback(err) ) Delete any bonds with devices.  

&#x20;<a href="#api-bluetooth-startEncryption-peripheral-callback-err-Start-the-encryption-process" name="api-bluetooth-startEncryption-peripheral-callback-err-Start-the-encryption-process">#</a> bluetooth<b>.startEncryption</b>( peripheral, callback(err) ) Start the encryption process.  

&#x20;<a href="#api-bluetooth-enterPasskey-peripheral-callback-err-When-a-remote-requests-a-passkey-you-ll-need-to-enter-it" name="api-bluetooth-enterPasskey-peripheral-callback-err-When-a-remote-requests-a-passkey-you-ll-need-to-enter-it">#</a> bluetooth<b>.enterPasskey</b>( peripheral, callback(err) ) When a remote requests a passkey, you'll need to enter it.  

&#x20;<a href="#api-bluetooth-setEncryptionKeySize-keysize-callback-err-Set-the-size-of-the-encryption-key" name="api-bluetooth-setEncryptionKeySize-keysize-callback-err-Set-the-size-of-the-encryption-key">#</a> bluetooth<b>.setEncryptionKeySize</b>( keysize, callback(err) ) Set the size of the encryption key.  

&#x20;<a href="#api-bluetooth-setOOBData-data-callback-err-Set-the-out-of-band-data" name="api-bluetooth-setOOBData-data-callback-err-Set-the-out-of-band-data">#</a> bluetooth<b>.setOOBData</b>( data, callback(err) ) Set the out of band data.  

&#x20;<a href="#api-bluetooth-enableMITMProtection-enable-callback-err-Choose-whether-to-enable-or-disable-MITM-protection" name="api-bluetooth-enableMITMProtection-enable-callback-err-Choose-whether-to-enable-or-disable-MITM-protection">#</a> bluetooth<b>.enableMITMProtection</b>( enable, callback(err) ) Choose whether to enable or disable MITM protection.  

####System
&#x20;<a href="#api-bluetooth-getBluetoothAddress-callback-err-address-Get-the-current-address-of-the-device" name="api-bluetooth-getBluetoothAddress-callback-err-address-Get-the-current-address-of-the-device">#</a> bluetooth<b>.getBluetoothAddress</b>( callback(err, address) ) Get the current address of the device.  

&#x20;<a href="#api-bluetooth-getMaxConnections-callback-err-maxConnections-Get-how-many-connections-are-supported-by-the-module-currently-at-4" name="api-bluetooth-getMaxConnections-callback-err-maxConnections-Get-how-many-connections-are-supported-by-the-module-currently-at-4">#</a> bluetooth<b>.getMaxConnections</b>( callback(err, maxConnections)) Get how many connections are supported by the module (currently at 4 ).  

&#x20;<a href="#api-bluetooth-reset-callback-err-Reset-the-module" name="api-bluetooth-reset-callback-err-Reset-the-module">#</a> bluetooth<b>.reset</b>( callback(err) ) Reset the module.  

###Object Functions
####Peripheral Properties
&#x20;<a href="#api-peripheral-rssi" name="api-peripheral-rssi">#</a> peripheral<b>.rssi</b>  
&#x20;<a href="#api-peripheral-services" name="api-peripheral-services">#</a> peripheral<b>.services</b>  
&#x20;<a href="#api-peripheral-characteristics" name="api-peripheral-characteristics">#</a> peripheral<b>.characteristics</b>  
&#x20;<a href="#api-peripheral-advertisingData" name="api-peripheral-advertisingData">#</a> peripheral<b>.advertisingData</b>  
&#x20;<a href="#api-peripheral-address" name="api-peripheral-address">#</a> peripheral<b>.address</b>  
&#x20;<a href="#api-peripheral-connection" name="api-peripheral-connection">#</a> peripheral<b>.connection</b>  
&#x20;<a href="#api-peripheral-flags" name="api-peripheral-flags">#</a> peripheral<b>.flags</b>  

####Peripheral Commands
&#x20;<a href="#api-peripheral-connect-function-err-Connect-to-a-peripheral-as-a-master" name="api-peripheral-connect-function-err-Connect-to-a-peripheral-as-a-master">#</a> peripheral<b>.connect</b>( function(err) ) Connect to a peripheral as a master.  

&#x20;<a href="#api-peripheral-disconnect-function-err-Disconnected-from-a-peripheral-as-a-master" name="api-peripheral-disconnect-function-err-Disconnected-from-a-peripheral-as-a-master">#</a> peripheral<b>.disconnect</b>( function(err) ) Disconnected from a peripheral as a master.  

&#x20;<a href="#api-peripheral-updateRSSI-function-err-rssi-Get-the-peripheral-s-signal-strength" name="api-peripheral-updateRSSI-function-err-rssi-Get-the-peripheral-s-signal-strength">#</a> peripheral<b>.updateRSSI</b>( function(err, rssi) ) Get the peripheral's signal strength.  

&#x20;<a href="#api-peripheral-discoverServices-uuids-function-err-services-Discover-a-subset-of-the-peripheral-s-services" name="api-peripheral-discoverServices-uuids-function-err-services-Discover-a-subset-of-the-peripheral-s-services">#</a> peripheral<b>.discoverServices</b>( uuids, function(err, services) ) Discover a subset of the peripheral's services.  

&#x20;<a href="#api-peripheral-discoverAllServices-function-services-Discover-all-the-peripheral-s-services" name="api-peripheral-discoverAllServices-function-services-Discover-all-the-peripheral-s-services">#</a> peripheral<b>.discoverAllServices</b>( function(services) ) Discover all the peripheral's services.  

&#x20;<a href="#api-peripheral-discoverAllServicesAndCharacteristics-uuids-function-err-results-Discover-all-the-services-and-characteristics-of-a-peripheral" name="api-peripheral-discoverAllServicesAndCharacteristics-uuids-function-err-results-Discover-all-the-services-and-characteristics-of-a-peripheral">#</a> peripheral<b>.discoverAllServicesAndCharacteristics</b>( uuids, function(err, results) ) Discover all the services and characteristics of a peripheral.  

&#x20;<a href="#api-peripheral-discoverCharacteristics-uuids-function-err-characteristic-Discover-specific-characteristics-of-a-peripheral" name="api-peripheral-discoverCharacteristics-uuids-function-err-characteristic-Discover-specific-characteristics-of-a-peripheral">#</a> peripheral<b>.discoverCharacteristics</b>( uuids, function(err, characteristic) ) Discover specific characteristics of a peripheral.  

&#x20;<a href="#api-peripheral-discoverAllAttributes-function-err-attributes-Discover-all-services-characteristics-and-descriptors" name="api-peripheral-discoverAllAttributes-function-err-attributes-Discover-all-services-characteristics-and-descriptors">#</a> peripheral<b>.discoverAllAttributes</b>( function(err, attributes) ) Discover all services, characteristics, and descriptors.  

&#x20;<a href="#api-peripheral-deleteBond-function-err-Delete-bonding-data-from-peripheral" name="api-peripheral-deleteBond-function-err-Delete-bonding-data-from-peripheral">#</a> peripheral<b>.deleteBond</b>( function(err) ) Delete bonding data from peripheral.  

&#x20;<a href="#api-peripheral-startEncryption-function-err-Make-connection-encrypted-with-device" name="api-peripheral-startEncryption-function-err-Make-connection-encrypted-with-device">#</a> peripheral<b>.startEncryption</b>( function(err) ) Make connection encrypted with device.  

&#x20;<a href="#api-peripheral-enterPasskey-function-err-Enter-passkey-for-bonding" name="api-peripheral-enterPasskey-function-err-Enter-passkey-for-bonding">#</a> peripheral<b>.enterPasskey</b>( function(err) ) Enter passkey for bonding.  

&#x20;<a href="#api-peripheral-toString-Print-out-the-peripheral-s-data" name="api-peripheral-toString-Print-out-the-peripheral-s-data">#</a> peripheral<b>.toString</b>() Print out the peripheral's data.  

####Peripheral Events
&#x20;<a href="#api-peripheral-on-connect-callback" name="api-peripheral-on-connect-callback">#</a> peripheral<b>.on</b>( 'connect', callback() )  

&#x20;<a href="#api-peripheral-on-disconnect-callback-reason" name="api-peripheral-on-disconnect-callback-reason">#</a> peripheral<b>.on</b>( 'disconnect', callback(reason) )  

&#x20;<a href="#api-peripheral-on-servicesDiscover-callback-services" name="api-peripheral-on-servicesDiscover-callback-services">#</a> peripheral<b>.on</b>( 'servicesDiscover', callback(services) )  

&#x20;<a href="#api-peripheral-on-characteristicsDiscover-callback-characteristics" name="api-peripheral-on-characteristicsDiscover-callback-characteristics">#</a> peripheral<b>.on</b>( 'characteristicsDiscover', callback(characteristics) )  

&#x20;<a href="#api-peripheral-on-descriptorsDiscover-callback-descriptors" name="api-peripheral-on-descriptorsDiscover-callback-descriptors">#</a> peripheral<b>.on</b>( 'descriptorsDiscover', callback(descriptors) )  

&#x20;<a href="#api-peripheral-on-characteristicRead-callback-characteristic-value" name="api-peripheral-on-characteristicRead-callback-characteristic-value">#</a> peripheral<b>.on</b>( 'characteristicRead', callback(characteristic, value) )  

&#x20;<a href="#api-peripheral-on-characteristicWrite-callback-characteristic-value" name="api-peripheral-on-characteristicWrite-callback-characteristic-value">#</a> peripheral<b>.on</b>( 'characteristicWrite', callback(characteristic, value) )  

&#x20;<a href="#api-peripheral-on-descriptorRead-callback-characteristic-value" name="api-peripheral-on-descriptorRead-callback-characteristic-value">#</a> peripheral<b>.on</b>( 'descriptorRead', callback(characteristic, value) )  

&#x20;<a href="#api-peripheral-on-descriptorWrite-callback-characteristic-value" name="api-peripheral-on-descriptorWrite-callback-characteristic-value">#</a> peripheral<b>.on</b>( 'descriptorWrite', callback(characteristic, value) )  

&#x20;<a href="#api-peripheral-on-notification-callback-characteristic-valueUpdated" name="api-peripheral-on-notification-callback-characteristic-valueUpdated">#</a> peripheral<b>.on</b>( 'notification', callback(characteristic, valueUpdated) )  

&#x20;<a href="#api-peripheral-on-indication-callback-characteristic-valueUpdated" name="api-peripheral-on-indication-callback-characteristic-valueUpdated">#</a> peripheral<b>.on</b>( 'indication', callback(characteristic, valueUpdated) )  

&#x20;<a href="#api-peripheral-on-rssiUpdate-callback-rssi" name="api-peripheral-on-rssiUpdate-callback-rssi">#</a> peripheral<b>.on</b>( 'rssiUpdate', callback(rssi) )  

####Service Properties
&#x20;<a href="#api-service-uuid" name="api-service-uuid">#</a> service<b>.uuid</b>  
&#x20;<a href="#api-service-handle" name="api-service-handle">#</a> service<b>.handle</b>  
&#x20;<a href="#api-service-name" name="api-service-name">#</a> service<b>.name</b>  
&#x20;<a href="#api-service-type" name="api-service-type">#</a> service<b>.type</b>  
&#x20;<a href="#api-service-characteristics" name="api-service-characteristics">#</a> service<b>.characteristics</b>  
&#x20;<a href="#api-service-includedServices" name="api-service-includedServices">#</a> service<b>.includedServices</b>  

####Service Commands
&#x20;<a href="#api-service-discoverIncludedServices-callback-err-includedServices-Discover-what-other-sercices-are-included-by-this-one" name="api-service-discoverIncludedServices-callback-err-includedServices-Discover-what-other-sercices-are-included-by-this-one">#</a> service<b>.discoverIncludedServices</b>( callback(err, includedServices) ) Discover what other sercices are included by this one.  

&#x20;<a href="#api-service-discoverAllCharacteristics-callback-err-characteristics-Discover-the-characteristics-in-this-service" name="api-service-discoverAllCharacteristics-callback-err-characteristics-Discover-the-characteristics-in-this-service">#</a> service<b>.discoverAllCharacteristics</b>( callback(err, characteristics) ) Discover the characteristics in this service.  

&#x20;<a href="#api-service-discoverCharacteristics-characteristicUUIDs-callback-err-characteristics" name="api-service-discoverCharacteristics-characteristicUUIDs-callback-err-characteristics">#</a> service<b>.discoverCharacteristics</b>( [characteristicUUIDs], callback(err, characteristics) )  

&#x20;<a href="#api-service-toString-Print-out-the-service" name="api-service-toString-Print-out-the-service">#</a> service<b>.toString</b>() Print out the service.  


####Service Events
&#x20;<a href="#api-service-on-discoverIncludedServices-callback-includedServices" name="api-service-on-discoverIncludedServices-callback-includedServices">#</a> service<b>.on</b>( 'discoverIncludedServices', callback(includedServices) )  

&#x20;<a href="#api-service-on-characteristicsDiscover-callback-characteristics" name="api-service-on-characteristicsDiscover-callback-characteristics">#</a> service<b>.on</b>( 'characteristicsDiscover', callback(characteristics) )  

####Characteristic Properties
&#x20;<a href="#api-characteristic-uuid" name="api-characteristic-uuid">#</a> characteristic<b>.uuid</b>  
&#x20;<a href="#api-characteristic-handle" name="api-characteristic-handle">#</a> characteristic<b>.handle</b>  
&#x20;<a href="#api-characteristic-name" name="api-characteristic-name">#</a> characteristic<b>.name</b>  
&#x20;<a href="#api-characteristic-type" name="api-characteristic-type">#</a> characteristic<b>.type</b>  
&#x20;<a href="#api-characteristic-descriptors" name="api-characteristic-descriptors">#</a> characteristic<b>.descriptors</b>  
&#x20;<a href="#api-characteristic-value" name="api-characteristic-value">#</a> characteristic<b>.value</b>  

####Characteristic Commands
&#x20;<a href="#api-characteristic-discoverAllDescriptors-callback-err-descriptors-Gather-all-descriptors-for-a-characteristic" name="api-characteristic-discoverAllDescriptors-callback-err-descriptors-Gather-all-descriptors-for-a-characteristic">#</a> characteristic<b>.discoverAllDescriptors</b>( callback(err, descriptors) ) Gather all descriptors for a characteristic.  

&#x20;<a href="#api-characteristic-read-callback-err-value-Read-the-value-of-a-characteristic" name="api-characteristic-read-callback-err-value-Read-the-value-of-a-characteristic">#</a> characteristic<b>.read</b>( callback(err, value) ) Read the value of a characteristic.  

&#x20;<a href="#api-characteristic-write-value-callback-err-Write-the-value-of-a-characteristic" name="api-characteristic-write-value-callback-err-Write-the-value-of-a-characteristic">#</a> characteristic<b>.write</b>( value, callback(err) ) Write the value of a characteristic.  

&#x20;<a href="#api-characteristic-startNotifications-callback-err-value-Subscribe-to-async-notifications" name="api-characteristic-startNotifications-callback-err-value-Subscribe-to-async-notifications">#</a> characteristic<b>.startNotifications</b>( callback(err, value) ) Subscribe to async notifications.  

&#x20;<a href="#api-characteristic-disableNotifications-listener-callback-err-Unsubscribe-to-async-notifications" name="api-characteristic-disableNotifications-listener-callback-err-Unsubscribe-to-async-notifications">#</a> characteristic<b>.disableNotifications</b>( listener, callback(err) ) Unsubscribe to async notifications.  

&#x20;<a href="#api-characteristic-startIndications-callback-err-Subscribe-to-indications-same-as-notification-except-you-must-indicate-received" name="api-characteristic-startIndications-callback-err-Subscribe-to-indications-same-as-notification-except-you-must-indicate-received">#</a> characteristic<b>.startIndications</b>( callback(err)) Subscribe to indications (same as notification except you must indicate received ).  

&#x20;<a href="#api-characteristic-stopIndications-callback-err-Unsubscribe-from-indications" name="api-characteristic-stopIndications-callback-err-Unsubscribe-from-indications">#</a> characteristic<b>.stopIndications</b>( callback(err) ) Unsubscribe from indications.  

&#x20;<a href="#api-characteristic-confirmIndication-callback-err-Tell-remote-you-received-indication-same-as-notification-except-you-must-indicate-received" name="api-characteristic-confirmIndication-callback-err-Tell-remote-you-received-indication-same-as-notification-except-you-must-indicate-received">#</a> characteristic<b>.confirmIndication</b>( callback(err)) Tell remote you received indication (same as notification except you must indicate received ).  

&#x20;<a href="#api-characteristic-toString-Print-out-the-characteristic" name="api-characteristic-toString-Print-out-the-characteristic">#</a> characteristic<b>.toString</b>() Print out the characteristic.  

####Characteristic Events
&#x20;<a href="#api-characteristic-on-characteristicRead-callback-valueRead" name="api-characteristic-on-characteristicRead-callback-valueRead">#</a> characteristic<b>.on</b>( 'characteristicRead', callback(valueRead) )  

&#x20;<a href="#api-characteristic-on-characteristicWrite-callback-valueWritten" name="api-characteristic-on-characteristicWrite-callback-valueWritten">#</a> characteristic<b>.on</b>( 'characteristicWrite', callback(valueWritten) )  

&#x20;<a href="#api-characteristic-on-discoverDescriptors-callback-descriptors" name="api-characteristic-on-discoverDescriptors-callback-descriptors">#</a> characteristic<b>.on</b>( 'discoverDescriptors', callback(descriptors) )  

&#x20;<a href="#api-characteristic-on-notification-callback-data" name="api-characteristic-on-notification-callback-data">#</a> characteristic<b>.on</b>( 'notification', callback(data) )  

&#x20;<a href="#api-characteristic-on-indication-callback-data" name="api-characteristic-on-indication-callback-data">#</a> characteristic<b>.on</b>( 'indication', callback(data) )  

####Descriptor Properties
&#x20;<a href="#api-descriptor-uuid" name="api-descriptor-uuid">#</a> descriptor<b>.uuid</b>  
&#x20;<a href="#api-descriptor-handle" name="api-descriptor-handle">#</a> descriptor<b>.handle</b>  
&#x20;<a href="#api-descriptor-name" name="api-descriptor-name">#</a> descriptor<b>.name</b>  
&#x20;<a href="#api-descriptor-type" name="api-descriptor-type">#</a> descriptor<b>.type</b>  
&#x20;<a href="#api-descriptor-value" name="api-descriptor-value">#</a> descriptor<b>.value</b>  

####Descriptor Commands
&#x20;<a href="#api-descriptor-read-callback-err-value-Read-the-value-of-a-descriptor" name="api-descriptor-read-callback-err-value-Read-the-value-of-a-descriptor">#</a> descriptor<b>.read</b>( callback(err, value) ) Read the value of a descriptor.  

&#x20;<a href="#api-descriptor-write-value-callback-err-Write-the-value-of-a-descriptor" name="api-descriptor-write-value-callback-err-Write-the-value-of-a-descriptor">#</a> descriptor<b>.write</b>( value, callback(err) ) Write the value of a descriptor.  

&#x20;<a href="#api-descriptor-toString-Print-out-the-descriptor" name="api-descriptor-toString-Print-out-the-descriptor">#</a> descriptor<b>.toString</b>() Print out the descriptor.  

####Descriptor Events
&#x20;<a href="#api-descriptor-on-descriptorRead-callback-valueRead" name="api-descriptor-on-descriptorRead-callback-valueRead">#</a> descriptor<b>.on</b>( 'descriptorRead', callback(valueRead )  

&#x20;<a href="#api-descriptor-on-descriptorWrite-callback-valuewritten" name="api-descriptor-on-descriptorWrite-callback-valuewritten">#</a> descriptor<b>.on</b>( 'descriptorWrite', callback(valuewritten )  

###Gatt Profile
To access the  Tessel's full Gatt profile in JSON format, use the property exposed through the library or Bluetooth Controller object.

```js
var tessel = require('tessel');
var bleLib = require('ble-ble113a');
bleLib.profile; // GATT profile object exposed through the library.

var ble = bleLib.use(tessel.port['A']);
ble.profile; // The same profile object exposed through the Bluetooth Controller
```

###Further Examples  
* [ble Advertise](https://github.com/tessel/ble-ble113a/blob/master/examples/ble-advertise.js). This Bluetooth Low Energy module demo turns the module on, starts it advertising as a peripheral, and writes information when connected.

* [ble Scan](https://github.com/tessel/ble-ble113a/blob/master/examples/ble-scan.js). This Bluetooth Low Energy module demo scans for nearby BLE peripherals.

## License
MIT or Apache 2.0, at your option
