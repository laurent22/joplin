import { Plugin } from 'prosemirror-state';
import { AttributeSpec, Node, NodeSpec } from 'prosemirror-model';
import { Decoration, DecorationSet, EditorView, NodeView } from 'prosemirror-view';
import changedDescendants from '../vendor/changedDescendants';

// See the fold example for more information about
// writing similar ProseMirror plugins:
// https://prosemirror.net/examples/fold/

type NodeAttrs = Readonly<{
	placeholderSrc: string;
	placeholderAlt: string;
	itemId: string;
	alt: string;
	title: string;
	isImage: boolean;
	notDownloaded: boolean;
}>;

const attrsSpec = {
	placeholderSrc: { default: '', validate: 'string' },
	placeholderAlt: { default: '', validate: 'string' },

	itemId: { validate: 'string' },
	alt: { default: '', validate: 'string' },
	title: { default: '', validate: 'string' },
	isImage: { validate: 'boolean' },
	notDownloaded: { validate: 'boolean' },
} satisfies Record<keyof NodeAttrs, AttributeSpec>;

const placeholderSpec: NodeSpec = {
	group: 'inline',
	inline: true,
	attrs: attrsSpec,
	parseDOM: [
		{
			tag: 'span[data-resource-id].not-loaded-resource',
			getAttrs: (node): NodeAttrs => {
				return {
					itemId: node.getAttribute('data-resource-id'),
					alt: node.getAttribute('data-original-alt'),
					title: node.getAttribute('data-original-title'),
					isImage: node.classList.contains('not-loaded-image-resource'),
					notDownloaded: node.classList.contains('resource-status-notDownloaded'),
					placeholderSrc: node.querySelector('img')?.src,
					placeholderAlt: node.querySelector('img')?.alt,
				};
			},
		},
	],
	toDOM: (node) => [
		'span',
		{
			'data-resource-id': node.attrs.itemId,
			'data-original-alt': node.attrs.alt,
			'data-original-title': node.attrs.title,
			class: [
				'not-loaded-resource',
				node.attrs.isImage ? 'not-loaded-image-resource' : null,
				node.attrs.notDownloaded ? 'resource-status-notDownloaded' : null,
			].filter(item => !!item).join(' '),
		},
		['img', { src: node.attrs.placeholderSrc, alt: node.attrs.placeholderAlt }],
	],
};

export const nodeSpecs = {
	resourcePlaceholder: placeholderSpec,
};

class ResourcePlaceholderView implements NodeView {
	public readonly dom: HTMLElement;
	private resourceId_: string;

	public constructor(node: Node, decorations: readonly Decoration[]) {
		this.resourceId_ = node.attrs.itemId;
		this.dom = this.createDom_(node, decorations);
	}

	private createDom_(node: Node, decorations: readonly Decoration[]) {
		const createDom = (imageSrc: string, imageAlt: string, loaded: boolean) => {
			const image = document.createElement('img');
			image.src = imageSrc;
			image.alt = imageAlt;

			let dom;
			if (!loaded) {
				dom = document.createElement('span');
				dom.classList.add('not-loaded-resource');
				dom.appendChild(image);
			} else {
				dom = image;
				dom.classList.add('late-loaded-resource');
			}
			// For testing
			dom.setAttribute('data-resource-id', this.resourceId_);
			return dom;
		};

		const attrs = node.attrs as NodeAttrs;
		let imageSrc = attrs.placeholderSrc;
		let imageAlt = attrs.placeholderAlt;
		let loaded = false;

		for (const decoration of decorations) {
			if (decoration.spec.resourceId === this.resourceId_) {
				imageSrc = (decoration.spec as PluginMeta).newSrc;
				imageAlt = attrs.alt;
				loaded = true;
			}
		}

		return createDom(imageSrc, imageAlt, loaded);
	}

	public update(node: Node, decorations: readonly Decoration[]) {
		if (node.type.spec !== placeholderSpec) return false;

		for (const decoration of decorations) {
			if (decoration.spec.resourceId === this.resourceId_) {
				this.dom.replaceWith(this.createDom_(node, decorations));
			}
		}
		return true;
	}
}

interface PluginMeta {
	resourceId: string;
	newSrc: string;
}
export const onResourceDownloaded = (view: EditorView, resourceId: string, newSrc: string) => {
	const meta: PluginMeta = {
		resourceId,
		newSrc,
	};
	view.dispatch(
		view.state.tr.setMeta(resourcePlaceholderPlugin, meta),
	);
};

interface PluginState {
	decorations: DecorationSet;
	idToSrc: Record<string, string>;
}

const resourcePlaceholderPlugin: Plugin<PluginState> = new Plugin({
	state: {
		init: (): PluginState => ({
			decorations: DecorationSet.empty,
			idToSrc: Object.create(null),
		}),
		apply: (tr, oldValue, oldState, newState) => {
			let decorations = oldValue.decorations.map(tr.mapping, tr.doc);
			let idToSrc = oldValue.idToSrc;

			const tryAddDecoration = (node: Node, pos: number) => {
				if (node.type.spec === placeholderSpec && decorations.find(pos, pos + node.nodeSize).length === 0) {
					const attrs = node.attrs as NodeAttrs;
					const itemId = attrs.itemId;

					if (Object.hasOwnProperty.call(idToSrc, itemId)) {
						const spec: PluginMeta = {
							newSrc: idToSrc[attrs.itemId],
							resourceId: attrs.itemId,
						};

						decorations = decorations.add(tr.doc, [
							Decoration.node(pos, pos + node.nodeSize, {}, spec),
						]);
					}
				}
			};

			const meta: PluginMeta|undefined = tr.getMeta(resourcePlaceholderPlugin);
			if (meta) {
				const { resourceId, newSrc } = meta;
				if (!resourceId || !newSrc) {
					throw new Error('Invalid .setMeta for resourcePlaceholderPlugin');
				}

				idToSrc = { ...idToSrc, [resourceId]: newSrc };

				tr.doc.descendants((node, pos) => {
					tryAddDecoration(node, pos);
				});
			}

			changedDescendants(oldState.doc, newState.doc, 0, (node, pos) => {
				tryAddDecoration(node, pos);
			});

			return {
				decorations,
				idToSrc,
			};
		},
	},
	props: {
		nodeViews: {
			resourcePlaceholder: (node, _view, _getPos, decorations) => {
				return new ResourcePlaceholderView(node, decorations);
			},
		},
		decorations(state) {
			return this.getState(state).decorations;
		},
	},
});

export default resourcePlaceholderPlugin;
