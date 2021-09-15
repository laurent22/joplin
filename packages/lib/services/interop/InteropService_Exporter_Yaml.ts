import InteropService_Exporter_Md from './InteropService_Exporter_Md';
import BaseModel from '../../BaseModel';
import Note from '../../models/Note';
import NoteTag from '../../models/NoteTag';
import Tag from '../../models/Tag';
import Time from '../../time';
import { NoteEntity } from '../database/types';
import { YamlExportMetaData } from './types';

import * as yaml from 'js-yaml';

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
		return Time.formatMsToLocal(datetime);
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
			md['Completed?'] = !!note.todo_completed;
		}
		if (note.todo_due) { md['Due'] = this.convertDate(note.todo_due); }

		// time
		if (note.user_updated_time) { md['Updated'] = this.convertDate(note.user_updated_time); }
		if (note.user_created_time) { md['Created'] = this.convertDate(note.user_created_time); }

		// tags
		const context = this.context();
		if (context.noteTags[note.id]) {
			const tagIds = context.noteTags[note.id];
			const tags = tagIds.map((id: string) => context.tagTitles[id]);
			md['Tags'] = tags;
		}

		// This guarentees that fields will always be ordered the same way
		// which can be useful if users are using this for generating diffs
		const fieldOrder = ['Title', 'Updated', 'Created', 'Source', 'Author', 'Latitude', 'Longitude', 'Altitude', 'Completed?', 'Due', 'Tags'];
		const sort = (a: string, b: string) => {
			return fieldOrder.indexOf(a) - fieldOrder.indexOf(b);
		};

		return yaml.dump(md, { sortKeys: sort });
	}

	public async getNoteExportContent_(modNote: NoteEntity) {
		const noteContent = await Note.replaceResourceInternalToExternalLinks(await Note.serialize(modNote, ['body']));
		const metadata = this.extractMetadata(modNote);
		return `---\n${metadata}---\n\n${noteContent}`;
	}

}
