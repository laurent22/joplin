import InteropService_Exporter_Md from './InteropService_Exporter_Md';
import BaseModel from '../../BaseModel';
import Note from '../../models/Note';
import NoteTag from '../../models/NoteTag';
import Tag from '../../models/Tag';
import time from '../../time';
import { NoteEntity } from '../database/types';
import { YamlExportMetaData } from './types';

import * as yaml from 'js-yaml';

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

export const fieldOrder = ['Title', 'Updated', 'Created', 'Source', 'Author', 'Latitude', 'Longitude', 'Altitude', 'Completed?', 'Due', 'Tags'];

export default class InteropService_Exporter_Yaml extends InteropService_Exporter_Md {

	public async prepareForProcessingItemType(itemType: number, itemsToExport: any[]) {
		await super.prepareForProcessingItemType(itemType, itemsToExport);

		if (itemType === BaseModel.TYPE_NOTE_TAG) {
			// Get tag list for each note
			const context: any = {
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
			const context: any = {
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
		return time.formatMsToLocal(datetime);
	}

	private extractMetadata(note: NoteEntity) {
		const md: YamlExportMetaData = {};
		// Every variable needs to be converted seperately, so they will be handles in groups
		//
		// title
		if (note.title) { md['Title'] = note.title; }

		// source, author
		if (note.source_url) { md['Source'] = note.source_url; }
		if (note.author) { md['Author'] = note.author; }

		// locations
		if (note.latitude) { md['Latitude'] = note.latitude; }
		if (note.longitude) { md['Longitude'] = note.longitude; }
		if (note.altitude) { md['Altitude'] = note.altitude; }

		// todo
		if (note.is_todo) {
			// boolean is not support by the yaml FAILSAFE_SCHEMA
			md['Completed?'] = note.todo_completed ? 'Yes' : 'No';
		}
		if (note.todo_due) { md['Due'] = this.convertDate(note.todo_due); }

		// time
		if (note.user_updated_time) { md['Updated'] = this.convertDate(note.user_updated_time); }
		if (note.user_created_time) { md['Created'] = this.convertDate(note.user_created_time); }

		// tags
		const context = this.context();
		if (context.noteTags[note.id]) {
			const tagIds = context.noteTags[note.id];
			const tags = tagIds.map((id: string) => context.tagTitles[id]).sort();
			md['Tags'] = tags;
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


	public async getNoteExportContent_(modNote: NoteEntity) {
		const noteContent = await Note.replaceResourceInternalToExternalLinks(await Note.serialize(modNote, ['body']));
		const metadata = this.extractMetadata(modNote);
		return `---\n${metadata}---\n\n${noteContent}`;
	}

}
