#!/usr/bin/env node

let init = require("./init.js");
let cmd = process.argv[2]

switch(cmd) {
    case "init" : 
        init(process.argv);
        break;
}

module.exports.init = init;