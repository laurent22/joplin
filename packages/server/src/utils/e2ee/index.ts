import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import Logger, { LogLevel, TargetType } from '@joplin/lib/Logger';
import shim from '@joplin/lib/shim';
const sjcl = require('@joplin/lib/vendor/sjcl.js');

interface JoplinNsNote {
	ciphertext: string;
	masterKey: MasterKeyEntity;
}

interface JoplinNs {
	note: JoplinNsNote;
}

const setupGlobalLogger = () => {
	const mainLogger = new Logger();
	mainLogger.addTarget(TargetType.Console);
	mainLogger.setLevel(LogLevel.Debug);
	Logger.initializeGlobalLogger(mainLogger);
};

const setupShim = () => {
	shim.sjclModule = sjcl;
	shim.setTimeout = (fn, interval) => {
		return setTimeout(fn, interval);
	};

	shim.setInterval = (fn, interval) => {
		return setInterval(fn, interval);
	};

	shim.clearTimeout = (id) => {
		return clearTimeout(id);
	};

	shim.clearInterval = (id) => {
		return clearInterval(id);
	};

	shim.waitForFrame = () => {};
};

const decryptNote = async () => {
	const joplin = (window as any).__joplin as JoplinNs;

	setupGlobalLogger();
	setupShim();

	const encryptionService = new EncryptionService();
	await encryptionService.loadMasterKey(joplin.note.masterKey, '111111', false);
	console.info(await encryptionService.decryptString(joplin.note.ciphertext));

	return encryptionService;
};

(window as any).decryptNote = decryptNote;
