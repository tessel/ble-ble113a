var tessel = require('tessel');
var bleLib = require('../');

console.log('1..1');

bleLib.use(tessel.port['A'], function(err, ble){
  ble.setAdvertisingData( new Buffer('020106070854657373656c'),function(addr){
    console.log('ok');
    process.exit();
  });
});

setTimeout( function(){
  console.log('not ok - callback not called');
  process.exit();
}, 4000);
