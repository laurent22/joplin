import { Command } from 'prosemirror-state';
import { getEditorApi } from '../joplinEditorApiPlugin';
import createEditorDialog from './utils/createEditorDialog';
import postProcessRenderedHtml from './utils/postProcessRenderedHtml';
import schema from '../../schema';
import { JoplinEditableAttributes } from './joplinEditablePlugin';

interface EditablePromptOptions {
	source: string;
	inline: boolean;
	cursor: number;
}

const showCreateEditablePrompt = ({ source, inline, cursor }: EditablePromptOptions): Command => (_state, dispatch, view) => {
	if (!dispatch) return true;
	if (!view) throw new Error('Missing required argument: view');

	createEditorDialog({
		editorApi: getEditorApi(view.state),
		source,
		cursor,
		onSave: async (newSource) => {
			source = newSource;
		},
		onDismiss: async () => {
			const rendered = await getEditorApi(view.state).renderer.renderMarkupToHtml(
				source,
				{ forceMarkdown: true, isFullPageRender: false },
			);

			const html = postProcessRenderedHtml(rendered.html, inline);
			const state = view.state;
			const node = inline ? schema.nodes.joplinEditableInline : schema.nodes.joplinEditableBlock;
			const tr = state.tr.replaceSelectionWith(
				node.create({
					contentHtml: html,
					source,
					closeCharacters: '',
					openCharacters: '',
					language: '',
					readOnly: false,
				} satisfies JoplinEditableAttributes),
			);
			view.dispatch(tr);

			// Required by certain renderer plugins:
			document.dispatchEvent(new Event('joplin-noteDidUpdate'));
		},
	});
	return true;
};

export default showCreateEditablePrompt;
