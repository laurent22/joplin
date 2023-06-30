const welcomeAssetsAny = require('./welcomeAssets');
import Note from './models/Note';
import Setting from './models/Setting';
import Folder from './models/Folder';
import shim from './shim';
import uuid from './uuid';
import { fileExtension, basename } from './path-utils';
import { _ } from './locale';
const { pregQuote } = require('./string-utils');

export interface ItemMetadatum {
	id: string;
}

export type ItemMetadata = Record<string, ItemMetadatum>;

export interface CreateWelcomeItemsResult {
	defaultFolderId: string;
}

export interface WelcomeAssetResource {
	id: string;
	body: string;
}

export interface WelcomeAssetNote {
	id: string;
	parent_id: string;
	title: string;
	body: string;
	resources: Record<string, WelcomeAssetResource>;
}

export interface WelcomeAssetFolder {
	id: string;
	title: string;
}

export interface AssetContent {
	notes: WelcomeAssetNote[];
	folders: WelcomeAssetFolder[];
	timestamp: number;
}

export type WelcomeAssets = Record<string, AssetContent>;

class WelcomeUtils {

	public static async createWelcomeItems(locale: string): Promise<CreateWelcomeItemsResult> {
		const output: CreateWelcomeItemsResult = {
			defaultFolderId: null,
		};

		const allWelcomeAssets = welcomeAssetsAny as WelcomeAssets;
		const welcomeAssets = locale in allWelcomeAssets ? allWelcomeAssets[locale] : allWelcomeAssets['en_GB'];
		const enGbWelcomeAssets = allWelcomeAssets['en_GB'];

		const folderAssets = welcomeAssets.folders;
		const tempDir = Setting.value('resourceDir');

		// Actually we don't really support mutiple folders at this point, because not needed
		for (let i = 0; i < folderAssets.length; i++) {
			const folder = await Folder.save({ title: _('Welcome!') });
			if (!output.defaultFolderId) output.defaultFolderId = folder.id;
		}

		const noteAssets = welcomeAssets.notes;

		for (let i = noteAssets.length - 1; i >= 0; i--) {
			const noteAsset = noteAssets[i];
			const enGbNoteAsset = enGbWelcomeAssets.notes[i];

			let noteBody = noteAsset.body;

			for (const resourceUrl in enGbNoteAsset.resources) {
				if (!enGbNoteAsset.resources.hasOwnProperty(resourceUrl)) continue;
				const resourceAsset = enGbNoteAsset.resources[resourceUrl];
				const ext = fileExtension(resourceUrl);
				const tempFilePath = `${tempDir}/${uuid.create()}.tmp.${ext}`;
				await shim.fsDriver().writeFile(tempFilePath, resourceAsset.body, 'base64');
				const resource = await shim.createResourceFromPath(tempFilePath, {
					title: basename(resourceUrl),
				});
				await shim.fsDriver().remove(tempFilePath);

				const regex = new RegExp(pregQuote(`(${resourceUrl})`), 'g');
				noteBody = noteBody.replace(regex, `(:/${resource.id})`);
			}

			await Note.save({
				parent_id: output.defaultFolderId,
				title: noteAsset.title,
				body: noteBody,
			});

			// if (noteAsset.tags) await Tag.setNoteTagsByTitles(note.id, noteAsset.tags);
		}

		return output;
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public static async install(locale: string, dispatch: Function) {
		if (!Setting.value('welcome.enabled')) {
			Setting.setValue('welcome.wasBuilt', true);
			return;
		}

		if (!Setting.value('welcome.wasBuilt')) {
			const result = await WelcomeUtils.createWelcomeItems(locale);
			Setting.setValue('welcome.wasBuilt', true);

			dispatch({
				type: 'FOLDER_SELECT',
				id: result.defaultFolderId,
			});

			Setting.setValue('activeFolderId', result.defaultFolderId);
		}
	}
}

export default WelcomeUtils;
