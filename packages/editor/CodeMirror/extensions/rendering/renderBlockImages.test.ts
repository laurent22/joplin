import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../../testing/createTestEditor';
import renderBlockImages from './renderBlockImages';
import { EditorView } from '@codemirror/view';

const createEditor = (initialMarkdown: string, hasImage: boolean) => {
	const resolveImageSrc = jest.fn(src => Promise.resolve(src));
	return createTestEditor(
		initialMarkdown,
		EditorSelection.cursor(0),
		hasImage ? ['Image'] : [],
		[renderBlockImages({ resolveImageSrc })],
	);
};

const findImage = (editor: EditorView) => {
	return editor.dom.querySelector('div.cm-md-image > .image');
};

describe('renderBlockImages', () => {
	test.each([
		{ spaceBefore: '', spaceAfter: '\n\n', alt: 'test' },
		{ spaceBefore: '', spaceAfter: '', alt: 'This is a test!' },
		{ spaceBefore: '   ', spaceAfter: ' ', alt: 'test' },
		{ spaceBefore: '', spaceAfter: '', alt: '!!!!' },
	])('should render images below their Markdown source (case %#)', async ({ spaceBefore, spaceAfter, alt }) => {
		const editor = await createEditor(`${spaceBefore}![${alt}](:/0123456789abcdef0123456789abcdef)${spaceAfter}`, true);

		const image = findImage(editor);
		expect(image).toBeTruthy();
		expect(image.role).toBe('image');
		expect(image.ariaLabel).toBe(alt);
	});

	// For now, only Joplin resources are rendered. This simplifies the implementation and avoids
	// potentially-unwanted web requests when opening a note with only the editor open.
	test('should not render web images', async () => {
		const editor = await createEditor('![test](https://example.com/test.png)\n\n', true);
		const image = findImage(editor);
		expect(image).toBeNull();
	});
});
