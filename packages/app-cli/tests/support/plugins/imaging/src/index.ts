import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

joplin.plugins.register({
	onStart: async function() {
		await joplin.commands.register({
			name: 'makeThumbnail',
			execute: async () => {
				const noteIds = await joplin.workspace.selectedNoteIds();
				if (noteIds.length !== 1) return;
				const noteId = noteIds[0];
				const result = await joplin.data.get(['notes', noteId, 'resources']);
				if (result.items.length <= 0) return;
				const resource = result.items[0];
				const file = await joplin.data.get(['resources', resource.id, 'file']);
				
				const imageHandle = await joplin.imaging.createFromBuffer(file.body, {});
				const resizedImageHandle =  await joplin.imaging.resize(imageHandle, {
					width: 100,
					height: 100,
					quality: 'good',
				});

				const dataUrl = await joplin.imaging.toDataUrl(resizedImageHandle);
				await joplin.commands.execute('insertText', '\n![](' + dataUrl + ')');

				await joplin.imaging.free(imageHandle);
				await joplin.imaging.free(resizedImageHandle);
			},
		});

		await joplin.views.toolbarButtons.create('makeThumbnailButton', 'makeThumbnail', ToolbarButtonLocation.EditorToolbar);
	},
});
