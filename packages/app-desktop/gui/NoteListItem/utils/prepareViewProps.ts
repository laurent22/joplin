import { ListRendererDependency } from '@joplin/lib/services/plugins/api/noteListType';
import { NoteEntity, TagEntity } from '@joplin/lib/services/database/types';
import { Size } from '@joplin/utils/types';
import Note from '@joplin/lib/models/Note';
import propRendering from './propRendering';

const prepareViewProps = async (
	dependencies: ListRendererDependency[],
	note: NoteEntity,
	itemSize: Size,
	selected: boolean,
	noteTitleHtml: string,
	noteIsWatched: boolean,
	noteTags: TagEntity[],
	itemIndex: number,
) => {
	const output: any = {};

	if (dependencies.includes('note.title') && !dependencies.includes('note.titleHtml')) {
		dependencies = dependencies.slice();
		dependencies.push('note.titleHtml');
	}

	for (const dep of dependencies) {
		const baseName = dep.endsWith('.display') ? dep.substring(0, dep.length - 8) : dep;

		if (baseName.startsWith('note.')) {
			const splitted = baseName.split('.');
			if (splitted.length !== 2) throw new Error(`Invalid dependency name: ${dep}`);
			const propName = splitted.pop();
			if (!output.note) output.note = {};
			if (baseName === 'note.titleHtml') {
				output.note.titleHtml = noteTitleHtml;
			} else if (baseName === 'note.isWatched') {
				output.note[propName] = propRendering(dep, noteIsWatched);
			} else if (baseName === 'note.tags') {
				output.note[propName] = propRendering(dep, noteTags);
			} else {
				// The notes in the state only contain the properties defined in
				// Note.previewFields(). It means that if a view request a
				// property not present there, we need to load the full note.
				// One such missing property is the note body, which we don't
				// load by default.
				if (!(propName in note)) note = await Note.load(note.id);
				if (!(propName in note)) throw new Error(`Invalid dependency name: ${dep}`);
				output.note[propName] = propRendering(dep, (note as any)[propName]);
			}
		}

		if (baseName.startsWith('item.size.')) {
			const splitted = baseName.split('.');
			if (splitted.length !== 3) throw new Error(`Invalid dependency name: ${dep}`);
			const propName = splitted.pop();
			if (!output.item) output.item = {};
			if (!output.item.size) output.item.size = {};
			if (!(propName in itemSize)) throw new Error(`Invalid dependency name: ${dep}`);
			output.item.size[propName] = (itemSize as any)[propName];
		}

		if (baseName === 'item.selected') {
			if (!output.item) output.item = {};
			output.item.selected = selected;
		}

		if (baseName === 'item.index') {
			if (!output.item) output.item = {};
			output.item.index = itemIndex;
		}
	}

	return output;
};

export default prepareViewProps;
