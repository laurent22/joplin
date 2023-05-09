const welcomeAssets = require('./welcomeAssets');
const Note = require('./models/Note').default;
const Setting = require('./models/Setting').default;
const Folder = require('./models/Folder').default;
const shim = require('./shim').default;
const uuid = require('./uuid').default;
const { fileExtension, basename } = require('./path-utils');
const { pregQuote } = require('./string-utils');

class WelcomeUtils {
	static async createWelcomeItems() {
		const output = {
			defaultFolderId: null,
		};

		const folderAssets = welcomeAssets.folders;
		const tempDir = Setting.value('resourceDir');

		for (let i = 0; i < folderAssets.length; i++) {
			const folderAsset = folderAssets[i];
			const folder = await Folder.save({ title: `${folderAsset.title} (${Setting.appTypeToLabel(Setting.value('appType'))})` });
			if (!output.defaultFolderId) output.defaultFolderId = folder.id;
		}

		const noteAssets = welcomeAssets.notes;

		for (let i = noteAssets.length - 1; i >= 0; i--) {
			const noteAsset = noteAssets[i];

			let noteBody = noteAsset.body;

			for (const resourceUrl in noteAsset.resources) {
				if (!noteAsset.resources.hasOwnProperty(resourceUrl)) continue;
				const resourceAsset = noteAsset.resources[resourceUrl];
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

	static async install(dispatch) {
		if (!Setting.value('welcome.enabled')) {
			Setting.setValue('welcome.wasBuilt', true);
			return;
		}

		if (!Setting.value('welcome.wasBuilt')) {
			const result = await WelcomeUtils.createWelcomeItems();
			Setting.setValue('welcome.wasBuilt', true);

			dispatch({
				type: 'FOLDER_SELECT',
				id: result.defaultFolderId,
			});

			Setting.setValue('activeFolderId', result.defaultFolderId);
		}
	}
}

module.exports = WelcomeUtils;
