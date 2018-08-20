var util = require("util");
var fs = require("fs");
var path = require("path");
var fsCopy = require("./util/fsCopy.js")



module.exports = function (appName) {
    fsCopy.mkdir(appName);
    var templatePath = path.resolve(__dirname, "../template/0/webapp")
    fsCopy.copyDir(templatePath, appName);
    // fs.unlinkSync('/tmp/hello');
    
}