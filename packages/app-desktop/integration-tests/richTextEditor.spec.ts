import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import setFilePickerResponse from './util/setFilePickerResponse';
import waitForNextOpenPath from './util/waitForNextOpenPath';
import { basename, join } from 'path';

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
		const viewerFrame = editor.getNoteViewerFrameLocator();
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
		await editor.getRichTextFrameLocator().locator('a').click();
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
		const pathToAttach = join(__dirname, 'resources', 'test-file.txt');
		await setFilePickerResponse(electronApp, [pathToAttach]);
		await editor.attachFileButton.click();

		// Switch to the RTE
		await editor.toggleEditorsButton.click();
		await editor.richTextEditor.waitFor();

		await editor.richTextEditor.click();

		// Click on the attached file URL
		const openPathResult = waitForNextOpenPath(electronApp);
		const targetLink = editor.getRichTextFrameLocator().getByRole('link', { name: basename(pathToAttach) });
		if (process.platform === 'darwin') {
			await targetLink.click({ modifiers: ['Meta'] });
		} else {
			await targetLink.click({ modifiers: ['Control'] });
		}

		// Should watch the file
		await mainWindow.getByText(/^The following attachments are being watched for changes/i).waitFor();
		expect(await openPathResult).toContain(basename(pathToAttach));
	});

	test('pressing Tab should indent', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.createNewNote('Testing tabs!');
		const editor = mainScreen.noteEditor;

		await editor.toggleEditorsButton.click();
		await editor.richTextEditor.click();

		await mainWindow.keyboard.type('This is a');
		// Tab should add spaces
		await mainWindow.keyboard.press('Tab');
		await mainWindow.keyboard.type('test.');

		// Shift-tab should remove spaces
		await mainWindow.keyboard.press('Tab');
		await mainWindow.keyboard.press('Tab');
		await mainWindow.keyboard.press('Shift+Tab');
		await mainWindow.keyboard.type('Test!');

		// Escape then tab should move focus
		await mainWindow.keyboard.press('Escape');
		await expect(editor.richTextEditor).toBeFocused();
		await mainWindow.keyboard.press('Tab');
		await expect(editor.richTextEditor).not.toBeFocused();

		// After re-focusing the editor, Tab should indent again.
		await mainWindow.keyboard.press('Shift+Tab');
		await expect(editor.richTextEditor).toBeFocused();
		await mainWindow.keyboard.type(' Another:');
		await mainWindow.keyboard.press('Tab');
		await mainWindow.keyboard.type('!');

		// After switching back to the Markdown editor,
		await expect(editor.toggleEditorsButton).not.toBeDisabled();
		await editor.toggleEditorsButton.click();
		await expect(editor.codeMirrorEditor).toHaveText('This is a        test.        Test! Another:        !');
	});

	test('should be possible to navigate between the note title and rich text editor with enter/down/up keys', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.createNewNote('Testing keyboard navigation!');

		const editor = mainScreen.noteEditor;
		await editor.toggleEditorsButton.click();

		await editor.richTextEditor.waitFor();

		await editor.noteTitleInput.click();
		await expect(editor.noteTitleInput).toBeFocused();

		await mainWindow.keyboard.press('End');
		await mainWindow.keyboard.press('ArrowDown');
		await expect(editor.richTextEditor).toBeFocused();

		await mainWindow.keyboard.press('ArrowUp');
		await expect(editor.noteTitleInput).toBeFocused();

		await mainWindow.keyboard.press('Enter');
		await expect(editor.noteTitleInput).not.toBeFocused();
		await expect(editor.richTextEditor).toBeFocused();
	});
});

