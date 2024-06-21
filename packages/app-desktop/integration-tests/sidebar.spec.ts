import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';

test.describe('sidebar', () => {
	test('should be able to create new folders', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		for (let i = 0; i < 3; i++) {
			const title = `Test folder ${i}`;
			await sidebar.createNewFolder(title);
			await expect(sidebar.container.getByText(title)).toBeAttached();
		}

		// The first folder should still be visible
		await expect(sidebar.container.getByText('Test folder 0')).toBeAttached();
	});

	test('should allow changing the focused folder with the arrow keys', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		const folderAHeader = await sidebar.createNewFolder('Folder A');
		await expect(folderAHeader).toBeVisible();

		const folderBHeader = await sidebar.createNewFolder('Folder B');
		await expect(folderBHeader).toBeVisible();
		await folderBHeader.click();

		await sidebar.forceUpdateSorting(electronApp);

		await folderBHeader.click();
		await mainWindow.keyboard.press('ArrowUp');
		await expect(mainWindow.locator(':focus')).toHaveText('Folder A');
		await mainWindow.keyboard.press('ArrowDown');
		await expect(mainWindow.locator(':focus')).toHaveText('Folder B');
		await mainWindow.keyboard.press('ArrowUp');
		await expect(mainWindow.locator(':focus')).toHaveText('Folder A');
		await mainWindow.keyboard.press('ArrowUp');
		await expect(mainWindow.locator(':focus')).toHaveText('All notes');
		await mainWindow.keyboard.press('ArrowUp');
		await expect(mainWindow.locator(':focus')).toHaveText(/NOTEBOOKS/i);
		await mainWindow.keyboard.press('ArrowDown');
		await expect(mainWindow.locator(':focus')).toHaveText('All notes');
	});

	test('should allow changing the parent of a folder by drag-and-drop', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		const parentFolderHeader = await sidebar.createNewFolder('Parent folder');
		await expect(parentFolderHeader).toBeVisible();

		const childFolderHeader = await sidebar.createNewFolder('Child folder');
		await expect(childFolderHeader).toBeVisible();

		await sidebar.forceUpdateSorting(electronApp);

		await childFolderHeader.dragTo(parentFolderHeader);

		// Verify that it's now a child folder -- expand and collapse the parent
		const collapseButton = sidebar.container.getByRole('link', { name: 'Collapse Parent folder' });
		await expect(collapseButton).toBeVisible();
		await collapseButton.click();

		// Should be collapsed
		await expect(childFolderHeader).not.toBeAttached();

		const expandButton = sidebar.container.getByRole('link', { name: 'Expand Parent folder' });
		await expandButton.click();

		// Should be possible to move back to the root
		const rootFolderHeader = sidebar.container.getByText('Notebooks');
		await childFolderHeader.dragTo(rootFolderHeader);
		await expect(collapseButton).not.toBeVisible();
		await expect(expandButton).not.toBeVisible();
	});

	test('all notes section should list all notes', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		const testFolderA = await sidebar.createNewFolder('Folder A');
		await expect(testFolderA).toBeAttached();

		await sidebar.forceUpdateSorting(electronApp);

		await mainScreen.createNewNote('A note in Folder A');
		await expect(mainWindow.getByText('A note in Folder A')).toBeAttached();
		await mainScreen.createNewNote('Another note in Folder A');

		const testFolderB = await sidebar.createNewFolder('Folder B');
		await expect(testFolderB).toBeAttached();

		await mainScreen.createNewNote('A note in Folder B');

		const allNotesButton = sidebar.container.getByText('All notes');
		await allNotesButton.click();

		await expect(mainWindow.getByText('A note in Folder A')).toBeAttached();
		await expect(mainWindow.getByText('Another note in Folder A')).toBeAttached();
		await expect(mainWindow.getByText('A note in Folder B')).toBeAttached();
	});
});
