// This is the initialization for the Electron RENDERER process

// Disable React message in console "Download the React DevTools for a better development experience"
// https://stackoverflow.com/questions/42196819/disable-hide-download-the-react-devtools#42196820
// eslint-disable-next-line no-undef, @typescript-eslint/no-explicit-any
(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
	supportsFiber: true,
	inject: function() {},
	onCommitFiberRoot: function() {},
	onCommitFiberUnmount: function() {},
};

import './utils/sourceMapSetup';
import app from './app';
import Folder from '@joplin/lib/models/Folder';
import Resource from '@joplin/lib/models/Resource';
import BaseItem from '@joplin/lib/models/BaseItem';
import Note from '@joplin/lib/models/Note';
import Tag from '@joplin/lib/models/Tag';
import NoteTag from '@joplin/lib/models/NoteTag';
import MasterKey from '@joplin/lib/models/MasterKey';
import Setting, { AppType } from '@joplin/lib/models/Setting';
import Revision from '@joplin/lib/models/Revision';
import Logger from '@joplin/utils/Logger';
import FsDriverNode from '@joplin/lib/fs-driver-node';
import bridge from './services/bridge';
import shim from '@joplin/lib/shim';
const { shimInit } = require('@joplin/lib/shim-init-node.js');
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import FileApiDriverLocal from '@joplin/lib/file-api-driver-local';
import * as React from 'react';
import nodeSqlite = require('sqlite3');
import initLib from '@joplin/lib/initLib';
import PerformanceLogger from '@joplin/lib/PerformanceLogger';
const pdfJs = require('pdfjs-dist');
const { isAppleSilicon } = require('is-apple-silicon');
require('@sentry/electron/renderer');

// Allows components to use React as a global
window.React = React;

const perfLogger = PerformanceLogger.create();


const main = async () => {
	// eslint-disable-next-line no-console
	console.info(`Environment: ${bridge().env()}`);

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

	Setting.setConstant('appId', bridge().appId());
	Setting.setConstant('appType', AppType.Desktop);
	Setting.setConstant('pluginAssetDir', `${__dirname}/pluginAssets`);

	// eslint-disable-next-line no-console
	console.info(`appId: ${Setting.value('appId')}`);
	// eslint-disable-next-line no-console
	console.info(`appType: ${Setting.value('appType')}`);

	let keytar;
	try {
		keytar = shim.platformSupportsKeyChain() ? require('keytar') : null;
	} catch (error) {
		console.error('Cannot load keytar - keychain support will be disabled', error);
		keytar = null;
	}

	function appVersion() {
		const p = require('./packageInfo.js');
		return p.version;
	}

	pdfJs.GlobalWorkerOptions.workerSrc = `${bridge().electronApp().buildDir()}/pdf.worker.min.js`;

	shimInit({
		keytar,
		React,
		appVersion,
		electronBridge: bridge(),
		nodeSqlite,
		pdfJs,
		isAppleSilicon,
	});

	const logger = new Logger();
	Logger.initializeGlobalLogger(logger);
	initLib(logger);

	const startResult = await app().start(bridge().processArgv());

	if (!startResult || !startResult.action) {
		require('./gui/Root');
	} else if (startResult.action === 'upgradeSyncTarget') {
		require('./gui/Root_UpgradeSyncTarget');
	}
};

perfLogger.track('main', main).catch((error) => {
	const env = bridge().env();
	console.error(error);

	let errorMessage;
	if (error.code === 'flagError') {
		errorMessage = error.message;
	} else {
		// If something goes wrong at this stage we don't have a console or a log file
		// so display the error in a message box.
		const msg = ['Fatal error:', error.message];
		if (error.fileName) msg.push(error.fileName);
		if (error.lineNumber) msg.push(error.lineNumber);
		if (error.stack) msg.push(error.stack);

		errorMessage = msg.join('\n\n');
	}

	// In dev, we give the option to leave the app open as debug statements in the
	// console can be useful
	const canIgnore = env === 'dev';
	void bridge().electronApp().handleAppFailure(errorMessage, canIgnore);
});

