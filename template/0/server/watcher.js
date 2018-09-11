var chokidar = require('chokidar');

var childProcess = require('child_process');
var fs = require('fs');
var isDebug = false;

var runCommand = function (cmd, callback) {
  console.log('run: ' + cmd);
  childProcess.exec(cmd, function (error) {
    if (error !== null) {
      console.log('exec error: ' + error);
      process.exit(1);
    } else {
      callback && callback ();
    }
  });
}

function build (){
  var curCruntCmd = 'cpack' + (isDebug ? ' debug fat' : '');
  fs.stat(__dirname + '/../node_modules', function (error) {
    if (error) {
      runCommand('npm install', function () {
        runCommand(curCruntCmd);
      });
    } else {
      runCommand(curCruntCmd);
    }
  });
}

function startWatch (debug) {
  isDebug = debug === 'debug';
  console.log('Start watch file change');
  var watcher = chokidar.watch(['./webapp'], {
    ignored: ['webapp/node_modules', 'webapp/dest', 'webapp/hybrid*', /webapp\/npm\-debug.log/, /[\/\\]\./],
    ignoreInitial: true
  });
  watcher.on('all', function(event, path) {
    console.log(event, path);
    build();
  });
  build();
}

exports.start = startWatch;
