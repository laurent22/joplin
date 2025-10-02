import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../testing/createTestEditor';
import renderBlockImages, { resetImageResourceEffect, testing__resetImageRefreshCounterCache } from './renderBlockImages';
import { EditorView } from '@codemirror/view';

const allowImageUrlsToBeFetched = async () => {
	// Yield to the event loop. Since image URLs are fetched asynchronously, this is needed to
	// allow the asynchronous promise code to run
	await Promise.resolve();
};

const createEditor = async (initialMarkdown: string, hasImage: boolean) => {
	const resolveImageSrc = jest.fn((src, counter) => Promise.resolve(`${src}?r=${counter}`));
	const editor = await createTestEditor(
		initialMarkdown,
		EditorSelection.cursor(0),
		hasImage ? ['Image'] : [],
		[renderBlockImages({ resolveImageSrc })],
	);
	await allowImageUrlsToBeFetched();
	return editor;
};

const findImages = (editor: EditorView) => {
	return editor.dom.querySelectorAll<HTMLDivElement>('div.cm-md-image > .image');
};

const getImageBackgroundUrls = (editor: EditorView) => {
	return [...findImages(editor)].map(image => image.style.backgroundImage);
};

describe('renderBlockImages', () => {
	beforeEach(() => {
		testing__resetImageRefreshCounterCache();
	});

	test.each([
		{ spaceBefore: '', spaceAfter: '\n\n', alt: 'test' },
		{ spaceBefore: '', spaceAfter: '', alt: 'This is a test!' },
		{ spaceBefore: '   ', spaceAfter: ' ', alt: 'test' },
		{ spaceBefore: '', spaceAfter: '', alt: '!!!!' },
	])('should render images below their Markdown source (case %#)', async ({ spaceBefore, spaceAfter, alt }) => {
		const editor = await createEditor(`${spaceBefore}![${alt}](:/0123456789abcdef0123456789abcdef)${spaceAfter}`, true);

		const images = findImages(editor);
		expect(images).toHaveLength(1);
		expect(images[0].role).toBe('image');
		expect(images[0].ariaLabel).toBe(alt);
	});

	// For now, only Joplin resources are rendered. This simplifies the implementation and avoids
	// potentially-unwanted web requests when opening a note with only the editor open.
	test('should not render web images', async () => {
		const editor = await createEditor('![test](https://example.com/test.png)\n\n', true);
		const images = findImages(editor);
		expect(images).toHaveLength(0);
	});

	test('should allow reloading specific images', async () => {
		const editor = await createEditor('![test](:/a123456789abcdef0123456789abcdef)\n![test 2](:/b123456789abcdef0123456789abcde2)', true);

		// Should have the expected original image URLs
		expect(getImageBackgroundUrls(editor)).toMatchObject([
			'url(:/a123456789abcdef0123456789abcdef?r=0)',
			'url(:/b123456789abcdef0123456789abcde2?r=0)',
		]);

		editor.dispatch({
			effects: [resetImageResourceEffect.of({ id: 'a123456789abcdef0123456789abcdef' })],
		});
		await allowImageUrlsToBeFetched();

		expect(getImageBackgroundUrls(editor)).toMatchObject([
			'url(:/a123456789abcdef0123456789abcdef?r=1)',
			'url(:/b123456789abcdef0123456789abcde2?r=0)',
		]);

		editor.dispatch({
			effects: [
				resetImageResourceEffect.of({ id: 'a123456789abcdef0123456789abcdef' }),
				resetImageResourceEffect.of({ id: 'b123456789abcdef0123456789abcde2' }),
			],
		});
		await allowImageUrlsToBeFetched();

		expect(getImageBackgroundUrls(editor)).toMatchObject([
			'url(:/a123456789abcdef0123456789abcdef?r=2)',
			'url(:/b123456789abcdef0123456789abcde2?r=1)',
		]);
	});
});
