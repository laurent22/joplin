import EncryptionService from '@joplin/lib/services/e2ee/EncryptionService';
import { MasterKeyEntity } from '@joplin/lib/services/e2ee/types';
import Logger, { LogLevel, TargetType } from '@joplin/lib/Logger';
import shim from '@joplin/lib/shim';
import Note from '@joplin/lib/models/Note';
import { NoteEntity, ResourceEntity } from '@joplin/lib/services/database/types';
import BaseItem from '@joplin/lib/models/BaseItem';
import { LinkType, MarkupToHtml } from '@joplin/renderer';
import Resource from '@joplin/lib/models/Resource';
import { OptionsResourceModel } from '@joplin/renderer/MarkupToHtml';
import { ModelType } from '@joplin/lib/BaseModel';
import { Uuid } from '../../services/database/types';
import { themeStyle } from '@joplin/lib/theme';
import Setting from '@joplin/lib/models/Setting';
import { ItemIdToUrlResponse } from '@joplin/renderer/utils';
const sjcl = require('@joplin/lib/vendor/sjcl.js');
const urlUtils = require('@joplin/lib/urlUtils');
const mimeUtils = require('@joplin/lib/mime-utils.js').mime;

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

export type DownloadResourceHandler = (getResourceTemplateUrl: string, shareId: string, resourceId: string, metadataOnly: boolean)=> Promise<string>;

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

export const setupModels = () => {
	BaseItem.loadClass('Note', Note);
	BaseItem.loadClass('Resource', Resource);
};

const makeResourceUrl = (getResourceTemplateUrl: string, shareId: string, resourceId: string, metadataOnly: boolean) => {
	return getResourceTemplateUrl.replace(/SHARE_ID/, shareId).replace(/RESOURCE_ID/, resourceId).replace(/RESOURCE_METADATA/, metadataOnly ? '1' : '0');
};

const downloadResource: DownloadResourceHandler = async (getResourceTemplateUrl: string, shareId: string, resourceId: string, metadataOnly: boolean) => {
	const url = makeResourceUrl(getResourceTemplateUrl, shareId, resourceId, metadataOnly);
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Could not download resource: ${url}: ${await response.text()}`);
	}

	if (metadataOnly) {
		return response.json();
	} else {
		return response.text();
	}
};

const decryptNote = async (encryptionService: EncryptionService, joplinNsNote: JoplinNsNote) => {
	setupModels();

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

	interface FetchedResource {
		metadata: ResourceEntity;
		content: string;
	}

	const fetchedResources: Record<string, FetchedResource> = {};

	for (const [itemId] of Object.entries(linkedItemInfos)) {

		const encryptedMd = await downloadResource(getResourceTemplateUrl, shareId, itemId, true) as ResourceEntity;
		const plaintextMd = await encryptionService.decryptString(encryptedMd.encryption_cipher_text);
		const md = await Resource.unserialize(plaintextMd, { noDb: true }) as ResourceEntity;

		const content = await downloadResource(getResourceTemplateUrl, shareId, itemId, false);
		const decrypted = await encryptionService.decryptBase64(content);
		fetchedResources[itemId] = {
			metadata: md,
			content: `data:${md.mime};base64,${decrypted}`,
		};
	}

	const renderOptions: any = {
		resources: linkedItemInfos,

		itemIdToUrl: (itemId: Uuid, linkType: LinkType): string|ItemIdToUrlResponse => {
			if (!linkedItemInfos[itemId]) return '#';

			const item = linkedItemInfos[itemId].item;
			if (!item) throw new Error(`No such item in this note: ${itemId}`);

			if (item.type_ === ModelType.Note) {
				return '#';
			} else if (item.type_ === ModelType.Resource) {
				const fetchedResource = fetchedResources[itemId];

				if (linkType === LinkType.Image) {
					return fetchedResource.content;
				} else {
					return {
						url: fetchedResource.content,
						attributes: {
							download: mimeUtils.appendExtensionFromMime(fetchedResource.metadata.filename || 'file', fetchedResource.metadata.mime),
						},
					};
				}
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

if (typeof window !== 'undefined') {
	(() => {
		const getPassword = () => {
			const params = new URLSearchParams(window.location.search);
			const queryPassword = params.get('password');
			if (queryPassword) return atob(queryPassword);

			const answer = prompt('This note is encrypted. Please enter the password:');
			if (!answer) throw new Error('The note cannot be decrypted without a password');
			return answer.trim();
		};

		const getShareId = () => {
			const p = location.pathname.split('/');
			const shareId = p.pop();
			return shareId;
		};

		const initPage = async () => {
			const joplin = (window as any).__joplin as JoplinNs;
			const logger = setupGlobalLogger();
			setupShim();

			const password = getPassword();
			const shareId = getShareId();

			console.info('Share ID', shareId);
			console.info('Password', password);

			const encryptionService = await setupEncryptionService(joplin.note.masterKey, password);

			const decrypted = await (async () => {
				try {
					return decryptNote(encryptionService, joplin.note);
				} catch (error) {
					error.message = `Could not decrypt note: ${error.message}`;
					throw error;
				}
			})();

			logger.info('Decrypted note');
			logger.info(decrypted);

			const result = await (async () => {
				try {
					return renderNote(encryptionService, decrypted.note, decrypted.linkedItemInfos, joplin.getResourceTemplateUrl, shareId, downloadResource);
				} catch (error) {
					error.message = `Could not render note: ${error.message}`;
					throw error;
				}
			})();

			const contentElement = document.createElement('div');
			contentElement.innerHTML = result.html;
			document.body.appendChild(contentElement);
		};

		const initPageIID = setInterval(async () => {
			if (document.readyState !== 'loading') {
				clearInterval(initPageIID);
				try {
					await initPage();
				} catch (error) {
					console.error(error);
					alert(`There was an error loading this page: ${error.message}`);
				}
			}
		}, 10);
	})();
}

export { decryptNote, renderNote };
