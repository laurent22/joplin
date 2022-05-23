import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import Logger, { LogLevel, TargetType } from '@joplin/lib/Logger';
import shim from '@joplin/lib/shim';
const sjcl = require('@joplin/lib/vendor/sjcl.js');

const fetchResourceUrl = 'http://joplincloud.local:22300/shares/SHARE_ID?resource_id=RESOURCE_ID';

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

const downloadResource = async (shareId: string, resourceId: string) => {
	const url = fetchResourceUrl.replace(/SHARE_ID/, shareId).replace(/RESOURCE_ID/, resourceId);
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Could not download resource: ${url}: ${await response.text()}`);
	}

	return response.text();
};

const decryptNote = async () => {
	const joplin = (window as any).__joplin as JoplinNs;

	setupGlobalLogger();
	setupShim();

	const encryptionService = new EncryptionService();
	await encryptionService.loadMasterKey(joplin.note.masterKey, '111111', false);

	const content = await downloadResource('PnVTq4aIf3jIsP0uvuRpr4', 'b1e90fd31f2d492facc903579562b2e3');
	// const content = await downloadResource('PnVTq4aIf3jIsP0uvuRpr4', '879da30580d94e4d899e54f029c84dd2');

	const decrypted = await encryptionService.decryptBase64(content, {
		onProgress: (event: any) => {
			console.info('Progress', event);
		},
	});

	const image = document.createElement('img');
	image.src = `data:image/gif;base64,${decrypted}`;
	document.body.appendChild(image);

	return encryptionService;
};

(window as any).decryptNote = decryptNote;
