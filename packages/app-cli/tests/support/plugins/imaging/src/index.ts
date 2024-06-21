import joplin from 'api';
import { ToolbarButtonLocation } from 'api/types';

const registerMakeThumbnailCommand = async () => {
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
};

const registerMakeThumbnailFromUrlCommand = async () => {
	await joplin.commands.register({
		name: 'makeThumbnailFromUrl',
		execute: async () => {
			const urls = [
				'https://github.com/laurent22/joplin/blob/dev/Assets/ImageSources/RoundedCornersMac_1024x1024.png?raw=true',
				'https://github.com/laurent22/joplin/blob/dev/packages/app-cli/tests/ocr_samples/multi_page__embedded_text.pdf?raw=true',
			]

			for (const url of urls) {
				// ---------------------------------------------------------------
				// Create an image from URLs
				// ---------------------------------------------------------------
				
				const imageHandle = await joplin.imaging.createFromPath(url);
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
			}
		},
	});

	await joplin.views.toolbarButtons.create('makeThumbnailFromUrlButton', 'makeThumbnailFromUrl', ToolbarButtonLocation.EditorToolbar);
};

const registerInlinePdfCommand = async () => {
	await joplin.commands.register({
		name: 'inlinePdfs',
		execute: async () => {
			// ---------------------------------------------------------------
			// Get the current selection & extract a resource link
			// ---------------------------------------------------------------

			const selection: string = await joplin.commands.execute('selectedText');

			// Matches content of the form
			//  [text here](:/32-letter-or-num-characters-here)
			// Where ([a-z0-9]{32}) matches the resource ID.
			const resourceLinkRegex = /\[.*\]\(:\/([a-z0-9]{32})\)/;

			const resourceLinkMatch = selection.match(resourceLinkRegex);
			if (!resourceLinkMatch) return;
			const resourceId = resourceLinkMatch[1]; // The text of the region matching ([a-z0-9]{32})

			const resource = await joplin.data.get(['resources', resourceId], { fields: ['mime'] });
			const isPdf = resource.mime === 'application/pdf';
			if (!isPdf) return;

			// Clear the selection
			await joplin.commands.execute('replaceSelection', '');
			await joplin.commands.execute('insertText', selection);

			// ---------------------------------------------------------------
			// Convert the PDF to images
			// ---------------------------------------------------------------

			const pdfInfo = await joplin.imaging.getPdfInfoFromResource(resourceId);
			const images = await joplin.imaging.createFromPdfResource(
				resourceId,
				// Convert at most 10 pages
				{ minPage: 1, maxPage: 10, scaleFactor: 0.5 },
			);

			let pageNumber = 0;
			for (const image of images) {
				pageNumber++;
				const pageResource = await joplin.imaging.toJpgResource(
					image, { title: `Page ${pageNumber} of ${pdfInfo.pageCount}` }
				);
				await joplin.commands.execute('insertText', `\n- ![${pageResource.title}](:/${pageResource.id})`);
			}

			await joplin.imaging.free(images);
		},
	});

	await joplin.views.toolbarButtons.create('inlineSelectedPdfsButton', 'inlinePdfs', ToolbarButtonLocation.EditorToolbar);
};

joplin.plugins.register({
	onStart: async function() {
		await registerMakeThumbnailCommand();
		await registerInlinePdfCommand();
		await registerMakeThumbnailFromUrlCommand();
	},
});
