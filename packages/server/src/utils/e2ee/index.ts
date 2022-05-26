import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import Logger, { LogLevel, TargetType } from '@joplin/lib/Logger';
import shim from '@joplin/lib/shim';
import Note from '@joplin/lib/models/Note';
import { NoteEntity } from '@joplin/lib/services/database/types';
import BaseItem from '@joplin/lib/models/BaseItem';
import { LinkType, MarkupToHtml } from '@joplin/renderer';
import Resource from '@joplin/lib/models/Resource';
import { OptionsResourceModel } from '@joplin/renderer/MarkupToHtml';
import { ModelType } from '@joplin/lib/BaseModel';
import { Uuid } from '../../services/database/types';
import { themeStyle } from '@joplin/lib/theme';
import Setting from '@joplin/lib/models/Setting';
const sjcl = require('@joplin/lib/vendor/sjcl.js');
const urlUtils = require('@joplin/lib/urlUtils');

interface LinkedItemInfoLocalState {
	fetch_status: number;
}

interface LinkedItemInfoItem {
	id: string;
	type_: ModelType;
	type: LinkType;
}

interface LinkedItemInfo {
	localState: LinkedItemInfoLocalState;
	item: LinkedItemInfoItem;
}

type LinkedItemInfos = Record<string, LinkedItemInfo>;

interface JoplinNsNote {
	ciphertext: string;
	masterKey: MasterKeyEntity;
}

interface JoplinNs {
	note: JoplinNsNote;
	getResourceTemplateUrl: string;
}

type DownloadResourceHandler = (getResourceTemplateUrl: string, shareId: string, resourceId: string)=> Promise<string>;

const setupGlobalLogger = () => {
	const mainLogger = new Logger();
	mainLogger.addTarget(TargetType.Console);
	mainLogger.setLevel(LogLevel.Debug);
	Logger.initializeGlobalLogger(mainLogger);
	return mainLogger;
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

const setupEncryptionService = async (masterKey: MasterKeyEntity, password: string) => {
	const encryptionService = new EncryptionService();
	await encryptionService.loadMasterKey(masterKey, password, false);
	return encryptionService;
};

const downloadResource: DownloadResourceHandler = async (getResourceTemplateUrl: string, shareId: string, resourceId: string) => {
	const url = getResourceTemplateUrl.replace(/SHARE_ID/, shareId).replace(/RESOURCE_ID/, resourceId);
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Could not download resource: ${url}: ${await response.text()}`);
	}

	return response.text();
};

const decryptNote = async (encryptionService: EncryptionService, joplinNsNote: JoplinNsNote) => {
	BaseItem.loadClass('Note', Note);

	const serializedContent = await encryptionService.decryptString(joplinNsNote.ciphertext);
	const note: NoteEntity = await Note.unserialize(serializedContent, { noDb: true });
	note.markup_language = Number(note.markup_language);
	const linkedItems = urlUtils.extractResourceUrls(note.body);

	const linkedItemInfos: LinkedItemInfos = {};

	for (const linkedItem of linkedItems) {
		linkedItemInfos[linkedItem.itemId] = {
			item: {
				id: linkedItem.itemId,
				type: linkedItem.type,
				type_: ModelType.Resource,
			},
			localState: {
				fetch_status: 2,
			},
		};
	}

	return {
		note,
		linkedItemInfos,
	};
};

const renderNote = async (encryptionService: EncryptionService, note: NoteEntity, linkedItemInfos: LinkedItemInfos, getResourceTemplateUrl: string, shareId: string, downloadResource: DownloadResourceHandler) => {
	const markupToHtml = new MarkupToHtml({
		ResourceModel: Resource as OptionsResourceModel,
	});

	const resourceDataUrls: Record<string, string> = {};

	for (const [itemId, linkedItemInfo] of Object.entries(linkedItemInfos)) {
		if (linkedItemInfo.item.type === LinkType.Image) {
			const content = await downloadResource(getResourceTemplateUrl, shareId, itemId);
			const decrypted = await encryptionService.decryptBase64(content);
			// We don't know if it's actually a gif but it seems that
			// "image/gif" work with png, jpg, etc. so that might be fine.
			// Getting the mime type would require fetching the resource
			// metadata and decrypting so hopefully that can be avoided.
			resourceDataUrls[itemId] = `data:image/gif;base64,${decrypted}`;
		}
	}

	const renderOptions: any = {
		resources: linkedItemInfos,

		itemIdToUrl: (itemId: Uuid, _linkType: LinkType) => {
			if (!linkedItemInfos[itemId]) return '#';

			const item = linkedItemInfos[itemId].item;
			if (!item) throw new Error(`No such item in this note: ${itemId}`);

			if (item.type_ === ModelType.Note) {
				return '#';
			} else if (item.type_ === ModelType.Resource) {
				return resourceDataUrls[itemId]; // `${models_.share().shareUrl(share.owner_id, share.id)}?resource_id=${item.id}&t=${item.updated_time}`;
			} else {
				throw new Error(`Unsupported item type: ${item.type_}`);
			}
		},

		// Switch-off the media players because there's no option to toggle
		// them on and off.
		audioPlayerEnabled: false,
		videoPlayerEnabled: false,
		pdfViewerEnabled: false,
		checkboxDisabled: true,

		linkRenderingType: 2,
	};

	const result = await markupToHtml.render(note.markup_language, note.body, themeStyle(Setting.THEME_LIGHT), renderOptions);
	return result;
};

// (window as any).decryptNote = decryptNote;

if (typeof window !== 'undefined') {
	(() => {
		const initPage = async () => {
			const joplin = (window as any).__joplin as JoplinNs;

			const logger = setupGlobalLogger();
			setupShim();
			const encryptionService = await setupEncryptionService(joplin.note.masterKey, '111111');
			const decrypted = await decryptNote(encryptionService, joplin.note);

			logger.info('Decrypted note');
			logger.info(decrypted);

			const result = await renderNote(encryptionService, decrypted.note, decrypted.linkedItemInfos, joplin.getResourceTemplateUrl, 'PnVTq4aIf3jIsP0uvuRpr4', downloadResource);

			const contentElement = document.createElement('div');
			contentElement.innerHTML = result.html;
			document.body.appendChild(contentElement);
		};

		const initPageIID = setInterval(async () => {
			if (document.readyState !== 'loading') {
				clearInterval(initPageIID);
				await initPage();
			}
		}, 10);
	})();
}

export { decryptNote, renderNote };
