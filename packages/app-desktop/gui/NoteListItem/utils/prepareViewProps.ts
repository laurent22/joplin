import { ListRendererDependency } from '@joplin/lib/services/plugins/api/noteListType';
import { FolderEntity, NoteEntity, TagEntity } from '@joplin/lib/services/database/types';
import { Size } from '@joplin/utils/types';
import Note from '@joplin/lib/models/Note';

const prepareViewProps = async (
	dependencies: ListRendererDependency[],
	note: NoteEntity,
	itemSize: Size,
	selected: boolean,
	noteTitleHtml: string,
	noteIsWatched: boolean,
	noteTags: TagEntity[],
	folder: FolderEntity | null,
	itemIndex: number,
) => {
	const output: any = {};

	if (dependencies.includes('note.title') && !dependencies.includes('note.titleHtml')) {
		dependencies = dependencies.slice();
		dependencies.push('note.titleHtml');
	}

	for (const dep of dependencies) {
		if (dep.startsWith('note.')) {
			const splitted = dep.split('.');
			if (splitted.length <= 1) throw new Error(`Invalid dependency name: ${dep}`);
			const propName = splitted.pop();

			if (!output.note) output.note = {};
			if (dep === 'note.titleHtml') {
				output.note.titleHtml = noteTitleHtml;
			} else if (dep === 'note.isWatched') {
				output.note[propName] = noteIsWatched;
			} else if (dep === 'note.tags') {
				output.note[propName] = noteTags;
			} else if (dep === 'note.folder.title') {
				if (!output.note.folder) output.note.folder = {};
				output.note.folder[propName] = folder.title;
			} else {
				// The notes in the state only contain the properties defined in
				// Note.previewFields(). It means that if a view request a
				// property not present there, we need to load the full note.
				// One such missing property is the note body, which we don't
				// load by default.
				if (!(propName in note)) note = await Note.load(note.id);
				if (!(propName in note)) throw new Error(`Invalid dependency name: ${dep}`);
				output.note[propName] = (note as any)[propName];
			}
		}

		if (dep.startsWith('item.size.')) {
			const splitted = dep.split('.');
			if (splitted.length !== 3) throw new Error(`Invalid dependency name: ${dep}`);
			const propName = splitted.pop();
			if (!output.item) output.item = {};
			if (!output.item.size) output.item.size = {};
			if (!(propName in itemSize)) throw new Error(`Invalid dependency name: ${dep}`);
			output.item.size[propName] = (itemSize as any)[propName];
		}

		if (dep === 'item.selected') {
			if (!output.item) output.item = {};
			output.item.selected = selected;
		}

		if (dep === 'item.index') {
			if (!output.item) output.item = {};
			output.item.index = itemIndex;
		}
	}

	return output;
};

export default prepareViewProps;
