const fs = require('fs-extra');

fs.copySync(__dirname + '/../../../../ReactNativeClient/lib/randomClipperPort.js', __dirname + '/../src/randomClipperPort.js');
