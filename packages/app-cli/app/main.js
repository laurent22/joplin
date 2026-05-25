#!/usr/bin/env node

// Use njstrace to find out what Node.js might be spending time on
// var njstrace = njstrace_inject.inject();

import njstrace_inject from 'njstrace';
import sharp_8 from 'sharp';
import keytar_9 from 'keytar';
import readline_createInterface from 'readline';
import compareVersion from 'compare-version';
import app from './app';
import Folder from '@joplin/lib/models/Folder';
import Resource from '@joplin/lib/models/Resource';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import Tag from '@joplin/lib/models/Tag';
import NoteTag from '@joplin/lib/models/NoteTag';
import MasterKey from '@joplin/lib/models/MasterKey';
import Setting from '@joplin/lib/models/Setting';
import Revision from '@joplin/lib/models/Revision';
import Logger from '@joplin/utils/Logger';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import shimInitCli from './utils/shimInitCli';
import shim from '@joplin/lib/shim';
import { _ } from '@joplin/lib/locale';
import FileApiDriverLocal from '@joplin/lib/file-api-driver-local';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import envFromArgs from '@joplin/lib/envFromArgs';
import nodeSqlite from 'sqlite3';
import initLib from '@joplin/lib/initLib';
import p from './package.json';
const nodeVersion = process && process.versions && process.versions.node ? process.versions.node : '0.0.0';
if (compareVersion(nodeVersion, '10.0.0') < 0) {
	console.error(`Joplin requires Node 10+. Detected version ${nodeVersion}`);
	process.exit(1);
}


let sharp = null;
try {
	sharp = sharp_8;
} catch (error) {
	// Don't print an error or it will pollute stdout every time the app is started. A warning will
	// be printed in app.ts
}

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
	keytar = shim.platformSupportsKeyChain() ? keytar_9 : null;
} catch (error) {
	console.error('Cannot load keytar - keychain support will be disabled', error);
	keytar = null;
}

function appVersion() {
	return p.version;
}

shimInitCli({ sharp, keytar, appVersion, nodeSqlite });

const logger = new Logger();
Logger.initializeGlobalLogger(logger);
initLib(logger);

const application = app();

if (process.platform === 'win32') {
	const rl = readline_createInterface.createInterface({
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
