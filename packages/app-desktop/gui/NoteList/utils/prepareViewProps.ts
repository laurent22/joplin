import { ListRendererDepependency } from './types';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { Size } from '@joplin/utils/types';

const prepareViewProps = async (dependencies: ListRendererDepependency[], note: NoteEntity, itemSize: Size, selected: boolean, itemIndex: number, noteTitleHtml: string) => {
	const output: any = {};

	for (const dep of dependencies) {

		if (dep.startsWith('note.')) {
			const splitted = dep.split('.');
			if (splitted.length !== 2) throw new Error(`Invalid dependency name: ${dep}`);
			const propName = splitted.pop();
			if (!output.note) output.note = {};
			if (dep === 'note.titleHtml') {
				output.note.titleHtml = noteTitleHtml;
			} else {
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
