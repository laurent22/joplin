#!/usr/bin/env node

// Use njstrace to find out what Node.js might be spending time on
// var njstrace = require('njstrace').inject();

const compareVersion = require('compare-version');
const nodeVersion = process && process.versions && process.versions.node ? process.versions.node : '0.0.0';
if (compareVersion(nodeVersion, '10.0.0') < 0) {
	console.error(`Joplin requires Node 10+. Detected version ${nodeVersion}`);
	process.exit(1);
}

const app = require('./app').default;
const Folder = require('@joplin/lib/models/Folder').default;
const Resource = require('@joplin/lib/models/Resource').default;
const BaseItem = require('@joplin/lib/models/BaseItem').default;
const Note = require('@joplin/lib/models/Note').default;
const Tag = require('@joplin/lib/models/Tag').default;
const NoteTag = require('@joplin/lib/models/NoteTag').default;
const MasterKey = require('@joplin/lib/models/MasterKey').default;
const Setting = require('@joplin/lib/models/Setting').default;
const Revision = require('@joplin/lib/models/Revision').default;
const Logger = require('@joplin/utils/Logger').default;
const FsDriverNode = require('@joplin/lib/fs-driver-node').default;
const sharp = require('sharp');
const { shimInit } = require('@joplin/lib/shim-init-node.js');
const shim = require('@joplin/lib/shim').default;
const { _ } = require('@joplin/lib/locale');
const FileApiDriverLocal = require('@joplin/lib/file-api-driver-local').default;
const EncryptionService = require('@joplin/lib/services/e2ee/EncryptionService').default;
const envFromArgs = require('@joplin/lib/envFromArgs');
const nodeSqlite = require('sqlite3');
const initLib = require('@joplin/lib/initLib').default;

const env = envFromArgs(process.argv);

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
BaseItem.loadClass('Revision', Revision);

Setting.setConstant('appId', `net.cozic.joplin${env === 'dev' ? 'dev' : ''}-cli`);
Setting.setConstant('appType', 'cli');

let keytar;
try {
	keytar = shim.platformSupportsKeyChain() ? require('keytar') : null;
} catch (error) {
	console.error('Cannot load keytar - keychain support will be disabled', error);
	keytar = null;
}

function appVersion() {
	const p = require('./package.json');
	return p.version;
}

shimInit({ sharp, keytar, appVersion, nodeSqlite });

const logger = new Logger();
Logger.initializeGlobalLogger(logger);
initLib(logger);

const application = app();

if (process.platform === 'win32') {
	const rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.on('SIGINT', () => {
		process.emit('SIGINT');
	});
}

process.stdout.on('error', (error) => {
	// https://stackoverflow.com/questions/12329816/error-write-epipe-when-piping-node-output-to-head#15884508
	if (error.code === 'EPIPE') {
		process.exit(0);
	}
});

application.start(process.argv).catch(error => {
	if (error.code === 'flagError') {
		console.error(error.message);
		console.error(_('Type `joplin help` for usage information.'));
	} else {
		console.error(_('Fatal error:'));
		console.error(error);
	}

	process.exit(1);
});
