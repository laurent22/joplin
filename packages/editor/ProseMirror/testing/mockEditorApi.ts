import { EditorView } from 'prosemirror-view';
import joplinEditorApiPlugin, { getEditorApi, setEditorApi } from '../plugins/joplinEditorApiPlugin';
import { htmlentities } from '@joplin/utils/html';
import { RenderResult } from '../../../renderer/types';

const mockEditorApi = () => {
	const setup = (editor: EditorView) => {
		editor.dispatch(setEditorApi(editor.state.tr, {
			...getEditorApi(editor.state),
			renderer: {
				renderMarkupToHtml: jest.fn(async source => ({
					html: `<pre class="joplin-source">${htmlentities(source)}</pre><p class="test-content">Mocked!</p></div>`,
				} as RenderResult)),
				renderHtmlToMarkup: jest.fn(),
			},
		}));
	};

	return {
		plugin: joplinEditorApiPlugin,
		setup,
	};
};

export default mockEditorApi;
