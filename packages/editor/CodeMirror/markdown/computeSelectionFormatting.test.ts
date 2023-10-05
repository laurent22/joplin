import { EditorSelection } from '@codemirror/state';
import createTestEditor from '../testUtil/createTestEditor';
import computeSelectionFormatting from './computeSelectionFormatting';


describe('computeSelectionFormatting', () => {
	// The below tests rely on CodeMirror to correctly parse the document, which
	// can be buggy (and fail very rarely).
	jest.retryTimes(2);

	it('should correctly compute formatting for partial links', async () => {
		// Start with the selection midway through the link
		const editor = await createTestEditor('A [partial link]', EditorSelection.cursor(4), ['Link']);

		const formatting = computeSelectionFormatting(editor.state, false);
		expect(formatting.linkData).toMatchObject({
			linkText: null,
			linkURL: null,
		});
	});
});
