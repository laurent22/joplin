import { Plugin } from 'prosemirror-state';
import { AttributeSpec, Node, NodeSpec } from 'prosemirror-model';
import { EditorView, NodeView, ViewMutationRecord } from 'prosemirror-view';

type NodeAttrs = Readonly<{
	open: boolean;
}>;

const attrsSpec = {
	open: { default: true, validate: 'boolean' },
} satisfies Record<keyof NodeAttrs, AttributeSpec>;

const detailsSpec: NodeSpec = {
	group: 'block',
	inline: false,
	attrs: attrsSpec,
	content: 'details_summary block+',
	parseDOM: [
		{
			tag: 'details',
			getAttrs: (node): NodeAttrs => {
				return {
					open: node.hasAttribute('open') && node.getAttribute('open') !== 'false',
				};
			},
		},
	],
	toDOM: (node) => [
		'details',
		{
			...(node.attrs.open ? { open: true } : {}),

			// Allows the details element to be correctly converted back to Markdown (in Markdown notes).
			class: 'jop-noMdConv',
		},
		0,
	],
};

const detailsSummarySpec: NodeSpec = {
	inline: false,
	content: 'inline+',
	parseDOM: [
		{ tag: 'summary' },
	],
	toDOM: () => ['summary', { class: 'jop-noMdConv' }, 0],
};

export const nodeSpecs = {
	details: detailsSpec,
	details_summary: detailsSummarySpec,
};

type GetPosition = ()=> number|undefined;

class DetailsView implements NodeView {
	public readonly dom: HTMLDetailsElement;
	public readonly contentDOM: HTMLElement;

	public constructor(private node_: Node, view: EditorView, getPosition: GetPosition) {
		this.dom = document.createElement('details');
		this.dom.open = this.node_.attrs.open;
		this.dom.ontoggle = () => {
			const position = getPosition();
			if (this.dom.open !== this.node_.attrs.open && position !== undefined) {
				view.dispatch(view.state.tr.setNodeAttribute(
					position, 'open', this.dom.open,
				));
			}
		};

		// Allow the user to click on the "summary" label's text without toggling the details
		// element:
		this.dom.onclick = (event) => {
			const summaryNode = this.dom.querySelector('summary');
			if (event.target === summaryNode) {
				const contentRange = document.createRange();
				contentRange.setStart(summaryNode, 0);
				contentRange.setEnd(summaryNode, summaryNode.childNodes.length);
				const bbox = contentRange.getBoundingClientRect();

				const horizontalPadding = 10;
				const eventIsInLabelText = (
					event.x >= bbox.left &&
					event.x <= bbox.left + bbox.width + horizontalPadding &&
					event.y >= bbox.top &&
					event.y <= bbox.top + bbox.height
				);

				if (eventIsInLabelText) {
					event.preventDefault();
				}
			}
		};

		this.contentDOM = this.dom;
	}

	public ignoreMutation(mutation: ViewMutationRecord) {
		// Prevent ProseMirror from immediately resetting the "open" attribute when toggled.
		return mutation.target === this.dom && mutation.type === 'attributes' && mutation.attributeName === 'open';
	}

	public update(node: Node) {
		if (node.type.spec !== this.node_.type.spec) return false;

		this.node_ = node;
		this.dom.open = node.attrs.open;
		return true;
	}
}

const detailsPlugin = new Plugin({
	props: {
		nodeViews: {
			details: (node, view, getPos, _decorations) => {
				return new DetailsView(node, view, getPos);
			},
		},
	},
});

export default detailsPlugin;
