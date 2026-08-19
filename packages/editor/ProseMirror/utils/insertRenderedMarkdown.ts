import { EditorView } from 'prosemirror-view';
import { getEditorApi } from '../plugins/joplinEditorApiPlugin';

const insertRenderedMarkdown = async (
	view: EditorView,
	markdown: string,
) => {
	const renderer = getEditorApi(view.state).renderer;

	const rendered = await renderer.renderMarkupToHtml(markdown, {
		forceMarkdown: true,
		isFullPageRender: false,
	});
	view.pasteHTML(rendered.html);
};

export default insertRenderedMarkdown;
