import { Decoration, EditorView } from '@codemirror/view';
import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';

const linkClassName = 'cm-ext-unfocused-link';
const urlMarkDecoration = Decoration.mark({ class: linkClassName });
const strikethroughClassName = 'cm-ext-strikethrough';
const strikethroughMarkDecoration = Decoration.mark({ class: strikethroughClassName });

const addFormattingClasses = [
	EditorView.theme({
		[`& .${linkClassName}, & .${linkClassName} span`]: {
			textDecoration: 'underline',
		},
		[`& .${strikethroughClassName}, & .${strikethroughClassName} span`]: {
			textDecoration: 'line-through',
		},
	}),
	makeInlineReplaceExtension({
		createDecoration: (node) => {
			if (node.name === 'URL' || node.name === 'Link') {
				return urlMarkDecoration;
			}
			if (node.name === 'Strikethrough') {
				return strikethroughMarkDecoration;
			}
			return null;
		},
	}),
];

export default addFormattingClasses;
