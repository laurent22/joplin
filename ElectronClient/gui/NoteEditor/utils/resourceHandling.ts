const Setting = require('lib/models/Setting');
const Note = require('lib/models/Note.js');
const BaseModel = require('lib/BaseModel.js');
const Resource = require('lib/models/Resource.js');
const { shim } = require('lib/shim');
const { bridge } = require('electron').remote.require('./bridge');
const ResourceFetcher = require('lib/services/ResourceFetcher.js');
const { reg } = require('lib/registry.js');
const joplinRendererUtils = require('lib/joplin-renderer').utils;
const { clipboard } = require('electron');
const mimeUtils = require('lib/mime-utils.js').mime;
const md5 = require('md5');

export async function handleResourceDownloadMode(noteBody: string) {
	if (noteBody && Setting.value('sync.resourceDownloadMode') === 'auto') {
		const resourceIds = await Note.linkedResourceIds(noteBody);
		await ResourceFetcher.instance().markForDownload(resourceIds);
	}
}

let resourceCache_: any = {};

export function clearResourceCache() {
	resourceCache_ = {};
}

export async function attachedResources(noteBody: string): Promise<any> {
	if (!noteBody) return {};
	const resourceIds = await Note.linkedItemIdsByType(BaseModel.TYPE_RESOURCE, noteBody);

	const output: any = {};
	for (let i = 0; i < resourceIds.length; i++) {
		const id = resourceIds[i];

		if (resourceCache_[id]) {
			output[id] = resourceCache_[id];
		} else {
			const resource = await Resource.load(id);
			const localState = await Resource.localState(resource);

			const o = {
				item: resource,
				localState: localState,
			};

			// eslint-disable-next-line require-atomic-updates
			resourceCache_[id] = o;
			output[id] = o;
		}
	}

	return output;
}

export async function commandAttachFileToBody(body:string, filePaths:string[] = null, options:any = null) {
	options = {
		createFileURL: false,
		position: 0,
		...options,
	};

	if (!filePaths) {
		filePaths = bridge().showOpenDialog({
			properties: ['openFile', 'createDirectory', 'multiSelections'],
		});
		if (!filePaths || !filePaths.length) return null;
	}

	for (let i = 0; i < filePaths.length; i++) {
		const filePath = filePaths[i];
		try {
			reg.logger().info(`Attaching ${filePath}`);
			const newBody = await shim.attachFileToNoteBody(body, filePath, options.position, {
				createFileURL: options.createFileURL,
				resizeLargeImages: 'ask',
			});

			if (!newBody) {
				reg.logger().info('File attachment was cancelled');
				return null;
			}

			body = newBody;
			reg.logger().info('File was attached.');
		} catch (error) {
			reg.logger().error(error);
			bridge().showErrorMessageBox(error.message);
		}
	}

	return body;
}

export function resourcesStatus(resourceInfos: any) {
	let lowestIndex = joplinRendererUtils.resourceStatusIndex('ready');
	for (const id in resourceInfos) {
		const s = joplinRendererUtils.resourceStatus(Resource, resourceInfos[id]);
		const idx = joplinRendererUtils.resourceStatusIndex(s);
		if (idx < lowestIndex) lowestIndex = idx;
	}
	return joplinRendererUtils.resourceStatusName(lowestIndex);
}

export async function handlePasteEvent(event:any) {
	const output = [];
	const formats = clipboard.availableFormats();
	for (let i = 0; i < formats.length; i++) {
		const format = formats[i].toLowerCase();
		const formatType = format.split('/')[0];

		if (formatType === 'image') {
			if (event) event.preventDefault();

			const image = clipboard.readImage();

			const fileExt = mimeUtils.toFileExtension(format);
			const filePath = `${Setting.value('tempDir')}/${md5(Date.now())}.${fileExt}`;

			await shim.writeImageToFile(image, format, filePath);
			const md = await commandAttachFileToBody('', [filePath]);
			await shim.fsDriver().remove(filePath);

			if (md) output.push(md);
		}
	}
	return output;
}
