#!/usr/bin/env node


/*Demo :
* cock init appName
*/


var cmd = process.argv[2]

switch(cmd) {
    case "init" : 
        require("./init.js")(process.argv);
        break;
}
