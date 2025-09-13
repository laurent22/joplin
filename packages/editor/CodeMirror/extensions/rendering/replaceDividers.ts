import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import makeInlineReplaceExtension from './utils/makeInlineReplaceExtension';

const dividerClassName = 'cm-md-divider';
const dividerLineClassName = 'cm-md-divider-line';

class DividerWidget extends WidgetType {
	public constructor() {
		super();
	}

	public eq(_other: DividerWidget) {
		return true;
	}

	public toDOM() {
		const container = document.createElement('hr');
		container.classList.add(dividerClassName);
		return container;
	}

	public ignoreEvent() {
		return true;
	}
}

const dividerLineMark = Decoration.line({ class: dividerLineClassName });

const replaceDividers = [
	EditorView.theme({
		[`& .cm-line.${dividerLineClassName}`]: {
			// Use flex layout to allow the divider to fill the remainder of the line.
			// This applies, for example, to the case where the divider is in a blockquote or
			// a sub list item.
			display: 'flex',
			flexWrap: 'wrap',
		},
		[`& .${dividerClassName}`]: {
			// Fill remaining width
			flexGrow: 1,
			flexShrink: 1,

			border: 'none',
			borderBottom: '2px solid var(--joplin-divider-color)',
			position: 'relative',
		},
	}),
	makeInlineReplaceExtension({
		createDecoration: (node) => {
			if (node.name === 'HorizontalRule') {
				return new DividerWidget();
			}
			return null;
		},
	}),
	makeInlineReplaceExtension({
		createDecoration: (node) => {
			if (node.name === 'HorizontalRule') {
				return dividerLineMark;
			}
			return null;
		},
		getDecorationRange: (node, state) => {
			const line = state.doc.lineAt(node.from);
			return [line.from];
		},
	}),
];

export default replaceDividers;
