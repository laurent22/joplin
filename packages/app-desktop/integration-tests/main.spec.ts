import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { mkdirs, rm } from 'fs-extra';
import { join, resolve } from 'node:path';
import MainScreen from './models/MainScreen';


// Tests in this file need to be run one-at-a-time because -- we use a single
// application.
test.describe.configure({ mode: 'serial' });

let electronApp: ElectronApplication;
let mainWindow: Page;


const profilePath = resolve(join(__dirname, 'test-profile'));
const startupArgs = ['main.js', '--env', 'dev', '--profile', profilePath];

test.beforeAll(async () => {
	await mkdirs(profilePath);

	electronApp = await electron.launch({ args: startupArgs });
	mainWindow = await electronApp.firstWindow();
});

test.afterAll(async () => {
	await electronApp.close();

	await rm(profilePath, { recursive: true });
});

test.describe('main', () => {
	test('app should launch', async () => {
		// A window should open with the correct title
		expect(await mainWindow.title()).toMatch(/^Joplin/);

		const mainPage = new MainScreen(mainWindow);
		await mainPage.waitFor();
	});

	test('should be able to create and edit a new note', async () => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.newNoteButton.click();

		const editor = mainScreen.noteEditor;
		await editor.waitFor();

		// Wait for the title input to have the correct placeholder
		await mainWindow.locator('input[placeholder^="Creating new note"]').waitFor();

		// Fill the title
		await editor.noteTitleInput.fill('Test note');

		// Note list should contain the new note
		await mainScreen.noteList.getByText('Test note').waitFor();

		// Focus the editor
		await editor.codeMirrorEditor.click();

		// Type some text
		await mainWindow.keyboard.type('# Test note!');
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.type('New note content!');

		// Should render
		const viewerFrame = editor.getNoteViewerIframe();
		await expect(viewerFrame.locator('h1')).toHaveText('Test note!');
	});
});
