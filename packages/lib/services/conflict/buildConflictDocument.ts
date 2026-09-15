import { MergedSection } from './diffNotes';

export enum ConflictRegionKind {
	Changed = 'changed',
	OnlyMine = 'onlyMine',
	OnlyTheirs = 'onlyTheirs',
}

export interface ConflictDocumentRegion {
	from: number;
	to: number;
	localText: string;
	kind: ConflictRegionKind;
}

export interface ConflictDocument {
	text: string;
	regions: ConflictDocumentRegion[];
}

const kindOf = (localText: string, remoteText: string) => {
	if (localText === '') return ConflictRegionKind.OnlyTheirs;
	if (remoteText === '') return ConflictRegionKind.OnlyMine;
	return ConflictRegionKind.Changed;
};

// Conflicts use the other side's text. The conflict is shown separately as a widget.
export default (sections: MergedSection[]): ConflictDocument => {
	const parts: string[] = [];
	const regions: ConflictDocumentRegion[] = [];
	let offset = 0;
	let wroteALine = false;

	for (const section of sections) {
		const isConflict = section.type === 'conflict';
		const localText = section.localText ?? '';
		const remoteText = section.remoteText ?? '';
		const text = isConflict ? remoteText : section.text;

		const holdsNoLine = isConflict && (section.remoteLineCount ?? (text === '' ? 0 : 1)) === 0;
		const separated = wroteALine && !holdsNoLine;
		if (separated) {
			parts.push('\n');
			offset += 1;
		}

		if (isConflict) {
			regions.push({
				from: offset,
				to: offset + text.length,
				localText,
				kind: kindOf(localText, remoteText),
			});
		}

		parts.push(text);
		offset += text.length;
		if (!holdsNoLine) wroteALine = true;
	}

	return { text: parts.join(''), regions };
};
