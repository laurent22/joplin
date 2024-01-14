import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import SettingsScreen from './models/SettingsScreen';
import { _electron as electron } from '@playwright/test';
import { writeFile } from 'fs-extra';
import { join } from 'path';
import createStartupArgs from './util/createStartupArgs';
import firstNonDevToolsWindow from './util/firstNonDevToolsWindow';
import setFilePickerResponse from './util/setFilePickerResponse';


test.describe('main', () => {
	test('app should launch', async ({ mainWindow }) => {
		// A window should open with the correct title
		expect(await mainWindow.title()).toMatch(/^Joplin/);

		const mainPage = new MainScreen(mainWindow);
		await mainPage.waitFor();
	});

	test('should be able to create and edit a new note', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const editor = await mainScreen.createNewNote('Test note');

		// Note list should contain the new note
		await expect(mainScreen.noteListContainer.getByText('Test note')).toBeVisible();

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

	test('mermaid and KaTeX should render', async ({ mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		const editor = await mainScreen.createNewNote('🚧 Test 🚧');

		const testCommitId = 'bf59b2';
		await editor.codeMirrorEditor.click();
		const noteText = [
			'```mermaid',
			'gitGraph',
			'    commit id: "973193"',
			`    commit id: "${testCommitId}"`,
			'    branch dev',
			'    checkout dev',
			'    commit id: "ceea77"',
			'```',
			'',
			'',
			'KaTeX:',
			'$$ \\int_0^1 \\cos(2x + 3) $$',
			'',
			'Sum: $\\sum_{x=0}^{100} \\tan x$',
		];
		for (const line of noteText) {
			if (line) {
				await mainWindow.keyboard.press('Shift+Tab');
				await mainWindow.keyboard.type(line);
			}
			await mainWindow.keyboard.press('Enter');
		}

		// Should render mermaid
		const viewerFrame = editor.getNoteViewerIframe();
		await expect(
			viewerFrame.locator('pre.mermaid text', { hasText: testCommitId }),
		).toBeVisible();

		// Should render KaTeX (block)
		// toBeAttached: To be added to the DOM.
		await expect(viewerFrame.locator('.joplin-editable > .katex-display').first()).toBeAttached();
		await expect(
			viewerFrame.locator(
				'.katex-display *', { hasText: 'cos' },
			).last(),
		).toBeVisible();

		// Should render KaTeX (inline)
		await expect(viewerFrame.locator('.joplin-editable > .katex').first()).toBeAttached();
	});

	test('HTML links should be preserved when editing a note in the WYSIWYG editor', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.createNewNote('Testing!');
		const editor = mainScreen.noteEditor;

		// Set the note's content
		await editor.codeMirrorEditor.click();

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

	test('should be possible to remove sort order buttons in settings', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.waitFor();

		// Sort order buttons should be visible by default
		await expect(mainScreen.noteListContainer.locator('[title^="Toggle sort order"]')).toBeVisible();

		await mainScreen.openSettings(electronApp);

		// Should be on the settings screen
		const settingsScreen = new SettingsScreen(mainWindow);
		await settingsScreen.waitFor();

		// Open the appearance tab
		await settingsScreen.appearanceTabButton.click();

		// Find the sort order visible checkbox
		const sortOrderVisibleCheckbox = mainWindow.getByLabel(/^Show sort order/);

		await expect(sortOrderVisibleCheckbox).toBeChecked();
		await sortOrderVisibleCheckbox.click();
		await expect(sortOrderVisibleCheckbox).not.toBeChecked();

		// Save settings & close
		await settingsScreen.okayButton.click();
		await mainScreen.waitFor();

		await expect(mainScreen.noteListContainer.locator('[title^="Toggle sort order"]')).not.toBeVisible();
	});

	test('clicking on an external link should try to launch a browser', async ({ electronApp, mainWindow }) => {
		const mainScreen = new MainScreen(mainWindow);
		await mainScreen.waitFor();

		// Mock openExternal
		const nextExternalUrlPromise = electronApp.evaluate(({ shell }) => {
			return new Promise<string>(resolve => {
				const openExternal = async (url: string) => {
					resolve(url);
				};
				shell.openExternal = openExternal;
			});
		});

		// Create a test link
		const testLinkTitle = 'This is a test link!';
		const linkHref = 'https://joplinapp.org/';

		await mainWindow.evaluate(({ testLinkTitle, linkHref }) => {
			const testLink = document.createElement('a');
			testLink.textContent = testLinkTitle;
			testLink.onclick = () => {
				// We need to navigate by setting location.href -- clicking on a link
				// directly within the main window (i.e. not in a PDF viewer) doesn't
				// navigate.
				location.href = linkHref;
			};
			testLink.href = '#';

			// Display on top of everything
			testLink.style.zIndex = '99999';
			testLink.style.position = 'fixed';
			testLink.style.top = '0';
			testLink.style.left = '0';

			document.body.appendChild(testLink);
		}, { testLinkTitle, linkHref });

		const testLink = mainWindow.getByText(testLinkTitle);
		await expect(testLink).toBeVisible();
		await testLink.click({ noWaitAfter: true });

		expect(await nextExternalUrlPromise).toBe(linkHref);
	});

	test('should start in safe mode if profile-dir/force-safe-mode-on-next-start exists', async ({ profileDirectory }) => {
		await writeFile(join(profileDirectory, 'force-safe-mode-on-next-start'), 'true', 'utf8');

		// We need to write to the force-safe-mode file before opening the Electron app.
		// Open the app ourselves:
		const startupArgs = createStartupArgs(profileDirectory);
		const electronApp = await electron.launch({ args: startupArgs });
		const mainWindow = await firstNonDevToolsWindow(electronApp);

		const safeModeDisableLink = mainWindow.getByText('Disable safe mode and restart');
		await safeModeDisableLink.waitFor();
		await expect(safeModeDisableLink).toBeInViewport();

		await electronApp.close();
	});
});

