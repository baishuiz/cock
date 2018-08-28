var server = require('./server/index');

var args = process.argv.slice(2);
var env = args[0] || process.env.NODE_ENV || '';

var config = null;
if (env === 'dev') {
  config = require('./config.json');
} else {
  config = require('/mnt/envfiles/mob.mycjia.client/config.json');
}

config.port = config.port || process.env.PORT;
server.start(config);

if (env === 'dev') {
  var debug = args[1];
  var watcher = require('./server/watcher');
  watcher.start(debug);
}
