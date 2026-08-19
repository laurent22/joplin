import { Plugin } from 'prosemirror-state';
import { Node, NodeSpec, TagParseRule } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import sanitizeHtml from '../../utils/sanitizeHtml';
import createEditorDialog from './utils/createEditorDialog';
import { getEditorApi } from '../joplinEditorApiPlugin';
import { msleep } from '@joplin/utils/time';
import postProcessRenderedHtml from './utils/postProcessRenderedHtml';
import makeLinksClickableInElement from '../../utils/makeLinksClickableInElement';
import SelectableNodeView from '../../utils/SelectableNodeView';
import createExternalEditorPlugin, { OnHide } from '../utils/createExternalEditorPlugin';
import createFloatingButtonPlugin, { ToolbarType } from '../utils/createFloatingButtonPlugin';

// See the fold example for more information about
// writing similar ProseMirror plugins:
// https://prosemirror.net/examples/fold/


const createEditorDialogForNode = (nodePosition: number, view: EditorView, onHide: OnHide) => {
	let saveCounter = 0;

	const getNode = () => (
		view.state.doc.nodeAt(nodePosition)
	);

	const openCharacters = getNode().attrs.openCharacters ?? '';
	const { dismiss } = createEditorDialog({
		editorApi: getEditorApi(view.state),
		source: [
			openCharacters,
			getNode().attrs.source,
			getNode().attrs.closeCharacters ?? '',
		].join(''),
		cursor: openCharacters.length,
		onSave: async (source) => {
			view.dispatch(
				view.state.tr.setNodeAttribute(
					nodePosition, 'source', source,
				).setNodeAttribute(
					nodePosition, 'openCharacters', '',
				).setNodeAttribute(
					nodePosition, 'closeCharacters', '',
				),
			);

			saveCounter ++;
			const initialSaveCounter = saveCounter;
			const cancelled = () => saveCounter !== initialSaveCounter;

			// Debounce rendering
			await msleep(400);
			if (cancelled()) return;

			const rendered = await getEditorApi(view.state).renderer.renderMarkupToHtml(
				source,
				{ forceMarkdown: true, isFullPageRender: false },
			);
			if (cancelled()) return;

			const html = postProcessRenderedHtml(rendered.html, getNode().isInline);
			view.dispatch(
				view.state.tr.setNodeAttribute(
					nodePosition, 'contentHtml', html,
				),
			);

			// Certain rendered blocks (e.g. ABC sheet music) have an external script that listen for "joplin-noteDidUpdate"
			// to re-render the block content.
			document.dispatchEvent(new Event('joplin-noteDidUpdate'));
		},
		onDismiss: () => {
			onHide();
		},
	});

	return {
		onPositionChange: (newPosition: number) => {
			nodePosition = newPosition;
		},
		dismiss,
	};
};


export interface JoplinEditableAttributes {
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

class EditableSourceBlockView extends SelectableNodeView {
	public constructor(private node: Node, inline: boolean, view: EditorView) {
		if ((node.attrs.contentHtml ?? undefined) === undefined) {
			throw new Error(`Unable to create a SourceBlockView for a node lacking contentHtml. Node: ${node}.`);
		}

		super(inline);

		this.dom.classList.add('joplin-editable');

		// The link tooltip used for other in-editor links won't be shown for links within a
		// rendered source block -- these links need custom logic to be clickable:
		makeLinksClickableInElement(this.dom, view);

		this.updateContent_();
	}

	private updateContent_() {
		const setDomContentSafe = (html: string) => {
			this.dom.innerHTML = sanitizeHtml(html);
		};

		const attrs = this.node.attrs as JoplinEditableAttributes;
		setDomContentSafe(attrs.contentHtml);
		postProcessRenderedHtml(this.dom, this.node.isInline);
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

const { plugin: externalEditorPlugin, hideEditor, editAt } = createExternalEditorPlugin({
	canEdit: (node: Node) => {
		return (node.type.name === 'joplinEditableInline' || node.type.name === 'joplinEditableBlock') && !node.attrs.readOnly;
	},
	showEditor: createEditorDialogForNode,
});

export { hideEditor as hideSourceBlockEditor, editAt as editSourceBlockAt };

export default [
	externalEditorPlugin,
	new Plugin({
		props: {
			nodeViews: {
				joplinEditableInline: (node, view) => new EditableSourceBlockView(node, true, view),
				joplinEditableBlock: (node, view) => new EditableSourceBlockView(node, false, view),
			},
		},
	}),
	...['joplinEditableInline', 'joplinEditableBlock'].map(nodeName => (
		createFloatingButtonPlugin(nodeName, [
			{
				label: _ => _('Edit'),
				className: 'edit-button',
				command: (_node, offset) => editAt(offset),
			},
		], ToolbarType.AnchorTopRight)
	)),
];
