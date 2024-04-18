// Stores information about the current content of the user's selection
export interface MutableSelectionFormatting {
	bolded: boolean;
	italicized: boolean;
	inChecklist: boolean;
	inCode: boolean;
	inUnorderedList: boolean;
	inOrderedList: boolean;
	inMath: boolean;
	inLink: boolean;
	spellChecking: boolean;
	unspellCheckableRegion: boolean;

	// Link data, both fields are null if not in a link.
	linkData: {
		readonly linkText: string|null;
		readonly linkURL: string|null;
	};

	// If [headerLevel], [listLevel], etc. are zero, then the
	// selection isn't in a header/list
	headerLevel: number;
	listLevel: number;

	// Content of the selection
	selectedText: string;
}
type SelectionFormatting = Readonly<MutableSelectionFormatting>;
export default SelectionFormatting;

export const defaultSelectionFormatting: SelectionFormatting = {
	bolded: false,
	italicized: false,
	inChecklist: false,
	inCode: false,
	inUnorderedList: false,
	inOrderedList: false,
	inMath: false,
	inLink: false,
	spellChecking: false,
	unspellCheckableRegion: false,

	linkData: {
		linkText: null,
		linkURL: null,
	},

	headerLevel: 0,
	listLevel: 0,

	selectedText: '',
};

export const selectionFormattingEqual = (a: SelectionFormatting, b: SelectionFormatting): boolean => {
	// Get keys from the default so that only SelectionFormatting key/value pairs are
	// considered. If a and/or b inherit from SelectionFormatting, we want to ignore
	// keys added by child interfaces.
	const keys = Object.keys(defaultSelectionFormatting) as (keyof SelectionFormatting)[];

	for (const key of keys) {
		if (key === 'linkData') {
			// A deeper check is required for linkData
			if (a[key].linkText !== b[key].linkText || a[key].linkURL !== b[key].linkURL) {
				return false;
			}
		} else if (a[key] !== b[key]) {
			return false;
		}
	}

	return true;
};

