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
				
				// ---------------------------------------------------------------
				// Create an image object and resize it
				// ---------------------------------------------------------------
				
				const imageHandle = await joplin.imaging.createFromResource(resource.id);
				const resizedImageHandle = await joplin.imaging.resize(imageHandle, { width: 100 });
			
				// ---------------------------------------------------------------
				// Convert the image to a resource and add it to the note
				// ---------------------------------------------------------------

				const newResource = await joplin.imaging.toJpgResource(resizedImageHandle, { title: "Thumbnail" });
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
