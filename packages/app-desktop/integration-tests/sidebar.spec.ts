import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';

test.describe('sidebar', () => {
	test('should be able to create new notebooks', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		for (let i = 0; i < 3; i++) {
			const title = `Test notebook ${i}`;
			await sidebar.createNewNotebook(title);
			await expect(sidebar.container.getByText(title)).toBeAttached();
		}

		// The first notebook should still be visible
		await expect(sidebar.container.getByText('Test notebook 0')).toBeAttached();
	});

	test('should allow changing the focused notebook with the arrow keys', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		const notebookAHeader = await sidebar.createNewNotebook('Notebook A');
		await expect(notebookAHeader).toBeVisible();

		const notebookBHeader = await sidebar.createNewNotebook('Notebook B');
		await expect(notebookBHeader).toBeVisible();
		await notebookBHeader.click();

		await sidebar.forceUpdateSorting(electronApp);

		await notebookBHeader.click();
		await mainWindow.keyboard.press('ArrowUp');
		await expect(mainWindow.locator(':focus')).toHaveText('Notebook A');
		await mainWindow.keyboard.press('ArrowDown');
		await expect(mainWindow.locator(':focus')).toHaveText('Notebook B');
		await mainWindow.keyboard.press('ArrowUp');
		await expect(mainWindow.locator(':focus')).toHaveText('Notebook A');
		await mainWindow.keyboard.press('ArrowUp');
		await expect(mainWindow.locator(':focus')).toHaveText('All notes');
		await mainWindow.keyboard.press('ArrowUp');
		await expect(mainWindow.locator(':focus')).toHaveText(/NOTEBOOKS/i);
		await mainWindow.keyboard.press('ArrowDown');
		await expect(mainWindow.locator(':focus')).toHaveText('All notes');
	});

	test('should focus the note list when pressing tab', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		const notebookAHeader = await sidebar.createNewNotebook('Notebook A');
		await expect(notebookAHeader).toBeAttached();
		await notebookAHeader.click();

		await sidebar.forceUpdateSorting(electronApp);

		await mainScreen.createNewNote('Test note A');

		await notebookAHeader.click();
		await expect(mainWindow.locator(':focus')).toHaveText('Notebook A');

		// Tab should switch to the notebook list
		await mainWindow.keyboard.press('Tab');
		await expect(mainWindow.locator(':focus')).toHaveText('Test note A');

		// Shift-tab should navigate back
		await mainWindow.keyboard.down('Shift');
		await mainWindow.keyboard.press('Tab');
		await mainWindow.keyboard.up('Shift');

		// Only check beginning of text -- may have a note count number
		await expect(mainWindow.locator(':focus')).toHaveText(/^Notebook A/);
	});

	test('should allow changing the parent of a notebook by drag-and-drop', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const sidebar = mainScreen.sidebar;

		const parentNotebookHeader = await sidebar.createNewNotebook('Parent notebook');
		await expect(parentNotebookHeader).toBeVisible();

		const childNotebookHeader = await sidebar.createNewNotebook('Child notebook');
		await expect(childNotebookHeader).toBeVisible();

		await sidebar.forceUpdateSorting(electronApp);

		await childNotebookHeader.dragTo(parentNotebookHeader);

		// Verify that it's now a child notebook -- expand and collapse the parent
		const collapseButton = sidebar.container.getByRole('link', { name: 'Collapse Parent notebook' });
		await expect(collapseButton).toBeVisible();
		await collapseButton.click();

		// Should be collapsed
		await expect(childNotebookHeader).not.toBeAttached();

		const expandButton = sidebar.container.getByRole('link', { name: 'Expand Parent notebook' });
		await expandButton.click();

		// Should be possible to move back to the root
		const rootNotebookHeader = sidebar.container.getByText('Notebooks');
		await childNotebookHeader.dragTo(rootNotebookHeader);
		await expect(collapseButton).not.toBeVisible();
		await expect(expandButton).not.toBeVisible();
	});
});
