import makeInlineReplaceExtension from './makeInlineReplaceExtension';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState, Facet } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import { ParentTags, ReplacementExtension } from '../types';

const hideDecoration = Decoration.mark({
	class: 'cm-hidden',
});
// Don't fully hide replaced Markdown:
// - Hiding text with 'display: none' causes selection to behave unexpectedly
// - Screen readers skip text with 'display: none', which can lead to a confusing editing experience
const hiddenStyles = EditorView.theme({
	['& .cm-hidden']: {
		// This needs to be non-zero to avoid selection issues. To avoid screen reader issues
		// the width also needs to be >= 1px.
		width: '1px',
		height: '1em',
		marginRight: '-0.9px',

		opacity: '0',
		display: 'inline-block',
		whiteSpace: 'nowrap',
		overflow: 'hidden',

		// Decrease the size of the content: Work around cursor placement issues when a
		// line ends with a long hidden decoration:
		transform: 'scale(0.1, 1)',
	},
});

type Options = Pick<ReplacementExtension, 'getRevealStrategy'|'getDecorationRange'> & {
	shouldHide: (node: SyntaxNodeRef, state: EditorState, parentTags: ParentTags)=> boolean;
};

const hideReplaceFacet = Facet.define<Options>({
	combine: values => values.flat(),
	enables: facet => {
		const getActivePluginOptions = (node: SyntaxNodeRef, state: EditorState, parentTags: ParentTags) => {
			const allPluginOptions = state.facet(facet);
			return allPluginOptions.find(o => o.shouldHide(node, state, parentTags));
		};
		return [
			hiddenStyles,
			makeInlineReplaceExtension({
				createDecoration: (node, state, parentTags) => {
					if (getActivePluginOptions(node, state, parentTags)) {
						return hideDecoration;
					}
					return null;
				},
				getDecorationRange: (node, state, parentTags) => {
					const options = getActivePluginOptions(node, state, parentTags);
					return options?.getDecorationRange?.(node, state, parentTags);
				},
				getRevealStrategy: (node, state, parentTags) => {
					const options = getActivePluginOptions(node, state, parentTags);
					return options?.getRevealStrategy?.(node, state, parentTags);
				},
				mergeNeighbors: true,
			}),
		];
	},
});

const makeHideReplaceExtension = (options: Options) => [
	hideReplaceFacet.of(options),
];

export default makeHideReplaceExtension;
