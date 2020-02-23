const fs = require('fs-extra');

const sourcePath = `${__dirname}../../../ReactNativeClient/lib/randomClipperPort.js`;

// Mozilla insists on building the clipper from a tarball, not from the repository
// so we add this check and only copy the file if it's present. Normally it rarely
// changes anyway and it is committed to the repo.

if (fs.pathExistsSync(sourcePath)) {
	fs.copySync(sourcePath, `${__dirname}/../src/randomClipperPort.js`);
}
