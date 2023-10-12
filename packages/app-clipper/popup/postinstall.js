const fs = require('fs-extra');

const sourcePath = `${__dirname}/../../lib/randomClipperPort.js`;
const clipperUtilsPath = `${__dirname}/../../lib/clipperUtils.ts`;


// Mozilla insists on building the clipper from a tarball, not from the repository
// so we add this check and only copy the file if it's present. Normally it rarely
// changes anyway and it is committed to the repo.

if (fs.pathExistsSync(sourcePath)) {
	fs.copySync(sourcePath, `${__dirname}/src/randomClipperPort.js`);
}

if (fs.pathExistsSync(clipperUtilsPath)) {
	const content = fs.readFileSync(clipperUtilsPath, 'utf-8');
	// remove referenece to module.exports
	const contentWithoutKeywords = content.split('export ').join('');
	fs.writeFileSync(`${__dirname}/../content_scripts/clipperUtils.js`, contentWithoutKeywords);
}

// These files give warnings when loading the extension in Chrome, in dev mode
fs.removeSync(`${__dirname}/node_modules/public-encrypt/test/test_key.pem`);
fs.removeSync(`${__dirname}/node_modules/public-encrypt/test/test_rsa_pubkey.pem`);
fs.removeSync(`${__dirname}/node_modules/public-encrypt/test/test_rsa_privkey.pem`);
