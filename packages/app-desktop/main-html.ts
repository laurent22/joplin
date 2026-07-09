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
import './utils/initReact';
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
import { shimInit } from '@joplin/lib/shim-init-node';
import type PdfJs from '@joplin/lib/utils/types/pdfJs';
import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import FileApiDriverLocal from '@joplin/lib/file-api-driver-local';
import * as React from 'react';
import * as path from 'path';
import { loadDesktopSqliteModuleAfterProbe, probeDesktopSqlCipherCapability } from './services/encryptedProfile/loadDesktopSqliteModule';
import { resolveDesktopProfilePaths } from './services/encryptedProfile/resolveProfileDir';
import { decideEncryptedProfileStartupAction } from '@joplin/lib/services/encryptedProfile/EncryptedProfileService';
import renderEncryptedProfileUnlockScreen from './gui/Root_EncryptedProfileUnlock';
import renderEncryptedProfileBackupPromptScreen from './gui/Root_EncryptedProfileBackupPrompt';
import renderEncryptedProfileMigrationFailedScreen from './gui/Root_EncryptedProfileMigrationFailed';
import { runPendingEncryptedProfileMigration } from './services/encryptedProfile/encryptExistingProfileDatabase';
import { profileHasPlaintextMigrationBackup } from './services/encryptedProfile/deletePlaintextMigrationBackup';
import { setRuntimeDatabaseKeyHex } from './services/encryptedProfile/runtimeDatabaseKey';
import formatEncryptedProfileMigrationError from '@joplin/lib/services/encryptedProfile/migrationErrors';
import { _ } from '@joplin/lib/locale';
import sqliteVec = require('sqlite-vec');
import initLib from '@joplin/lib/initLib';
import PerformanceLogger from '@joplin/lib/PerformanceLogger';
import * as pdfJs from 'pdfjs-dist';
import { isAppleSilicon } from 'is-apple-silicon';
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

	// onnxruntime-node loads a native binding at require time. Wrap it so a missing or broken
	// prebuilt degrades to "embeddings unavailable" rather than crashing the whole app at startup.
	//
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- onnxruntime-node has its own typings; we only need to forward the loaded module to the shim
	let onnxRuntime: any = null;
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- guarded require avoids a top-level import that would crash on a missing native binding
		onnxRuntime = require('onnxruntime-node');
	} catch (error) {
		// eslint-disable-next-line no-console -- main-html runs before the logger is initialised below
		console.warn('onnxruntime-node failed to load; AI embeddings will be unavailable:', (error as Error).message);
	}

	// sqlite-vec's wrapper resolves the native extension path via require.resolve,
	// which inside a packaged Electron app returns a path inside app.asar — but
	// dlopen(3) can't read out of asar archives. The per-platform packages are
	// listed in asarUnpack so the real file lives in app.asar.unpacked/, but the
	// wrapper doesn't know that. Rewrite the path here so loadExtension() points
	// at the unpacked copy.
	const sqliteVecUnpacked = {
		...sqliteVec,
		getLoadablePath: () => sqliteVec.getLoadablePath().replace(`${path.sep}app.asar${path.sep}`, `${path.sep}app.asar.unpacked${path.sep}`),
	};

	const sqlCipherProbe = await probeDesktopSqlCipherCapability();
	const nodeSqlite = await loadDesktopSqliteModuleAfterProbe();

	shimInit({
		keytar,
		React,
		appVersion,
		electronBridge: bridge(),
		nodeSqlite,
		sqliteVec: sqliteVecUnpacked,
		onnxRuntime,
		pdfJs: pdfJs as PdfJs,
		isAppleSilicon,
	});

	const logger = new Logger();
	Logger.initializeGlobalLogger(logger);
	initLib(logger);

	let databaseKeyHex: string | null = null;
	const profilePaths = await resolveDesktopProfilePaths(bridge().processArgv());
	const startupAction = decideEncryptedProfileStartupAction(profilePaths.metadata, sqlCipherProbe.available);
	if (startupAction === 'errorSqlCipherUnavailable') {
		throw new Error(_('Encrypted profile requires SQLCipher, but the SQLCipher native module is unavailable in this build. Encrypted profile cannot start until you use a build that includes SQLCipher or disable encrypted profile in profile-encryption.json.'));
	}

	if (startupAction === 'migrate' && profilePaths.metadata) {
		databaseKeyHex = await renderEncryptedProfileUnlockScreen(profilePaths.metadata, { purpose: 'migration' });
		const migrationResult = await runPendingEncryptedProfileMigration(profilePaths.profileDir, databaseKeyHex);
		if (!migrationResult.success) {
			await renderEncryptedProfileMigrationFailedScreen(migrationResult.error ? formatEncryptedProfileMigrationError(migrationResult.error) : _('Encrypted profile migration failed'));
			databaseKeyHex = null;
		} else {
			setRuntimeDatabaseKeyHex(databaseKeyHex);
			if (await profileHasPlaintextMigrationBackup(profilePaths.profileDir)) {
				await renderEncryptedProfileBackupPromptScreen(profilePaths.profileDir);
			}
		}
	} else if (startupAction === 'unlock' && profilePaths.metadata) {
		databaseKeyHex = await renderEncryptedProfileUnlockScreen(profilePaths.metadata, { purpose: 'unlock' });
		setRuntimeDatabaseKeyHex(databaseKeyHex);
	}

	const startResult = await app().start(bridge().processArgv(), {
		databaseKeyHex: databaseKeyHex ?? undefined,
	});

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

