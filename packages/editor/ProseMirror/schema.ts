import { AttributeSpec, DOMOutputSpec, MarkSpec, NodeSpec, Schema } from 'prosemirror-model';
import { nodeSpecs as joplinEditableNodes } from './plugins/joplinEditablePlugin/joplinEditablePlugin';
import { tableNodes } from 'prosemirror-tables';
import { nodeSpecs as listNodes } from './plugins/listPlugin';
import { nodeSpecs as imageNodes } from './plugins/imagePlugin';
import { hasProtocol } from '@joplin/utils/url';
import { isResourceUrl } from '@joplin/lib/models/utils/resourceUtils';
import { nodeSpecs as detailsNodes } from './plugins/detailsPlugin';

// For reference, see:
// - https://prosemirror.net/docs/guide/#schema
// - https://github.com/ProseMirror/prosemirror-schema-basic/blob/master/src/schema-basic.ts

const domOutputSpecs = {
	paragraph: ['p', 0],
	strong: ['strong', 0],
	code: ['code', { class: 'inline-code', spellcheck: false }, 0],
	emphasis: ['em', 0],
	pre: ['pre', { class: 'code-block' }, ['code', 0]],
	br: ['br'],
	orderedList: ['ol', 0],
	unorderedList: ['ul', 0],
	listItem: ['li', 0],
	blockQuote: ['blockquote', 0],
	hr: ['hr'],
	sub: ['sub', 0],
	sup: ['sup', 0],
	mark: ['mark', 0],
} satisfies Record<string, DOMOutputSpec>;

type AttributeSpecs = Record<string, AttributeSpec>;

// Default attributes that should be valid for all toplevel blocks:
const defaultToplevelAttrs: AttributeSpecs = {
	// Stores the original markdown used to generate a node.
	originalMarkup: { default: '', validate: 'string' },
};
const getDefaultToplevelAttrs = (node: Element) => ({
	originalMarkup: node.getAttribute('data-original-markup'),
});

const addDefaultToplevelAttributes = <Nodes extends Record<string, NodeSpec>> (nodes: Nodes) => {
	const result: Partial<Nodes> = {};
	for (const key in nodes) {
		if (nodes[key].group === 'block') {
			result[key] = {
				...nodes[key],
				attrs: {
					...defaultToplevelAttrs,
					...nodes[key].attrs,
				},
				parseDOM: nodes[key].parseDOM?.map(rule => {
					if (!rule.tag) return rule;

					return {
						...rule,
						getAttrs: (node) => {
							const attrs = rule.getAttrs?.(node);
							if (attrs === false) return attrs;

							return {
								...getDefaultToplevelAttrs(node),
								...(attrs ?? rule.attrs ?? {}),
							};
						},
					};
				}),
			};
		} else {
			result[key] = nodes[key];
		}
	}
	return result as Nodes;
};

const nodes = addDefaultToplevelAttributes({
	doc: { content: 'block+' },
	paragraph: {
		group: 'block',
		content: '(inline|hard_break)*',
		parseDOM: [{ tag: 'p' }],
		toDOM: () => domOutputSpecs.paragraph,
	},
	heading: { // See prosemirror-schema-basic's `heading`
		attrs: {
			level: { default: 2, validate: 'number' },
		},
		group: 'block',
		content: 'inline*',
		parseDOM: [1, 2, 3, 4, 5, 6].map(level => ({
			tag: `h${level}`, getAttrs: node => ({ ...getDefaultToplevelAttrs(node), level }),
		})),
		toDOM: (node) => [`h${node.attrs.level}`, 0],
	},
	pre_block: {
		content: 'text*',
		group: 'block',
		marks: '',
		code: true,
		defining: true, // Preserve the node during replacement operations
		parseDOM: [{ tag: 'pre' }],
		toDOM: () => domOutputSpecs.pre,
	},
	blockquote: {
		content: 'block+',
		group: 'block',
		parseDOM: [{ tag: 'blockquote' }],
		toDOM: () => domOutputSpecs.blockQuote,
	},
	horizontal_rule: {
		group: 'block',
		parseDOM: [{ tag: 'hr' }],
		toDOM: () => domOutputSpecs.hr,
	},
	style_placeholder: {
		group: 'block',
		parseDOM: [
			{
				tag: 'style',
				getAttrs: node => ({ content: node.textContent }),
			},
			{
				tag: 'div.joplin-style-placeholder',
				getAttrs: node => ({ content: node.getAttribute('data-style-content') }),
			},
		],
		attrs: {
			content: { validate: 'string' },
		},
		toDOM: (node) => {
			const result = document.createElement('div');
			result.classList.add('joplin-style-placeholder');
			result.setAttribute('data-style-content', node.attrs.content);
			result.textContent = 'CSS';
			return result;
		},
	},
	...detailsNodes,
	...imageNodes,
	...listNodes,
	...joplinEditableNodes,
	...tableNodes({
		tableGroup: 'block',
		cellContent: 'block+',
		cellAttributes: {},
	}),
	// Override the default `table` node to include the default toplevel attributes
	table: {
		content: 'table_row+',
		tableRole: 'table',
		isolating: true,
		group: 'block',
		parseDOM: [{ tag: 'table' }],
		toDOM: () => ['table', ['tbody', 0]],
	},

	text: {
		group: 'inline',
	},
	hard_break: {
		inline: true,
		group: 'inlineBreak',
		selectable: false,
		leafText: () => '\n',
		parseDOM: [{ tag: 'br' }],
		toDOM: () => domOutputSpecs.br,
	},
});

const marks = {
	strong: {
		parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
		toDOM: () => domOutputSpecs.strong,
	},
	emphasis: {
		parseDOM: [{ tag: 'em' }],
		toDOM: () => domOutputSpecs.emphasis,
	},
	code: {
		parseDOM: [{ tag: 'code' }],
		code: true,
		toDOM: () => domOutputSpecs.code,
		excludes: '_',
	},
	sub: {
		parseDOM: [{ tag: 'sub' }],
		toDOM: () => domOutputSpecs.sub,
	},
	sup: {
		parseDOM: [{ tag: 'sup' }],
		toDOM: () => domOutputSpecs.sup,
	},
	mark: {
		parseDOM: [{ tag: 'mark' }],
		toDOM: () => domOutputSpecs.mark,
	},
	color: {
		inclusive: false,
		parseDOM: [{
			style: 'color',
			getAttrs: (styleValue: string) => {
				return { color: styleValue };
			},
		}],
		attrs: {
			color: { validate: 'string' },
		},
		toDOM: node => {
			const result = document.createElement('span');
			result.style.color = node.attrs.color;
			return result;
		},
	},
	link: {
		attrs: {
			href: { validate: 'string' },
			title: { default: '', validate: 'string' },
			dataResourceId: { default: undefined as string|undefined, validate: 'string|undefined' },
		},
		inclusive: false,
		parseDOM: [{
			tag: 'a[href]',
			getAttrs: node => {
				const resourceId = node.getAttribute('data-resource-id');
				let href = node.getAttribute('href');
				const isResourceLink = resourceId && href === '#';
				if (isResourceLink) {
					href = `:/${resourceId}`;
				}

				if (href === '#' && node.hasAttribute('data-original-href')) {
					href = node.getAttribute('data-original-href');
				}

				return {
					href: isResourceLink ? `:/${resourceId}` : href,
					title: node.getAttribute('title'),
					dataResourceId: node.getAttribute('data-resource-id'),
				};
			},
		}],
		toDOM: node => {
			const isSafeForRendering = (href: string) => {
				return hasProtocol(href, ['http', 'https', 'joplin']) || isResourceUrl(href);
			};

			// Avoid rendering URLs with unknown protocols (avoid rendering or pasting unsafe HREFs).
			// Note that URL click handling is handled elsewhere and does not use the HTML "href" attribute.
			// However "href" may be used by the right-click menu on web:
			const safeHref = isSafeForRendering(node.attrs.href) ? node.attrs.href : '#';

			return [
				'a',
				{
					href: safeHref,
					...(safeHref !== node.attrs.href ? {
						'data-original-href': node.attrs.href,
					} : {}),

					title: node.attrs.title,
					'data-resource-id': node.attrs.dataResourceId,
				},
			];
		},
	},
} satisfies Record<string, MarkSpec>;

type NodeKeys = keyof typeof nodes;
type MarkKeys = keyof typeof marks;

const schema = new Schema<NodeKeys, MarkKeys>({
	marks,
	nodes,
});

export default schema;
