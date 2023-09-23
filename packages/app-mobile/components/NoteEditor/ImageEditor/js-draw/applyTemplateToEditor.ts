import { AbstractComponent, Editor, BackgroundComponentBackgroundType, Erase, Vec2, Rect2 } from 'js-draw';

const applyTemplateToEditor = async (editor: Editor, templateData: string) => {
	let backgroundComponent: AbstractComponent|null = null;
	let imageSize = editor.getImportExportRect().size;
	let autoresize = true;

	try {
		const templateJSON = JSON.parse(templateData);

		const isEmptyTemplate =
			!('imageSize' in templateJSON) && !('backgroundData' in templateJSON);

		// If the template is empty, add a default background
		if (isEmptyTemplate) {
			templateJSON.backgroundData = {
				'name': 'image-background',
				'zIndex': 0,
				'data': {
					'mainColor': '#ffffff',
					'backgroundType': BackgroundComponentBackgroundType.Grid,
					'gridSize': 25,
					'gridStrokeWidth': 0.7,
				},
			};
		}

		if ('backgroundData' in templateJSON) {
			backgroundComponent = AbstractComponent.deserialize(
				templateJSON['backgroundData'],
			);
		}

		if ('imageSize' in templateJSON) {
			imageSize = Vec2.ofXY(templateJSON.imageSize);
		}

		if ('autoresize' in templateJSON) {
			autoresize = !!templateJSON.autoresize;
		}
	} catch (e) {
		console.error('Warning: Invalid image template data: ', e);
	}

	if (backgroundComponent) {
		// Remove the old background (if any)
		const previousBackground = editor.image.getBackgroundComponents();
		if (previousBackground.length > 0) {
			const removeBackgroundCommand = new Erase(previousBackground);
			await editor.dispatchNoAnnounce(removeBackgroundCommand, false);
		}

		// Add the new background
		const addBackgroundCommand = editor.image.addElement(backgroundComponent);
		await editor.dispatchNoAnnounce(addBackgroundCommand, false);
	}

	// Set the image size
	const imageSizeCommand = editor.setImportExportRect(new Rect2(0, 0, imageSize.x, imageSize.y));
	await editor.dispatchNoAnnounce(imageSizeCommand, false);

	// Enable/disable autoresize
	await editor.dispatchNoAnnounce(editor.image.setAutoresizeEnabled(autoresize), false);

	// And zoom to the template (false = don't make undoable)
	await editor.dispatchNoAnnounce(editor.viewport.zoomTo(editor.getImportExportRect()), false);
};

export default applyTemplateToEditor;
