import makeInlineReplaceExtension from './makeInlineReplaceExtension';
import { SyntaxNodeRef } from '@lezer/common';
import { EditorState } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import { ParentTags, ReplacementExtension } from '../types';

const hideDecoration = Decoration.mark({
	class: 'cm-hidden',
	// TODO: These regions are visually hidden, but it *might* be more accessible to show them to screen readers.
	// It would be good to get feedback and see what users prefer.
	attributes: { 'aria-hidden': 'true' },
});
// Don't fully hide replaced Markdown:
// - Hiding text with 'display: none' causes selection to behave unexpectedly
// - Screen readers skip text with 'display: none', which can lead to a confusing editing experience
const hiddenStyles = EditorView.theme({
	['& .cm-hidden']: {
		width: '1px',
		height: '1em',
		opacity: '0',
		display: 'inline-block',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
	},
});

type Options = Omit<ReplacementExtension, 'createDecoration'> & {
	shouldHide: (node: SyntaxNodeRef, state: EditorState, parentTags: ParentTags)=> boolean;
};

const makeHideReplaceExtension = (options: Options) => [
	hiddenStyles,
	makeInlineReplaceExtension({
		createDecoration: (node, state, parentTags) => {
			if (options.shouldHide(node, state, parentTags)) {
				return hideDecoration;
			}
			return null;
		},
		mergeNeighbors: true,
		...options,
	}),
];

export default makeHideReplaceExtension;
