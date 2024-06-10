import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import setFilePickerResponse from './util/setFilePickerResponse';
import waitForNextOpenPath from './util/waitForNextOpenPath';
import { basename } from 'path';

test.describe('richTextEditor', () => {
	test('HTML links should be preserved when editing a note', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.createNewNote('Testing!');
		const editor = mainScreen.noteEditor;

		// Set the note's content
		await editor.focusCodeMirrorEditor();

		// Attach this file to the note (create a resource ID)
		await setFilePickerResponse(electronApp, [__filename]);
		await editor.attachFileButton.click();

		// Wait to render
		const viewerFrame = editor.getNoteViewerIframe();
		await viewerFrame.locator('a[data-from-md]').waitFor();

		// Should have an attached resource
		const codeMirrorContent = await editor.codeMirrorEditor.innerText();

		const resourceUrlExpression = /\[.*\]\(:\/(\w+)\)/;
		expect(codeMirrorContent).toMatch(resourceUrlExpression);
		const resourceId = codeMirrorContent.match(resourceUrlExpression)[1];

		// Create a new note with just an HTML link
		await mainScreen.createNewNote('Another test');
		await editor.codeMirrorEditor.click();
		await mainWindow.keyboard.type(`<a href=":/${resourceId}">HTML Link</a>`);

		// Switch to the RTE
		await editor.toggleEditorsButton.click();
		await editor.richTextEditor.waitFor();

		// Edit the note to cause the original content to update
		await editor.getTinyMCEFrameLocator().locator('a').click();
		await mainWindow.keyboard.type('Test...');

		await editor.toggleEditorsButton.click();
		await editor.codeMirrorEditor.waitFor();

		// Note should still contain the resource ID and note title
		const finalCodeMirrorContent = await editor.codeMirrorEditor.innerText();
		expect(finalCodeMirrorContent).toContain(`:/${resourceId}`);
	});

	test('should watch resources for changes when opened with ctrl+click', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.createNewNote('Testing!');
		const editor = mainScreen.noteEditor;

		// Set the note's content
		await editor.focusCodeMirrorEditor();

		// Attach this file to the note (create a resource ID)
		const pathToAttach = __filename;
		await setFilePickerResponse(electronApp, [pathToAttach]);
		await editor.attachFileButton.click();

		// Switch to the RTE
		await editor.toggleEditorsButton.click();
		await editor.richTextEditor.waitFor();

		await editor.richTextEditor.click();

		// Click on the attached file URL
		const openPathResult = waitForNextOpenPath(electronApp);
		const targetLink = editor.getTinyMCEFrameLocator().getByRole('link', { name: basename(pathToAttach) });
		if (process.platform === 'darwin') {
			await targetLink.click({ modifiers: ['Meta'] });
		} else {
			await targetLink.click({ modifiers: ['Control'] });
		}

		// Should watch the file
		await mainWindow.getByText(/^The following attachments are being watched for changes/i).waitFor();
		expect(await openPathResult).toContain(basename(pathToAttach));
	});

});

