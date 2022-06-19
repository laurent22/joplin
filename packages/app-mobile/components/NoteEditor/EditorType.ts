// Types related to the NoteEditor

export interface ChangeEvent {
	// New editor content
	value: string;
}

export interface UndoRedoDepthChangeEvent {
	undoDepth: number;
	redoDepth: number;
}

export interface Selection {
	start: number;
	end: number;
}

export interface SelectionChangeEvent {
	selection: Selection;
}

// Stores information about the formatting of the region
// contained within the current selection.
export class SelectionFormatting {
	public bolded: boolean = false;
	public italicized: boolean = false;
	public inChecklist: boolean = false;
	public inCode: boolean = false;
	public inUnorderedList: boolean = false;
	public inOrderedList: boolean = false;
	public inMath: boolean = false;

	// If [headerLevel], [listLevel], etc. are zero, then the
	// selection isn't in a header/list
	public headerLevel: number = 0;
	public listLevel: number = 0;

	// List of data properties (for serializing/deseralizing)
	private static propNames: string[] = [
		'bolded', 'italicized', 'inChecklist', 'inCode',
		'inUnorderedList', 'inOrderedList', 'inMath',
		'headerLevel', 'listLevel',
	];

	// Returns true iff [this] is equivalent to [other]
	public eq(other: SelectionFormatting): boolean {
		// Cast to Records to allow usage of the indexing ([])
		// operator.
		const selfAsRec = this as Record<string, any>;
		const otherAsRec = other as Record<string, any>;

		for (const prop of SelectionFormatting.propNames) {
			if (selfAsRec[prop] !== otherAsRec[prop]) {
				return false;
			}
		}

		return true;
	}

	public static fromJSON(json: string): SelectionFormatting {
		const result = new SelectionFormatting();

		// Casting result to a Record<string, any> lets us use
		// the indexing [] operator.
		const resultRecord = result as Record<string, any>;
		const obj = JSON.parse(json) as Record<string, any>;

		for (const prop of SelectionFormatting.propNames) {
			if (obj[prop] !== undefined) {
				// Type checking!
				if (typeof obj[prop] !== typeof resultRecord[prop]) {
					throw new Error([
						'Deserialization Error:',
						`${obj[prop]} and ${resultRecord[prop]}`,
						'have different types.',
					].join(' '));
				}

				resultRecord[prop] = obj[prop];
			}
		}

		return result;
	}

	public toJSON(): string {
		const resultObj: Record<string, any> = {};

		// Cast this to a dictionary. This allows us to use
		// the indexing [] operator.
		const selfAsRecord = this as Record<string, any>;

		for (const prop of SelectionFormatting.propNames) {
			resultObj[prop] = selfAsRecord[prop];
		}

		return JSON.stringify(resultObj);
	}
}

export interface EditorControl {
	undo(): void;
	redo(): void;
	select(anchor: number, head: number): void;
	insertText(text: string): void;

	// Toggle whether we're in a type of region.
	toggleBolded(): void;
	toggleItalicized(): void;
	toggleList(bulleted: boolean): void;
	toggleCode(): void;
	toggleMath(): void;

	toggleHeaderLevel(level: number): void;
}

