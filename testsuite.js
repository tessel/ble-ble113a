#!/usr/bin/env node

require('shelljs/global');

var port = process.env.BLE_PORT1 || 'A';
var cmd = './node_modules/.bin/tap -e "tessel run {} ' + port + '" test/*.js';

// execute
cd(__dirname)
process.exit(exec(cmd).code);
