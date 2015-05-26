var util = require("util");
var fs = require("fs");
var path = require("path");


var copyDir = function(src, dest) {
 	mkdir(dest);
	var files = fs.readdirSync(src);
	for(var i = 0; i < files.length; i++) {
		var current = fs.lstatSync(path.join(src, files[i]));
		if(current.isDirectory()) {
			copyDir(path.join(src, files[i]), path.join(dest, files[i]));
		} else if(current.isSymbolicLink()) {
			var symlink = fs.readlinkSync(path.join(src, files[i]));
			fs.symlinkSync(symlink, path.join(dest, files[i]));
		} else {
			copy(path.join(src, files[i]), path.join(dest, files[i]));
		}
	}
};

var copy = function(src, dest) {
	var oldFile = fs.createReadStream(src);
	var newFile = fs.createWriteStream(dest,{ flags: 'w'});
  	oldFile.pipe(newFile);
};

/*
var mkdir = function(path) {
        fs.exists(path, function (exists) {
        exists || fs.mkdir(path);
    });
}
*/

var mkdir = function(dir) {
	// making directory without exception if exists
	try {
		fs.mkdirSync(dir, 0755);
	} catch(e) {
		if(e.code != "EEXIST") {
			throw e;
		}
	}
};


module.exports = {
    mkdir: mkdir,
    copyDir : copyDir,
    copy:copy
}