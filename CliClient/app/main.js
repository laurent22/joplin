#!/usr/bin/env node

// Make it possible to require("/lib/...") without specifying full path
require('app-module-path').addPath(__dirname);

const compareVersion = require('compare-version');
const nodeVersion = process && process.versions && process.versions.node ? process.versions.node : '0.0.0';
if (compareVersion(nodeVersion, '8.0.0') < 0) {
	console.error('Joplin requires Node 8+. Detected version ' + nodeVersion);
	process.exit(1);
}

const { app } = require('./app.js');
const Folder = require('lib/models/Folder.js');
const Resource = require('lib/models/Resource.js');
const BaseItem = require('lib/models/BaseItem.js');
const Note = require('lib/models/Note.js');
const Tag = require('lib/models/Tag.js');
const NoteTag = require('lib/models/NoteTag.js');
const MasterKey = require('lib/models/MasterKey');
const Setting = require('lib/models/Setting.js');
const { Logger } = require('lib/logger.js');
const { FsDriverNode } = require('lib/fs-driver-node.js');
const { shimInit } = require('lib/shim-init-node.js');
const { _ } = require('lib/locale.js');
const { FileApiDriverLocal } = require('lib/file-api-driver-local.js');
const EncryptionService = require('lib/services/EncryptionService');

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;
EncryptionService.fsDriver_ = fsDriver;
FileApiDriverLocal.fsDriver_ = fsDriver;

// That's not good, but it's to avoid circular dependency issues
// in the BaseItem class.
BaseItem.loadClass('Note', Note);
BaseItem.loadClass('Folder', Folder);
BaseItem.loadClass('Resource', Resource);
BaseItem.loadClass('Tag', Tag);
BaseItem.loadClass('NoteTag', NoteTag);
BaseItem.loadClass('MasterKey', MasterKey);

Setting.setConstant('appId', 'net.cozic.joplin-cli');
Setting.setConstant('appType', 'cli');

shimInit();

const application = app();

if (process.platform === "win32") {
	var rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on("SIGINT", function () {
		process.emit("SIGINT");
	});
}

process.stdout.on('error', function( err ) {
	// https://stackoverflow.com/questions/12329816/error-write-epipe-when-piping-node-output-to-head#15884508
	if (err.code == "EPIPE") {
		process.exit(0);
	}
});





// async function main() {
// 	const WebDavApi = require('lib/WebDavApi');
// 	const api = new WebDavApi('http://nextcloud.local/remote.php/dav/files/admin/Joplin', { username: 'admin', password: '1234567' });
// 	const { FileApiDriverWebDav } = new require('lib/file-api-driver-webdav');
// 	const driver = new FileApiDriverWebDav(api);

// 	const stat = await driver.stat('');
// 	console.info(stat);

// 	// const stat = await driver.stat('testing.txt');
// 	// console.info(stat);


// 	// const content = await driver.get('testing.txta');
// 	// console.info(content);

// 	// const content = await driver.get('testing.txta', { target: 'file', path: '/var/www/joplin/CliClient/testing-file.txt' });
// 	// console.info(content);

// 	// const content = await driver.mkdir('newdir5');
// 	// console.info(content);

// 	//await driver.put('myfile4.md', 'this is my content');

// 	// await driver.put('testimg.jpg', null, { source: 'file', path: '/mnt/d/test.jpg' });

// 	// await driver.delete('myfile4.md');

// 	// const deltaResult = await driver.delta('', {
// 	// 	allItemIdsHandler: () => { return []; }
// 	// });
// 	// console.info(deltaResult);
// }

// main().catch((error) => { console.error(error); });








application.start(process.argv).catch((error) => {
	console.error(_('Fatal error:'));
	console.error(error);
});