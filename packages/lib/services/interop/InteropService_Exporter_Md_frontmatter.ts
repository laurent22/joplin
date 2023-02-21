import InteropService_Exporter_Md from './InteropService_Exporter_Md';
import BaseModel from '../../BaseModel';
import Note from '../../models/Note';
import NoteTag from '../../models/NoteTag';
import Tag from '../../models/Tag';
import time from '../../time';
import { NoteEntity } from '../database/types';
import { MdFrontMatterExport } from './types';

import * as yaml from 'js-yaml';

interface NoteTagContext {
	noteTags: Record<string, string[]>;
}

interface TagContext {
	tagTitles: Record<string, string>;
}

interface FrontMatterContext extends NoteTagContext, TagContext {}

// There is a special case (negative numbers) where the yaml library will force quotations
// These need to be stripped
function trimQuotes(rawOutput: string): string {
	return rawOutput.split('\n').map(line => {
		const index = line.indexOf(': \'-');
		if (index >= 0) {
			// The plus 2 eats the : and space characters
			const start = line.substring(0, index + 2);
			//  The plus 3 eats the quote character
			const end = line.substring(index + 3, line.length - 1);
			return start + end;
		}
		return line;
	}).join('\n');
}

export const fieldOrder = ['title', 'updated', 'created', 'source', 'author', 'latitude', 'longitude', 'altitude', 'completed?', 'due', 'tags'];

export default class InteropService_Exporter_Md_frontmatter extends InteropService_Exporter_Md {

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

	private convertDate(datetime: number): string {
		return time.unixMsToRfc3339Sec(datetime);
	}

	private extractMetadata(note: NoteEntity) {
		const md: MdFrontMatterExport = {};
		// Every variable needs to be converted seperately, so they will be handles in groups
		//
		// title
		if (note.title) { md['title'] = note.title; }

		// source, author
		if (note.source_url) { md['source'] = note.source_url; }
		if (note.author) { md['author'] = note.author; }

		// locations
		// non-strict inequality is used here to interpret the location strings
		// as numbers i.e 0.000000 is the same as 0.
		// This is necessary because these fields are officially numbers, but often
		// contain strings.

		// eslint-disable-next-line eqeqeq
		if (note.latitude != 0 || note.longitude != 0 || note.altitude != 0) {
			md['latitude'] = note.latitude;
			md['longitude'] = note.longitude;
			md['altitude'] = note.altitude;
		}

		// todo
		if (note.is_todo) {
			// boolean is not support by the yaml FAILSAFE_SCHEMA
			md['completed?'] = note.todo_completed ? 'yes' : 'no';
		}
		if (note.todo_due) { md['due'] = this.convertDate(note.todo_due); }

		// time
		if (note.user_updated_time) { md['updated'] = this.convertDate(note.user_updated_time); }
		if (note.user_created_time) { md['created'] = this.convertDate(note.user_created_time); }

		// tags
		const context: FrontMatterContext = this.context();
		if (context.noteTags[note.id]) {
			const tagIds = context.noteTags[note.id];
			// In some cases a NoteTag can still exist, while the Tag does not. In this case, tagTitles
			// for that tagId will return undefined, which can't be handled by the yaml library (issue #7782)
			const tags = tagIds.map((id: string) => context.tagTitles[id]).filter(e => !!e).sort();
			if (tags.length > 0) {
				md['tags'] = tags;
			}
		}

		// This guarentees that fields will always be ordered the same way
		// which can be useful if users are using this for generating diffs
		const sort = (a: string, b: string) => {
			return fieldOrder.indexOf(a) - fieldOrder.indexOf(b);
		};

		// The FAILSAFE_SCHEMA along with noCompatMode allows this to export strings that look
		// like numbers (or yes/no) without the added '' quotes around the text
		const rawOutput = yaml.dump(md, { sortKeys: sort, noCompatMode: true, schema: yaml.FAILSAFE_SCHEMA });
		// The additional trimming is the unfortunate result of the yaml library insisting on
		// quoting negative numbers.
		// For now the trimQuotes function only trims quotes associated with a negative number
		// but it can be extended to support more special cases in the future if necessary.
		return trimQuotes(rawOutput);
	}


	protected async getNoteExportContent_(modNote: NoteEntity) {
		const noteContent = await Note.replaceResourceInternalToExternalLinks(await Note.serialize(modNote, ['body']));
		const metadata = this.extractMetadata(modNote);
		return `---\n${metadata}---\n\n${noteContent}`;
	}

}
