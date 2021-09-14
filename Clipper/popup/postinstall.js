const fs = require('fs-extra');

const sourcePath = `${__dirname}../../../ReactNativeClient/lib/randomClipperPort.js`;

// Mozilla insists on building the clipper from a tarball, not from the repository
// so we add this check and only copy the file if it's present. Normally it rarely
// changes anyway and it is committed to the repo.

if (fs.pathExistsSync(sourcePath)) {
	fs.copySync(sourcePath, `${__dirname}/../src/randomClipperPort.js`);
}

// These files give warnings when loading the extension in Chrome, in dev mode
fs.removeSync(`${__dirname}/node_modules/public-encrypt/test/test_key.pem`);
fs.removeSync(`${__dirname}/node_modules/public-encrypt/test/test_rsa_pubkey.pem`);
fs.removeSync(`${__dirname}/node_modules/public-encrypt/test/test_rsa_privkey.pem`);
