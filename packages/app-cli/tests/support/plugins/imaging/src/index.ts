import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';
import { writeFile } from 'fs-extra';

joplin.plugins.register({
	onStart: async function() {
		await joplin.commands.register({
			name: 'makeThumbnail',
			execute: async () => {
				// ---------------------------------------------------------------
				// Get the current note
				// ---------------------------------------------------------------

				const noteIds = await joplin.workspace.selectedNoteIds();
				if (noteIds.length !== 1) return;
				const noteId = noteIds[0];

				// ---------------------------------------------------------------
				// Get the top resource in that note (if any)
				// ---------------------------------------------------------------

				const result = await joplin.data.get(['notes', noteId, 'resources']);
				if (result.items.length <= 0) return;
				const resource = result.items[0];
				const file = await joplin.data.get(['resources', resource.id, 'file']);

				// ---------------------------------------------------------------
				// Create an image object and resize it
				// ---------------------------------------------------------------
				
				const imageHandle = await joplin.imaging.createFromBuffer(file.body);
				const resizedImageHandle =  await joplin.imaging.resize(imageHandle, { width: 100 });

				// ---------------------------------------------------------------
				// Save the image to file
				// ---------------------------------------------------------------

				const tempFilePath = (await joplin.plugins.dataDir()) + '/' + Date.now();
				const base64 = await joplin.imaging.toBase64(resizedImageHandle);
				const fs = await joplin.require('fs-extra');
				await fs.writeFile(tempFilePath, base64, { encoding: 'base64' });

				// ---------------------------------------------------------------
				// Create a resource for the thumbnail and add it to the note
				// ---------------------------------------------------------------

				const newResource = await joplin.data.post(
					["resources"],
					null,
					{ title: "Thumbnail" },
					[
						{
							path: tempFilePath,
						},
					]
				);

				await joplin.commands.execute('insertText', '\n![](:/' + newResource.id + ')');

				// ---------------------------------------------------------------
				// Free up the image objects at the end
				// ---------------------------------------------------------------

				await joplin.imaging.free(imageHandle);
				await joplin.imaging.free(resizedImageHandle);
			},
		});

		await joplin.views.toolbarButtons.create('makeThumbnailButton', 'makeThumbnail', ToolbarButtonLocation.EditorToolbar);
	},
});
