import InteropService_Exporter_Md from './InteropService_Exporter_Md';
import BaseModel from '../../BaseModel';
import NoteTag from '../../models/NoteTag';
import Tag from '../../models/Tag';
import { NoteEntity } from '../database/types';
import { serialize } from '../../utils/frontMatter';

interface NoteTagContext {
	noteTags: Record<string, string[]>;
}

interface TagContext {
	tagTitles: Record<string, string>;
}

interface FrontMatterContext extends NoteTagContext, TagContext {}

export default class InteropService_Exporter_Md_frontmatter extends InteropService_Exporter_Md {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async prepareForProcessingItemType(itemType: number, itemsToExport: any[]) {
		await super.prepareForProcessingItemType(itemType, itemsToExport);

		if (itemType === BaseModel.TYPE_NOTE_TAG) {
			// Get tag list for each note
			const context: NoteTagContext = {
				noteTags: {},
			};
			for (let i = 0; i < itemsToExport.length; i++) {
				const it = itemsToExport[i].type;

				if (it !== itemType) continue;

				const itemOrId = itemsToExport[i].itemOrId;
				const noteTag = typeof itemOrId === 'object' ? itemOrId : await NoteTag.load(itemOrId);

				if (!noteTag) continue;

				if (!context.noteTags[noteTag.note_id]) context.noteTags[noteTag.note_id] = [];
				context.noteTags[noteTag.note_id].push(noteTag.tag_id);
			}

			this.updateContext(context);
		} else if (itemType === BaseModel.TYPE_TAG) {
			// Map tag ID to title
			const context: TagContext = {
				tagTitles: {},
			};
			for (let i = 0; i < itemsToExport.length; i++) {
				const it = itemsToExport[i].type;

				if (it !== itemType) continue;

				const itemOrId = itemsToExport[i].itemOrId;
				const tag = typeof itemOrId === 'object' ? itemOrId : await Tag.load(itemOrId);

				if (!tag) continue;

				context.tagTitles[tag.id] = tag.title;
			}

			this.updateContext(context);
		}
	}

	protected async getNoteExportContent_(modNote: NoteEntity) {
		let tagTitles: string[] = [];
		const context: FrontMatterContext = this.context();
		if (context.noteTags[modNote.id]) {
			const tagIds = context.noteTags[modNote.id];
			// In some cases a NoteTag can still exist, while the Tag does not. In this case, tagTitles
			// for that tagId will return undefined, which can't be handled by the yaml library (issue #7782)
			tagTitles = tagIds.map((id: string) => context.tagTitles[id]).filter(e => !!e).sort();
		}

		return serialize(modNote, tagTitles);
	}

}
