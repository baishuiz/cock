var util = require("util");
var fs = require("fs");
var path = require("path");
var fsCopy = require("./util/fsCopy.js");



module.exports = function (appName) {
    if(fs.existsSync(appName)){
        fsCopy.mkdir(appName);
        var templatePath = path.resolve(__dirname, "../template/0");
        fsCopy.copyDir(templatePath, appName);
        // fs.unlinkSync('/tmp/hello');
    } else {
        console.warn("project folder" + [appName] + "is exists.")
    }
    
    
};