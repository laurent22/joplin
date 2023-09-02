import SelectionFormatting, { MutableSelectionFormatting, defaultSelectionFormatting } from '../../SelectionFormatting';
import { syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

const computeSelectionFormatting = (state: EditorState, globalSpellcheck: boolean): SelectionFormatting => {
	const range = state.selection.main;
	const formatting: MutableSelectionFormatting = {
		...defaultSelectionFormatting,
		selectedText: state.doc.sliceString(range.from, range.to),
		spellChecking: globalSpellcheck,
	};

	const parseLinkData = (nodeText: string) => {
		const linkMatch = nodeText.match(/\[([^\]]*)\]\(([^)]*)\)/);

		if (linkMatch) {
			return {
				linkText: linkMatch[1],
				linkURL: linkMatch[2],
			};
		}

		return null;
	};

	// Find nodes that overlap/are within the selected region
	syntaxTree(state).iterate({
		from: range.from, to: range.to,
		enter: node => {
			// Checklists don't have a specific containing node. As such,
			// we're in a checklist if we've selected a 'Task' node.
			if (node.name === 'Task') {
				formatting.inChecklist = true;
			}

			// Only handle notes that contain the entire range.
			if (node.from > range.from || node.to < range.to) {
				return;
			}
			// Lazily compute the node's text
			const nodeText = () => state.doc.sliceString(node.from, node.to);

			switch (node.name) {
			case 'StrongEmphasis':
				formatting.bolded = true;
				break;
			case 'Emphasis':
				formatting.italicized = true;
				break;
			case 'ListItem':
				formatting.listLevel += 1;
				break;
			case 'BulletList':
				formatting.inUnorderedList = true;
				break;
			case 'OrderedList':
				formatting.inOrderedList = true;
				break;
			case 'TaskList':
				formatting.inChecklist = true;
				break;
			case 'InlineCode':
			case 'FencedCode':
				formatting.inCode = true;
				formatting.unspellCheckableRegion = true;
				break;
			case 'InlineMath':
			case 'BlockMath':
				formatting.inMath = true;
				formatting.unspellCheckableRegion = true;
				break;
			case 'ATXHeading1':
				formatting.headerLevel = 1;
				break;
			case 'ATXHeading2':
				formatting.headerLevel = 2;
				break;
			case 'ATXHeading3':
				formatting.headerLevel = 3;
				break;
			case 'ATXHeading4':
				formatting.headerLevel = 4;
				break;
			case 'ATXHeading5':
				formatting.headerLevel = 5;
				break;
			case 'URL':
				formatting.inLink = true;
				formatting.linkData = {
					...formatting.linkData,
					linkURL: nodeText(),
				};
				formatting.unspellCheckableRegion = true;
				break;
			case 'Link':
				formatting.inLink = true;
				formatting.linkData = parseLinkData(nodeText());
				break;
			}
		},
	});

	// The markdown parser marks checklists as unordered lists. Ensure
	// that they aren't marked as such.
	if (formatting.inChecklist) {
		if (!formatting.inUnorderedList) {
			// Even if the selection contains a Task, because an unordered list node
			// must contain a valid Task node, we're only in a checklist if we're also in
			// an unordered list.
			formatting.inChecklist = false;
		} else {
			formatting.inUnorderedList = false;
		}
	}

	if (formatting.unspellCheckableRegion) {
		formatting.spellChecking = false;
	}

	return formatting;
};
export default computeSelectionFormatting;

