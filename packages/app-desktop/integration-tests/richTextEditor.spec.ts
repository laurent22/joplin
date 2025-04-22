import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import setFilePickerResponse from './util/setFilePickerResponse';
import waitForNextOpenPath from './util/waitForNextOpenPath';
import { basename, join } from 'path';

test.describe('richTextEditor', () => {
	test('HTML links should be preserved when editing a note', async ({ electronApp, mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
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
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Testing!');
		const editor = mainScreen.noteEditor;

		// Set the note's content
		await editor.focusCodeMirrorEditor();

		// Attach this file to the note (create a resource ID)
		const pathToAttach = join(__dirname, 'resources', 'test-file.txt');
		await setFilePickerResponse(electronApp, [pathToAttach]);
		await editor.attachFileButton.click();

		// Wait for it to render
		await expect(editor.getNoteViewerFrameLocator().getByText('test-file.txt')).toBeVisible();

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

	test('should not remove text when pressing [enter] at the end of a line with an image', async ({ mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Testing pressing enter!');
		const editor = mainScreen.noteEditor;

		// Set the initial content
		await editor.codeMirrorEditor.click();
		await mainWindow.keyboard.type([
			'<img',
			' src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAMAAAADCAYAAABWKLW/AAAAEklEQVQIW2P8z8AARBDAiJMDAIzoBf635fcVAAAAAElFTkSuQmCC"',
			' width="200"',
			' height="200"',
			' alt="test image"',
			'/>',
		].join(' '));
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.type('Test secondary paragraph.');

		// Switch to the RTE
		await editor.toggleEditorsButton.click();
		await editor.richTextEditor.waitFor();

		const richTextEditorFrame = editor.getRichTextFrameLocator();
		const testParagraph = richTextEditorFrame.getByText('Test secondary paragraph.');
		await expect(testParagraph).toBeAttached();

		// Move the cursor just after the image, then press enter.
		const testImage = richTextEditorFrame.getByRole('img', { name: 'test image' });
		await testImage.click();
		await mainWindow.keyboard.press('ArrowRight');
		await mainWindow.keyboard.press('Enter');

		// Should not have removed the image or the test paragraph.
		await expect(testImage).toBeAttached();
		await expect(testParagraph).toBeAttached();
	});

	test('pressing Tab should indent', async ({ mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
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

	test('should be possible to disable tab indentation from the menu', async ({ mainWindow, electronApp }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Testing keyboard navigation!');

		const editor = mainScreen.noteEditor;
		await editor.toggleEditorsButton.click();
		await editor.richTextEditor.click();

		await editor.enableTabNavigation(electronApp);
		await mainWindow.keyboard.type('This is a');

		// Tab should navigate
		await expect(editor.richTextEditor).toBeFocused();
		await mainWindow.keyboard.press('Tab');
		await expect(editor.richTextEditor).not.toBeFocused();

		await editor.disableTabNavigation(electronApp);

		// Tab should not navigate
		await editor.richTextEditor.click();
		await mainWindow.keyboard.press('Tab');
		await expect(editor.richTextEditor).toBeFocused();
	});

	test('double-clicking a code block should edit it', async ({ mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Testing code blocks');

		const editor = mainScreen.noteEditor;
		await editor.toggleEditorsButton.click();

		// Make the code block
		await editor.toggleCodeBlockButton.click();
		const codeEditor = editor.richTextCodeEditor;
		await codeEditor.textArea.fill('This is a test code block!');
		await codeEditor.submit();

		// Double-clicking the code block should open it
		const renderedCode = editor.getRichTextFrameLocator().locator('pre.hljs', { hasText: 'This is a test code block!' });
		await renderedCode.first().dblclick();
		await codeEditor.waitFor();
	});

	test('disabling tab indentation should also disable it in code dialogs', async ({ mainWindow, electronApp }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Testing code blocks');

		const editor = mainScreen.noteEditor;
		await editor.toggleEditorsButton.click();
		await editor.richTextEditor.click();

		await editor.toggleCodeBlockButton.click();
		const codeEditor = editor.richTextCodeEditor;
		await codeEditor.waitFor();

		// Initially, pressing <tab> in the textarea should add a tab
		await codeEditor.textArea.click();
		await mainWindow.keyboard.press('Tab');
		await expect(codeEditor.textArea).toHaveValue('\t');
		await expect(codeEditor.textArea).toBeFocused();

		await editor.enableTabNavigation(electronApp);

		// After enabling tab navigation, pressing tab should navigate.
		await expect(codeEditor.textArea).toBeFocused();
		await mainWindow.keyboard.press('Tab');
		await expect(codeEditor.textArea).not.toBeFocused();
	});

	test('should be possible to navigate between the note title and rich text editor with enter/down/up keys', async ({ mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
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

	test('note should have correct content even if opened quickly after last edit', async ({ mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Test 1');
		await mainScreen.createNewNote('Test 2');
		const test1Header = mainScreen.noteList.getNoteItemByTitle('Test 1');
		const test2Header = mainScreen.noteList.getNoteItemByTitle('Test 2');

		const editor = mainScreen.noteEditor;
		await editor.toggleEditorsButton.click();
		await editor.richTextEditor.waitFor();

		const editorBody = editor.getRichTextEditorBody();
		const setEditorText = async (targetText: string) => {
			await editorBody.pressSequentially(targetText);
			await expect(editorBody).toHaveText(targetText);
		};

		await test1Header.click();
		await expect(editorBody).toHaveText('');
		await setEditorText('Test 1');

		await test2Header.click();
		// Previously, after switching to note 2, the "Test 1" text would remain present in the
		// editor.
		await expect(editorBody).toHaveText('');
	});

});

