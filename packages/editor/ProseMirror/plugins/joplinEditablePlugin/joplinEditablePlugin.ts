import { Command, EditorState, Plugin } from 'prosemirror-state';
import { Node, NodeSpec, TagParseRule } from 'prosemirror-model';
import { EditorView, NodeView } from 'prosemirror-view';
import sanitizeHtml from '../../utils/sanitizeHtml';
import createEditorDialog from './createEditorDialog';
import { getEditorApi } from '../joplinEditorApiPlugin';
import { msleep } from '@joplin/utils/time';
import postProcessRenderedHtml from './postProcessRenderedHtml';
import createButton from '../../utils/dom/createButton';
import makeLinksClickableInElement from '../../utils/makeLinksClickableInElement';

// See the fold example for more information about
// writing similar ProseMirror plugins:
// https://prosemirror.net/examples/fold/

type EditRequest = {
	nodeStart: number;
	showEditor: true;
} | {
	nodeStart?: undefined;
	showEditor: false;
};

export const editSourceBlockAt = (nodeStart: number): Command => (state, dispatch) => {
	const node = state.doc.nodeAt(nodeStart);
	if (node.type.name !== 'joplinEditableInline' && node.type.name !== 'joplinEditableBlock') {
		return false;
	}

	if (dispatch) {
		const editRequest: EditRequest = {
			nodeStart,
			showEditor: true,
		};
		dispatch(state.tr.setMeta(joplinEditablePlugin, editRequest));
	}

	return true;
};

const isSourceBlockEditorVisible = (state: EditorState) => {
	return joplinEditablePlugin.getState(state).editingNodeAt !== null;
};

export const hideSourceBlockEditor: Command = (state, dispatch) => {
	const isEditing = isSourceBlockEditorVisible(state);
	if (!isEditing) {
		return false;
	}

	if (dispatch) {
		const editRequest: EditRequest = {
			showEditor: false,
		};
		dispatch(state.tr.setMeta(joplinEditablePlugin, editRequest));
	}

	return true;
};

const createDialogForNode = (nodePosition: number, view: EditorView) => {
	let saveCounter = 0;

	const getNode = () => (
		view.state.doc.nodeAt(nodePosition)
	);

	const { localize: _ } = getEditorApi(view.state);
	const { dismiss } = createEditorDialog({
		doneLabel: _('Done'),
		editorLabel: _('Code:'),
		editorApi: getEditorApi(view.state),
		block: {
			content: getNode().attrs.source,
			start: getNode().attrs.openCharacters,
			end: getNode().attrs.closeCharacters,
		},
		onSave: async (block) => {
			view.dispatch(
				view.state.tr.setNodeAttribute(
					nodePosition, 'source', block.content,
				).setNodeAttribute(
					nodePosition, 'openCharacters', block.start,
				).setNodeAttribute(
					nodePosition, 'closeCharacters', block.end,
				),
			);

			saveCounter ++;
			const initialSaveCounter = saveCounter;
			const cancelled = () => saveCounter !== initialSaveCounter;

			// Debounce rendering
			await msleep(400);
			if (cancelled()) return;

			const rendered = await getEditorApi(view.state).renderer.renderMarkupToHtml(
				`${block.start}${block.content}${block.end}`,
				{ forceMarkdown: true, isFullPageRender: false },
			);
			if (cancelled()) return;

			const html = postProcessRenderedHtml(rendered.html, getNode().isInline);
			view.dispatch(
				view.state.tr.setNodeAttribute(
					nodePosition, 'contentHtml', html,
				),
			);
		},
		onDismiss: () => {
			hideSourceBlockEditor(view.state, view.dispatch, view);
		},
	});

	return {
		onPositionChange: (newPosition: number) => {
			nodePosition = newPosition;
		},
		dismiss,
	};
};

type DialogHandle = ReturnType<typeof createDialogForNode>;


interface JoplinEditableAttributes {
	contentHtml: string;
	source: string;
	language: string;
	openCharacters: string;
	closeCharacters: string;
	readOnly: boolean;
}

const joplinEditableAttributes = {
	contentHtml: { default: '', validate: 'string' },
	source: { default: '', validate: 'string' },
	language: { default: '', validate: 'string' },
	openCharacters: { default: '', validate: 'string' },
	closeCharacters: { default: '', validate: 'string' },
	readOnly: { default: false, validate: 'boolean' },
} satisfies Record<keyof JoplinEditableAttributes, unknown>;

const makeJoplinEditableSpec = (
	inline: boolean,
	// Additional tags that should be interpreted as joplinEditable-like blocks.
	additionalParseRules: TagParseRule[],
): NodeSpec => ({
	group: inline ? 'inline' : 'block',
	inline: inline,
	draggable: true,
	attrs: joplinEditableAttributes,
	parseDOM: [
		{
			tag: `${inline ? 'span' : 'div'}.joplin-editable`,
			getAttrs: (node): Partial<JoplinEditableAttributes> => {
				const sourceNode = node.querySelector('.joplin-source');
				return {
					contentHtml: node.innerHTML,
					source: sourceNode?.textContent,
					openCharacters: sourceNode?.getAttribute('data-joplin-source-open'),
					closeCharacters: sourceNode?.getAttribute('data-joplin-source-close'),
					language: sourceNode?.getAttribute('data-joplin-language'),
					readOnly: !!node.hasAttribute('data-joplin-readonly'),
				};
			},
		},
		...additionalParseRules,
	],
	toDOM: node => {
		const attrs = node.attrs as JoplinEditableAttributes;
		const content = document.createElement(inline ? 'span' : 'div');
		content.classList.add('joplin-editable');
		content.innerHTML = sanitizeHtml(attrs.contentHtml);

		const getSourceNode = () => {
			let sourceNode = content.querySelector('.joplin-source');
			// If the node has a "source" attribute, its content still needs to be saved
			if (!sourceNode && attrs.source) {
				sourceNode = document.createElement(inline ? 'span' : 'div');
				sourceNode.classList.add('joplin-source');
				content.appendChild(sourceNode);
			}
			return sourceNode;
		};

		const sourceNode = getSourceNode();
		if (sourceNode) {
			sourceNode.textContent = attrs.source;
			sourceNode.setAttribute('data-joplin-source-open', attrs.openCharacters);
			sourceNode.setAttribute('data-joplin-source-close', attrs.closeCharacters);
		}

		if (attrs.readOnly) {
			content.setAttribute('data-joplin-readonly', 'true');
		}

		return content;
	},
});

export const nodeSpecs = {
	joplinEditableInline: makeJoplinEditableSpec(true, []),
	joplinEditableBlock: makeJoplinEditableSpec(false, [
		// Table of contents regions are also handled as block editable regions
		{
			tag: 'nav.table-of-contents',
			getAttrs: (node): false|Partial<JoplinEditableAttributes> => {
				// Additional validation to check that this is indeed a [toc].
				if (node.children.length !== 1 || node.children[0]?.tagName !== 'UL') {
					return false; // The rule doesn't match
				}

				return {
					contentHtml: node.innerHTML,
					source: '[toc]',
					// Disable the [toc]'s default rerendering behavior -- table of contents rendering
					// requires the document's full content and won't work if "[toc]" is rendered on its
					// own.
					readOnly: true,
				};
			},
		},
	]),
};

type GetPosition = ()=> number;

class EditableSourceBlockView implements NodeView {
	public readonly dom: HTMLElement;
	public constructor(private node: Node, inline: boolean, private view: EditorView, private getPosition: GetPosition) {
		if ((node.attrs.contentHtml ?? undefined) === undefined) {
			throw new Error(`Unable to create a SourceBlockView for a node lacking contentHtml. Node: ${node}.`);
		}

		this.dom = document.createElement(inline ? 'span' : 'div');
		this.dom.classList.add('joplin-editable');

		// The link tooltip used for other in-editor links won't be shown for links within a
		// rendered source block -- these links need custom logic to be clickable:
		makeLinksClickableInElement(this.dom, view);

		this.updateContent_();
	}

	private showEditDialog_() {
		editSourceBlockAt(this.getPosition())(this.view.state, this.view.dispatch, this.view);
	}

	private updateContent_() {
		const setDomContentSafe = (html: string) => {
			this.dom.innerHTML = sanitizeHtml(html);
		};

		const attrs = this.node.attrs as JoplinEditableAttributes;
		const addEditButton = () => {
			const { localize: _ } = getEditorApi(this.view.state);

			const editButton = createButton(_('Edit'), () => this.showEditDialog_());
			editButton.classList.add('edit');

			if (!attrs.readOnly) {
				this.dom.appendChild(editButton);
			}
		};

		setDomContentSafe(attrs.contentHtml);
		postProcessRenderedHtml(this.dom, this.node.isInline);
		addEditButton();
	}

	public selectNode() {
		this.dom.classList.add('-selected');
	}

	public deselectNode() {
		this.dom.classList.remove('-selected');
	}

	public stopEvent(event: Event) {
		// Allow using the keyboard to activate the "edit" button:
		return event.target === this.dom.querySelector('button.edit');
	}

	public update(node: Node) {
		if (node.type.spec !== this.node.type.spec) {
			return false;
		}

		this.node = node;
		this.updateContent_();

		return true;
	}
}

interface PluginState {
	editingNodeAt: number|null;
}

const joplinEditablePlugin = new Plugin<PluginState>({
	state: {
		init: () => ({
			editingNodeAt: null,
		}),
		apply: (tr, oldValue) => {
			let editingAt = oldValue.editingNodeAt;

			const editRequest: EditRequest|null = tr.getMeta(joplinEditablePlugin);
			if (editRequest) {
				if (editRequest.showEditor) {
					editingAt = editRequest.nodeStart;
				} else {
					editingAt = null;
				}
			}

			if (editingAt) {
				editingAt = tr.mapping.map(editingAt, 1);
			}
			return { editingNodeAt: editingAt };
		},
	},
	props: {
		nodeViews: {
			joplinEditableInline: (node, view, getPos) => new EditableSourceBlockView(node, true, view, getPos),
			joplinEditableBlock: (node, view, getPos) => new EditableSourceBlockView(node, false, view, getPos),
		},
	},
	view: () => {
		let dialog: DialogHandle|null = null;

		return {
			update(view, prevState) {
				const oldState = joplinEditablePlugin.getState(prevState);
				const newState = joplinEditablePlugin.getState(view.state);

				if (newState.editingNodeAt !== null) {
					if (oldState.editingNodeAt === null) {
						dialog = createDialogForNode(newState.editingNodeAt, view);
					}
					dialog?.onPositionChange(newState.editingNodeAt);
				} else if (dialog) {
					const lastDialog = dialog;
					// Set dialog to null before dismissing to prevent infinite recursion.
					// Dismissing the dialog can cause the editor state to update, which can
					// result in this callback being re-run.
					dialog = null;

					lastDialog.dismiss();
				}
			},
		};
	},
});

export default joplinEditablePlugin;
