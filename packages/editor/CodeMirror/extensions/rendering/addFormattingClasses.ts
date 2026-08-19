import { Decoration, EditorView } from '@codemirror/view';
import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';

const linkClassName = 'cm-ext-unfocused-link';
const urlMarkDecoration = Decoration.mark({ class: linkClassName });
const strikethroughClassName = 'cm-ext-strikethrough';
const strikethroughMarkDecoration = Decoration.mark({ class: strikethroughClassName });
const insertClassName = 'cm-ext-insert';
const insertMarkDecoration = Decoration.mark({ class: insertClassName });

const addFormattingClasses = [
	EditorView.theme({
		[`& .${linkClassName}, & .${linkClassName} span`]: {
			textDecoration: 'underline',
		},
		[`& .${strikethroughClassName}, & .${strikethroughClassName} span`]: {
			textDecoration: 'line-through',
		},
		[`& .${insertClassName}, & .${insertClassName} span`]: {
			textDecoration: 'underline',
		},
	}),
	makeInlineReplaceExtension({
		getRevealStrategy: (node) => {
			// Links: use 'select' because the Link's parent is Paragraph,
			// which spans the whole line - 'active' would hide all link decorations on the line
			if (node.name === 'URL' || node.name === 'Link') {
				return 'select';
			}
			return 'active';
		},
		createDecoration: (node) => {
			if (node.name === 'URL' || node.name === 'Link') {
				return urlMarkDecoration;
			}
			if (node.name === 'Strikethrough') {
				return strikethroughMarkDecoration;
			}
			if (node.name === 'Insert') {
				return insertMarkDecoration;
			}
			return null;
		},
	}),
];

export default addFormattingClasses;
