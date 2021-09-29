import InteropService_Importer_Md from './InteropService_Importer_Md';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import time from '../../time';
import { NoteEntity } from '../database/types';

import * as yaml from 'js-yaml';

function isTruthy(str: string): boolean {
	return str.toLowerCase() in ['true', 'yes'];
}

// Enforces exactly 2 spaces in front of list items
function normalizeYamlWhitespace(yaml: string[]): string[] {
	return yaml.map(line => {
		const l = line.trimStart();
		if (l.startsWith('-')) {
			return `  ${l}`;
		}

		return line;
	});
}

export default class InteropService_Importer_Md_metadata extends InteropService_Importer_Md {

	private getNoteHeader(note: string) {
		// Ignore the leading `---`
		const lines = note.split('\n').slice(1);
		let inHeader = true;
		const headerLines: string[] = [];
		const bodyLines: string[] = [];
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (inHeader && line.startsWith('---')) {
				inHeader = false;
				i++; // Need to eat the extra newline after the yaml block
				continue;
			}

			if (inHeader) { headerLines.push(line); } else { bodyLines.push(line); }
		}

		const normalizedHeaderLines = normalizeYamlWhitespace(headerLines);
		const header = normalizedHeaderLines.join('\n');
		const body = bodyLines.join('\n');

		return { header, body };
	}

	private toLowerCase(obj: any) {
		const newObj: any = {};
		for (const key in obj) {
			newObj[key.toLowerCase()] = obj[key];
		}

		return newObj;
	}

	private parseYamlNote(note: string) {
		if (!note.startsWith('---')) return { metadata: { body: note }, tags: [] };

		const { header, body } = this.getNoteHeader(note);

		const md: any = this.toLowerCase(yaml.load(header, { schema: yaml.FAILSAFE_SCHEMA }));
		const metadata: NoteEntity = {
			title: md['title'] || '',
			source_url: md['source'] || '',
			author: md['author'] || '',
			is_todo: ('completed?' in md) ? 1 : 0,
		};

		if (md['created']) { metadata['user_created_time'] = time.anythingToMs(md['created'], Date.now()); }
		if (md['updated']) { metadata['user_updated_time'] = time.anythingToMs(md['updated'], Date.now()); }

		if ('latitude' in md) { metadata['latitude'] = md['latitude']; }
		if ('longitude' in md) { metadata['longitude'] = md['longitude']; }
		if ('altitude' in md) { metadata['altitude'] = md['altitude']; }

		if (metadata.is_todo) {
			if (isTruthy(md['completed?'])) {
				// Completed time isn't preserved, so we use a sane choice here
				metadata['todo_completed'] = metadata['user_updated_time'];
			}
			if ('due' in md) {
				const due_date = time.anythingToMs(md['due'], null);
				if (due_date) { metadata['todo_due'] = due_date; }
			}
		}

		// Tags are handled seperately from typical metadata
		let tags: string[] = [];
		if ('tags' in md) {
			// Only create unique tags
			tags = [...new Set(md['tags'])] as string[];
		}

		metadata['body'] = body;

		return { metadata, tags };
	}

	public async importFile(filePath: string, parentFolderId: string) {
		const note = await super.importFile(filePath, parentFolderId);
		const { metadata, tags } = this.parseYamlNote(note.body);

		const updatedNote = Object.assign({}, note, metadata);

		const noteItem = await Note.save(updatedNote, { isNew: false, autoTimestamp: false });

		for (const tag of tags) { await Tag.addNoteTagByTitle(noteItem.id, tag); }

		return noteItem;
	}
}
