import InteropService_Importer_Md from './InteropService_Importer_Md';
import Note from '../../models/Note';
import Tag from '../../models/Tag';
import time from '../../time';
import { NoteEntity } from '../database/types';

import * as yaml from 'js-yaml';

interface ParsedMeta {
	metadata: NoteEntity;
	tags: string[];
}

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

// This is a helper functon to convert an arbitrary author variable into a string
// the use case is for loading from r-markdown/pandoc style notes
// references:
// https://pandoc.org/MANUAL.html#extension-yaml_metadata_block
// https://github.com/hao203/rmarkdown-YAML
function extractAuthor(author: any): string {
	if (!author) return '';

	if (typeof(author) === 'string') {
		return author;
	} else if (Array.isArray(author)) {
		// Joplin only supports a single author, so we take the first one
		return extractAuthor(author[0]);
	} else if (typeof(author) === 'object') {
		if ('name' in author) {
			return author['name'];
		}
	}

	return '';
}

export default class InteropService_Importer_Md_frontmatter extends InteropService_Importer_Md {

	private getNoteHeader(note: string) {
		// Ignore the leading `---`
		const lines = note.split('\n').slice(1);
		let inHeader = true;
		const headerLines: string[] = [];
		const bodyLines: string[] = [];
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const nextLine = i + 1 <= lines.length - 1 ? lines[i + 1] : '';

			if (inHeader && line.startsWith('---')) {
				inHeader = false;

				// Need to eat the extra newline after the yaml block. Note that
				// if the next line is not an empty line, we keep it. Fixes
				// https://github.com/laurent22/joplin/issues/8802
				if (nextLine.trim() === '') i++;

				continue;
			}

			if (inHeader) { headerLines.push(line); } else { bodyLines.push(line); }
		}

		const normalizedHeaderLines = normalizeYamlWhitespace(headerLines);
		const header = normalizedHeaderLines.join('\n');
		const body = bodyLines.join('\n');

		return { header, body };
	}

	private toLowerCase(obj: Record<string, any>): Record<string, any> {
		const newObj: Record<string, any> = {};
		for (const key of Object.keys(obj)) {
			newObj[key.toLowerCase()] = obj[key];
		}

		return newObj;
	}

	private parseYamlNote(note: string): ParsedMeta {
		if (!note.startsWith('---')) return { metadata: { body: note }, tags: [] };

		const { header, body } = this.getNoteHeader(note);

		const md: Record<string, any> = this.toLowerCase(yaml.load(header, { schema: yaml.FAILSAFE_SCHEMA }));
		const metadata: NoteEntity = {
			title: md['title'] || '',
			source_url: md['source'] || '',
			is_todo: ('completed?' in md) ? 1 : 0,
		};

		if ('author' in md) { metadata['author'] = extractAuthor(md['author']); }

		// The date fallback gives support for MultiMarkdown format, r-markdown, and pandoc formats
		if ('created' in md) {
			metadata['user_created_time'] = time.anythingToMs(md['created'], Date.now());
		} else if ('date' in md) {
			metadata['user_created_time'] = time.anythingToMs(md['date'], Date.now());
		}

		if ('updated' in md) {
			metadata['user_updated_time'] = time.anythingToMs(md['updated'], Date.now());
		} else if ('lastmod' in md) {
			// Add support for hugo
			metadata['user_updated_time'] = time.anythingToMs(md['lastmod'], Date.now());
		} else if ('date' in md) {
			metadata['user_updated_time'] = time.anythingToMs(md['date'], Date.now());
		}

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
			tags = md['tags'];
		} else if ('keywords' in md) {
			// Adding support for r-markdown/pandoc
			tags = tags.concat(md['keywords']);
		}

		// Only create unique tags
		tags = [...new Set(tags)] as string[];

		metadata['body'] = body;

		return { metadata, tags };
	}

	public async importFile(filePath: string, parentFolderId: string) {
		const note = await super.importFile(filePath, parentFolderId);
		const { metadata, tags } = this.parseYamlNote(note.body);

		const updatedNote = { ...note, ...metadata };

		const noteItem = await Note.save(updatedNote, { isNew: false, autoTimestamp: false });

		for (const tag of tags) { await Tag.addNoteTagByTitle(noteItem.id, tag); }

		return noteItem;
	}
}
