var tessel = require('tessel');
var bleLib = require('../');

var client = bleLib.use(tessel.port['A']);
var server = bleLib.use(tessel.port['D']);

var trans0_uuid = "883f1e6b76f64da187eb6bdbdb617888";
var trans1_uuid = "21819AB0C9374188B0DBB9621E1696CD";
var trans0_handle = 21;
var trans1_handle = 25;

var sAddress;

var pass0 = false;
var pass1 = false;

console.log('1..2');

client.on('ready', function(){
  client.startScanning();
  client.on('connect', function(peripheral){
    peripheral.discoverCharacteristics([trans0_uuid, trans1_uuid], function(err, characteristic){
      if (characteristic[0].handle == trans0_handle){
        client.notify(characteristic[0], true);
        characteristic[0].on('notification', function(data){
          if (characteristic[1].handle == trans1_handle) {
            characteristic[1].notify(true);
          } else {
            console.log('not ok - characteristic 1 not found.');
          }
        });
      } else {
        console.log('not ok - characteristic 0 not found.');
      }
    });
  });
  client.on('discover', function(peripheral){
    if (peripheral.address._str == sAddress){
      peripheral.connect();
    }
  });
});

server.on('ready', function(){
  server.getBluetoothAddress(function(err, address){
    sAddress = address;
  });
  server.startAdvertising();
  server.on('remoteNotification', function(conn, index){
    if (index == 0) {
      pass0 = true;
      server.writeLocalValue(0, new Buffer([0x00]));
      console.log('ok');
    }
    if (index == 1) {
      pass1 = true;
      console.log('ok');
      end();
    }
  });
});


function end(){
  client.reset();
  server.reset();
  if (!pass0 || !pass1) {
    console.log('not ok - missed notification or timeout');
  }
  setTimeout(process.exit, 100);
}

setTimeout(end, 60000);
