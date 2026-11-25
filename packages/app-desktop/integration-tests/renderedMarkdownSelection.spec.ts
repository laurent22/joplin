import { Locator } from '@playwright/test';
import { test, expect } from './util/test';
import MainScreen from './models/MainScreen';
import setSettingValue from './util/setSettingValue';

// Use real text geometry and mouse events rather than assigning a CodeMirror
// selection: the regressions here involve browser hit testing and DOM updates.
const positionInLine = (line: Locator, position: number) => line.evaluate((element, position) => {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	while (walker.nextNode()) {
		const node = walker.currentNode;
		if (position <= node.textContent.length) {
			const range = document.createRange();
			range.setStart(node, position);
			range.collapse(true);
			const rect = range.getBoundingClientRect();
			return { x: rect.left, y: (rect.top + rect.bottom) / 2 };
		}
		position -= node.textContent.length;
	}
	throw new Error('Position outside the line');
}, position);

test.describe('rendered Markdown selections', () => {
	for (const { markdown, hiddenCount, selections } of [
		{ markdown: 'This is **bold** text', hiddenCount: 2, selections: [
			{ from: 0, to: 14, expected: 'This is **bold**' },
			{ from: 10, to: 21, expected: '**bold** text' },
			{ from: 10, to: 14, expected: '**bold**' },
		] },
		{ markdown: '# Heading', hiddenCount: 1, selections: [{ from: 2, to: 9, expected: '# Heading' }] },
	]) {
		test(`should keep syntax hidden while dragging over "${markdown}" and include it on release`, async ({ mainWindow, electronApp }) => {
			await setSettingValue(electronApp, mainWindow, 'editor.inlineRendering', true);
			const mainScreen = await new MainScreen(mainWindow).setup();
			await mainScreen.createNewNote('Rendered selections');
			const editor = await mainScreen.noteEditor.showMarkdownEditor();
			await editor.typeText(markdown);
			await editor.pressKey('Enter');
			await editor.pressKey('Enter');
			await editor.typeText('Away');

			const line = editor.content.locator('.cm-line').first();
			const selectedText = () => editor.content.evaluate(() => getSelection().toString());
			for (const selection of selections) {
				for (const backward of [false, true]) {
					await editor.content.getByText('Away', { exact: true }).click();
					await expect(line.locator('.cm-hidden')).toHaveCount(hiddenCount);
					const start = await positionInLine(line, backward ? selection.to : selection.from);
					const end = await positionInLine(line, backward ? selection.from : selection.to);
					await mainWindow.mouse.move(start.x, start.y);
					await mainWindow.mouse.down();
					try {
						await mainWindow.mouse.move(end.x, end.y, { steps: 10 });
						const duringDrag = await selectedText();
						// Repeating the same hit test should neither flicker nor reveal syntax.
						for (let repeat = 0; repeat < 3; repeat++) {
							await mainWindow.mouse.move(end.x, end.y);
							await expect(line.locator('.cm-hidden')).toHaveCount(hiddenCount);
							expect(await selectedText()).toBe(duringDrag);
						}
					} finally {
						await mainWindow.mouse.up();
					}
					await expect.poll(selectedText).toBe(selection.expected);
				}
			}
		});
	}
});
