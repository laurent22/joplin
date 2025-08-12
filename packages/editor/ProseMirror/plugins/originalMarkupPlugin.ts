import { EditorState, Plugin } from 'prosemirror-state';
import { Node as ProseMirrorNode, DOMSerializer } from 'prosemirror-model';
import { Decoration, DecorationSet } from 'prosemirror-view';
import schema from '../schema';
import changedDescendants from '../vendor/changedDescendants';

const nonbreakingSpace = '\u00A0';

// Creates a custom serializer that can preserve empty paragraphs.
// See https://discuss.prosemirror.net/t/how-to-preserve-br-tags-in-empty-paragraphs/2051/8.
const createSerializer = () => {
	const baseSerializer = DOMSerializer.fromSchema(schema);
	return new DOMSerializer({
		...baseSerializer.nodes,

		// When converting back to markup, restore the <style> blocks.
		// TODO: This is currently only effective for short, simple CSS blocks.
		// @joplin/turndown will need to be adjusted to properly support preserving CSS:
		style_placeholder: (node) => {
			const result = document.createElement('style');
			result.appendChild(document.createTextNode(node.attrs.content));
			result.classList.add('jop-noMdConv');
			return result;
		},

		// Prevent empty paragraphs from being removed by padding them with nonbreaking spaces:
		paragraph: (node) => {
			if (node.content.size === 0) {
				return ['p', nonbreakingSpace];
			} else {
				return ['p', 0];
			}
		},

		// Preserve repeated spaces -- ProseMirror visually preserves spaces with "white-space: break-spaces".
		text: (node) => {
			if (node.marks.some(mark => mark.type.spec.code)) {
				// Within code, &nbsp;s render as text, not nonbreaking spaces.
				// Avoid including them:
				return node.text;
			}

			// Replace repeated spaces with a space followed by a nonbreaking space:
			// Use \u00A0 as the nonbreaking space character, since &nbsp; will be escaped.
			return node.text.replace(/ {2}/g, ` ${nonbreakingSpace}`);
		},

		// However, &nbsp;s don't render as nonbreaking spaces in code blocks.
		// Create a custom output specification to avoid using the default text output:
		pre_block: (node) => {
			const result = document.createElement('pre');
			const content = document.createElement('code');
			content.appendChild(document.createTextNode(node.textContent));
			result.appendChild(content);
			return { dom: result };
		},
	}, baseSerializer.marks);
};

const originalMarkupPlugin = (htmlToMarkup: (html: Node)=> string) => {
	const proseMirrorSerializer = createSerializer();

	const makeDecoration = (position: number, node: ProseMirrorNode, markup: string) => {
		return Decoration.node(
			position,
			position + node.nodeSize,
			{ 'data-markup': markup }, // For debugging
			{ markup },
		);
	};

	const addMissingMarkup = (doc: ProseMirrorNode, decorations: DecorationSet) => {
		doc.content.nodesBetween(0, doc.content.size, (node: ProseMirrorNode, position: number) => {
			// All markup decorations that cover the start of the node and the next character
			const possibleDecorations = decorations.find(position, position + 1);
			// Only consider the decorations that match the node's boundaries exactly.
			const matchingDecorations = possibleDecorations.filter(decoration => {
				return decoration.from === position && decoration.to === position + node.nodeSize;
			});

			if (matchingDecorations.length === 0) {
				const serialized = proseMirrorSerializer.serializeNode(node);
				const markup = htmlToMarkup(serialized);
				decorations = decorations.add(doc, [makeDecoration(position, node, markup)]);
			}

			// Only visit toplevel nodes
			return false;
		});

		return decorations;
	};

	const plugin = new Plugin<DecorationSet>({
		state: {
			init: (_config, state) => {
				let decorations = DecorationSet.empty;
				state.doc.nodesBetween(0, state.doc.content.size, (node, position) => {
					const originalMarkup = node.attrs.originalMarkup;
					if (originalMarkup?.trim()) {
						decorations = decorations.add(state.doc, [makeDecoration(position, node, node.attrs.originalMarkup)]);
					}

					return false;
				});
				return addMissingMarkup(state.doc, decorations);
			},
			apply: (tr, value, oldState, newState) => {
				value = value.map(tr.mapping, tr.doc);

				// Remove all outdated values
				changedDescendants(oldState.doc, newState.doc, 0, (node, pos) => {
					const oldDecorations = value.find(pos, pos + node.nodeSize);
					value = value.remove(oldDecorations);
				});

				value = addMissingMarkup(tr.doc, value);

				return value;
			},
		},
		props: {
			decorations(state) { return this.getState(state); },
		},
	});

	return {
		plugin,
		stateToMarkup: (state: EditorState) => {
			const decorations = plugin.getState(state).find();
			// Sort the decorations in increasing order -- the documentation does not guarantee
			// that the decorations will be returned by .find() in any particular order.
			decorations.sort((a, b) => a.from - b.from);

			const result = [];
			for (const decoration of decorations) {
				const markup: string = decoration.spec.markup;
				result.push(markup);

				if (!markup.endsWith('\n\n')) {
					result.push('\n\n');
				}
			}

			return result.join('');
		},
	};
};

export default originalMarkupPlugin;
