import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../testing/createTestEditor';
import renderBlockImages, { resetImageResourceEffect, testing__resetImageRefreshCounterCache } from './renderBlockImages';
import { EditorView } from '@codemirror/view';

const allowImageUrlsToBeFetched = async () => {
	// Yield to the event loop. Since image URLs are fetched asynchronously, this is needed to
	// allow the asynchronous promise code to run
	await Promise.resolve();
};

const createEditor = async (initialMarkdown: string, expectedTags: string[] = ['Image']) => {
	const resolveImageSrc = jest.fn((src, counter) => Promise.resolve(`${src}?r=${counter}`));
	const editor = await createTestEditor(
		initialMarkdown,
		EditorSelection.cursor(0),
		expectedTags,
		[renderBlockImages({ resolveImageSrc })],
	);
	await allowImageUrlsToBeFetched();
	return editor;
};

const findImages = (editor: EditorView) => {
	return editor.dom.querySelectorAll<HTMLImageElement>('div.cm-md-image > .image');
};

const getImageUrls = (editor: EditorView) => {
	return [...findImages(editor)].map(image => image.getAttribute('src'));
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
		const editor = await createEditor(`${spaceBefore}![${alt}](:/0123456789abcdef0123456789abcdef)${spaceAfter}`);

		const images = findImages(editor);
		expect(images).toHaveLength(1);
		expect(images[0].role).toBe('image');
		expect(images[0].ariaLabel).toBe(alt);
	});

	// For now, only Joplin resources are rendered. This simplifies the implementation and avoids
	// potentially-unwanted web requests when opening a note with only the editor open.
	test('should not render web images', async () => {
		const editor = await createEditor('![test](https://example.com/test.png)\n\n');
		const images = findImages(editor);
		expect(images).toHaveLength(0);
	});

	test('should allow reloading specific images', async () => {
		const editor = await createEditor('![test](:/a123456789abcdef0123456789abcdef)\n![test 2](:/b123456789abcdef0123456789abcde2)');

		// Should have the expected original image URLs
		expect(getImageUrls(editor)).toMatchObject([
			':/a123456789abcdef0123456789abcdef?r=0',
			':/b123456789abcdef0123456789abcde2?r=0',
		]);

		editor.dispatch({
			effects: [resetImageResourceEffect.of({ id: 'a123456789abcdef0123456789abcdef' })],
		});
		await allowImageUrlsToBeFetched();

		expect(getImageUrls(editor)).toMatchObject([
			':/a123456789abcdef0123456789abcdef?r=1',
			':/b123456789abcdef0123456789abcde2?r=0',
		]);

		editor.dispatch({
			effects: [
				resetImageResourceEffect.of({ id: 'a123456789abcdef0123456789abcdef' }),
				resetImageResourceEffect.of({ id: 'b123456789abcdef0123456789abcde2' }),
			],
		});
		await allowImageUrlsToBeFetched();

		expect(getImageUrls(editor)).toMatchObject([
			':/a123456789abcdef0123456789abcdef?r=2',
			':/b123456789abcdef0123456789abcde2?r=1',
		]);
	});

	test.each([
		{ spaceBefore: '', spaceAfter: '\n\n', alt: 'test', width: null },
		{ spaceBefore: '', spaceAfter: '', alt: 'This is a test!', width: null },
		{ spaceBefore: '   ', spaceAfter: ' ', alt: 'test', width: null },
		{ spaceBefore: '', spaceAfter: '', alt: '!!!!', width: '500' },
	])('should render HTML img tags (case %#)', async ({ spaceBefore, spaceAfter, alt, width }) => {
		const widthAttr = width ? ` width="${width}"` : '';
		const editor = await createEditor(
			`${spaceBefore}<img src=":/0123456789abcdef0123456789abcdef" alt="${alt}"${widthAttr} />${spaceAfter}`,
			['HTMLTag'],
		);

		const images = findImages(editor);
		expect(images).toHaveLength(1);
		expect(images[0].role).toBe('image');
		expect(images[0].ariaLabel).toBe(alt);

		if (width) {
			expect(images[0].style.width).toBe(`${width}px`);
			expect(images[0].style.height).toBe('auto');
		} else {
			expect(images[0].style.width).toBe('');
		}
	});

	test('should render non-self-closing HTML img tags', async () => {
		const editor = await createEditor(
			'<img src=":/0123456789abcdef0123456789abcdef" alt="test" width="300">',
			['HTMLBlock'],
		);

		const images = findImages(editor);
		expect(images).toHaveLength(1);
		expect(images[0].style.width).toBe('300px');
	});

	test('should not render HTML img tags with web URLs', async () => {
		const editor = await createEditor(
			'<img src="https://example.com/test.png" alt="test" />',
			['HTMLTag'],
		);

		const images = findImages(editor);
		expect(images).toHaveLength(0);
	});

	test('should render both markdown and HTML images in same document', async () => {
		const editor = await createEditor(
			'![markdown](:/a123456789abcdef0123456789abcdef)\n\n<img src=":/b123456789abcdef0123456789abcde2" alt="html" width="400" />',
			['Image', 'HTMLTag'],
		);

		const images = findImages(editor);
		expect(images).toHaveLength(2);
		expect(images[0].style.width).toBe(''); // markdown - no width
		expect(images[1].style.width).toBe('400px'); // HTML with width
	});

	test('should render HTML img tags with single-quoted attributes', async () => {
		const editor = await createEditor(
			// eslint-disable-next-line quotes
			"<img src=':/0123456789abcdef0123456789abcdef' alt='test' width='250' />",
			['HTMLTag'],
		);

		const images = findImages(editor);
		expect(images).toHaveLength(1);
		expect(images[0].ariaLabel).toBe('test');
		expect(images[0].style.width).toBe('250px');
	});
});
