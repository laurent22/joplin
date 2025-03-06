import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import { _electron as electron } from '@playwright/test';
import { writeFile } from 'fs-extra';
import { join } from 'path';
import createStartupArgs from './util/createStartupArgs';
import firstNonDevToolsWindow from './util/firstNonDevToolsWindow';
import setFilePickerResponse from './util/setFilePickerResponse';
import setMessageBoxResponse from './util/setMessageBoxResponse';
import getImageSourceSize from './util/getImageSourceSize';


test.describe('main', () => {
	test('app should launch', async ({ mainWindow }) => {
		// A window should open with the correct title
		expect(await mainWindow.title()).toMatch(/^Joplin/);

		const mainPage = await new MainScreen(mainWindow).setup();
		await mainPage.waitFor();
	});

	test('should be able to create and edit a new note', async ({ mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		const editor = await mainScreen.createNewNote('Test note');

		// Note list should contain the new note
		await expect(mainScreen.noteList.getNoteItemByTitle('Test note')).toBeVisible();

		// Focus the editor
		await editor.codeMirrorEditor.click();

		// Type some text
		await mainWindow.keyboard.type('# Test note!');
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.press('Enter');
		await mainWindow.keyboard.type('New note content!');

		// Should render
		const viewerFrame = editor.getNoteViewerFrameLocator();
		await expect(viewerFrame.locator('h1')).toHaveText('Test note!');
	});

	test('mermaid and KaTeX should render', async ({ mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		const editor = await mainScreen.createNewNote('🚧 Test 🚧');

		const testCommitId = 'bf59b2';
		await editor.focusCodeMirrorEditor();
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
		let firstLine = true;
		for (const line of noteText) {
			if (line) {
				if (!firstLine) {
					// Remove any auto-indentation, but avoid pressing shift-tab at
					// the beginning of the editor.
					await mainWindow.keyboard.press('Shift+Tab');
				}

				await mainWindow.keyboard.type(line);
			}
			await mainWindow.keyboard.press('Enter');
			firstLine = false;
		}

		// Should render mermaid
		const viewerFrame = editor.getNoteViewerFrameLocator();
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

	test('should correctly resize large images', async ({ electronApp, mainWindow }) => {
		const mainScreen = await new MainScreen(mainWindow).setup();
		await mainScreen.createNewNote('Image resize test (part 1)');
		const editor = mainScreen.noteEditor;

		await editor.focusCodeMirrorEditor();

		const filename = 'large-jpg-image-with-exif-rotation.jpg';
		await setFilePickerResponse(electronApp, [join(__dirname, 'resources', filename)]);

		// Should be possible to cancel attaching for large images
		await setMessageBoxResponse(electronApp, /^Cancel/i);
		await editor.attachFileButton.click();
		await expect(editor.codeMirrorEditor).toHaveText('', { useInnerText: true });

		// Clicking "No" should not resize
		await setMessageBoxResponse(electronApp, /^No/i);
		await editor.attachFileButton.click();

		const viewerFrame = editor.getNoteViewerFrameLocator();
		const renderedImage = viewerFrame.getByAltText(filename);

		const fullSize = await getImageSourceSize(renderedImage);

		// To make it easier to find the image (one image per note), we switch to a new, empty note.
		await mainScreen.createNewNote('Image resize test (part 2)');
		await editor.focusCodeMirrorEditor();

		// Clicking "Yes" should resize
		await setMessageBoxResponse(electronApp, /^Yes/i);
		await editor.attachFileButton.click();

		const resizedSize = await getImageSourceSize(renderedImage);
		expect(resizedSize[0]).toBeLessThan(fullSize[0]);
		expect(resizedSize[1]).toBeLessThan(fullSize[1]);

		// Should keep aspect ratio (regression test for #9597)
		expect(fullSize[0] / resizedSize[0]).toBeCloseTo(fullSize[1] / resizedSize[1]);
	});

	for (const target of ['', '_blank']) {
		test(`clicking on an external link with target=${JSON.stringify(target)} should try to launch a browser`, async ({ electronApp, mainWindow }) => {
			const mainScreen = await new MainScreen(mainWindow).setup();
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

			await mainWindow.evaluate(({ testLinkTitle, linkHref, target }) => {
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
				if (target) {
					testLink.target = target;
				}

				document.body.appendChild(testLink);
			}, { testLinkTitle, linkHref, target });

			const testLink = mainWindow.getByText(testLinkTitle);
			await expect(testLink).toBeVisible();
			await testLink.click({ noWaitAfter: true });

			expect(await nextExternalUrlPromise).toBe(linkHref);
		});
	}

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

