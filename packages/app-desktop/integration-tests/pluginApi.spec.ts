
import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import { msleep, Second } from '@joplin/utils/time';

test.describe('pluginApi', () => {
	test('the editor.setText command should update the current note (use RTE: false)', async ({ startAppWithPlugins }) => {
		const { app, mainWindow } = await startAppWithPlugins(['resources/test-plugins/execCommand.js']);
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('First note');
		const editor = mainScreen.noteEditor;

		await editor.focusCodeMirrorEditor();
		await mainWindow.keyboard.type('This content should be overwritten.');

		await editor.expectToHaveText('This content should be overwritten.');
		await mainScreen.goToAnything.runCommand(app, 'testUpdateEditorText');
		await editor.expectToHaveText('PASS');

		// Should still have the same text after switching notes:
		await mainScreen.createNewNote('Second note');
		await editor.goBack();

		await editor.expectToHaveText('PASS');
	});

	test('should return form data from the dialog API', async ({ startAppWithPlugins }) => {
		const { app, mainWindow } = await startAppWithPlugins(['resources/test-plugins/dialogs.js']);
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('First note');

		const editor = mainScreen.noteEditor;
		await editor.expectToHaveText('\n');

		await mainScreen.goToAnything.runCommand(app, 'showTestDialog');
		// Wait for the iframe to load
		const dialogContent = mainScreen.dialog.locator('iframe').contentFrame();
		await dialogContent.locator('form').waitFor();

		// Submitting the dialog should include form data in the output
		await mainScreen.dialog.getByRole('button', { name: 'Okay' }).click();
		await editor.expectToHaveText(JSON.stringify({
			id: 'ok',
			hasFormData: true,
		}));
	});

	test('should report the correct visibility state for dialogs', async ({ startAppWithPlugins }) => {
		const { app, mainWindow } = await startAppWithPlugins(['resources/test-plugins/dialogs.js']);
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Dialog test note');

		const editor = mainScreen.noteEditor;
		const expectVisible = async (visible: boolean) => {
			// Check UI visibility
			if (visible) {
				await expect(mainScreen.dialog).toBeVisible();
			} else {
				await expect(mainScreen.dialog).not.toBeVisible();
			}

			// Check visibility reported through the plugin API
			await expect.poll(async () => {
				await mainScreen.goToAnything.runCommand(app, 'getTestDialogVisibility');

				const editorContent = await editor.contentLocator();
				return editorContent.textContent();
			}).toBe(JSON.stringify({
				visible: visible,
				active: visible,
			}));
		};
		await expectVisible(false);

		await mainScreen.goToAnything.runCommand(app, 'showTestDialog');
		await expectVisible(true);

		// Submitting the dialog should include form data in the output
		await mainScreen.dialog.getByRole('button', { name: 'Okay' }).click();
		await expectVisible(false);
	});

	test('should be possible to create multiple toasts with the same text from a plugin', async ({ startAppWithPlugins }) => {
		const { app, mainWindow } = await startAppWithPlugins(['resources/test-plugins/showToast.js']);
		const mainScreen = await new MainScreen(mainWindow).setup();

		await mainScreen.goToAnything.runCommand(app, 'testShowToastNotification');
		const notificationLocator = mainWindow.getByText('Toast: This is a test info message.');
		await expect(notificationLocator).toBeVisible();

		// Running the command again, there should be two notifications with the same text.
		await mainScreen.goToAnything.runCommand(app, 'testShowToastNotification');
		await expect(notificationLocator.nth(1)).toBeVisible();
		await expect(notificationLocator.nth(0)).toBeVisible();

		await mainScreen.goToAnything.runCommand(app, 'testShowToastNotification');
		await expect(notificationLocator).toHaveCount(3);
	});

	test('should be possible to switch between multiple editor plugins', async ({ startAppWithPlugins }) => {
		const { mainWindow } = await startAppWithPlugins(['resources/test-plugins/multipleEditorPlugins.js']);
		const mainScreen = await new MainScreen(mainWindow).setup();

		await mainScreen.createNewNote('Test note');
		const toggleButton = mainScreen.noteEditor.toggleEditorPluginButton;

		// Initially, the toggle button should be visible, and so should the default editor.
		await expect(mainScreen.noteEditor.codeMirrorEditor).toBeAttached();
		await toggleButton.click();

		const pluginFrame = mainScreen.noteEditor.editorPluginFrame;
		await expect(pluginFrame).toBeAttached();

		// Should describe the frame
		const frameViewIdLabel = pluginFrame.contentFrame().locator('#view-id-base');
		await expect(frameViewIdLabel).toHaveText('test-editor-plugin-1');

		// Clicking toggle again should cycle to the next editor plugin
		await toggleButton.click();
		await expect(frameViewIdLabel).toHaveText('test-editor-plugin-2');

		// Clicking toggle again should dismiss the editor plugins
		await toggleButton.click();
		await expect(mainScreen.noteEditor.codeMirrorEditor).toBeAttached();
		await expect(pluginFrame).not.toBeAttached();
	});

	test('should be possible to save changes to a note using the editor plugin API', async ({ startAppWithPlugins }) => {
		const { mainWindow, app } = await startAppWithPlugins(['resources/test-plugins/editorPluginSaving.js']);
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Test note');

		const noteEditor = mainScreen.noteEditor;
		await noteEditor.focusCodeMirrorEditor();
		await mainWindow.keyboard.type('Initial content.');

		const toggleButton = noteEditor.toggleEditorPluginButton;
		await toggleButton.click();

		// Should switch to the editor
		const pluginFrame = noteEditor.editorPluginFrame;
		await expect(pluginFrame).toBeAttached();
		const pluginFrameContent = pluginFrame.contentFrame();
		await expect(pluginFrameContent.getByText('Loaded!')).toBeAttached();

		// Editor plugin tests should pass
		await mainScreen.goToAnything.runCommand(app, 'testEditorPluginSave-test-editor-plugin');

		// Should have saved
		await toggleButton.click();
		const expectedUpdatedText = 'Changed by test-editor-plugin';
		await expect(noteEditor.codeMirrorEditor).toHaveText(expectedUpdatedText);

		// Regression test: Historically the editor's content would very briefly be correct, then
		// almost immediately be replaced with the old content. Doing another check after a brief
		// delay should cause the test to fail if this bug returns:
		await msleep(Second);
		await expect(noteEditor.codeMirrorEditor).toHaveText(expectedUpdatedText);
	});

	test('should support hiding and showing panels', async ({ startAppWithPlugins }) => {
		const { mainWindow, app } = await startAppWithPlugins(['resources/test-plugins/panels.js']);
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Test note (panels)');

		const panelLocator = await mainScreen.pluginPanelLocator('org.joplinapp.plugins.example.panels');

		const noteEditor = mainScreen.noteEditor;
		await mainScreen.goToAnything.runCommand(app, 'testShowPanel');
		await expect(noteEditor.codeMirrorEditor).toHaveText('visible');

		// Panel should be visible
		await expect(panelLocator).toBeVisible();
		// The panel should have the expected content
		const panelContent = panelLocator.contentFrame();
		await expect(
			panelContent.getByRole('heading', { name: 'Panel content' }),
		).toBeAttached();

		await mainScreen.goToAnything.runCommand(app, 'testHidePanel');
		await expect(noteEditor.codeMirrorEditor).toHaveText('hidden');

		await expect(panelLocator).not.toBeVisible();
	});
});

