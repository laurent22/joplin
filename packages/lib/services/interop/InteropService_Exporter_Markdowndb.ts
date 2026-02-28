import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import BaseModel from '../../BaseModel';
import HtmlToMd from '../../HtmlToMd';

const { removeDiacritics } = require('../../string-utils.js');

export default class InteropService_Exporter_Markdowndb extends InteropService_Exporter_Base {

	private htmlToMd_: HtmlToMd;
	private processedCount_: number = 0;

	async init(_destDir: string, _options: any = {}) {
		this.htmlToMd_ = new HtmlToMd();
		this.processedCount_ = 0;
	}

	private normalizeText(text: string): string {
		const normalizedText = text.normalize ? text.normalize() : text;
		return removeDiacritics(normalizedText.toLowerCase());
	}

	async processItem(itemType: number, item: any) {
		if (itemType !== BaseModel.TYPE_NOTE) return;

		const db = BaseModel.db();
		if (!db) {
			console.warn('InteropService_Exporter_Markdowndb: Database not available');
			return;
		}

		const noteId = item.id;
		const parentId = item.parent_id || '';
		const title = item.title || '';
		const body = item.body || '';

		// Convert HTML to Markdown
		let markdownBody = '';
		try {
			markdownBody = this.htmlToMd_.parse(body);
		} catch (error) {
			console.error(`InteropService_Exporter_Markdowndb: Error converting note ${noteId}:`, error);
			return;
		}

		const now = Date.now();
		const queries: any[] = [];

		// Upsert into markdown_notes: delete then insert
		queries.push({ sql: 'DELETE FROM markdown_notes WHERE id = ?', params: [noteId] });
		queries.push({
			sql: `INSERT INTO markdown_notes (id, parent_id, title, body, created_time, updated_time)
				  VALUES (?, ?, ?, ?, ?, ?)`,
			params: [noteId, parentId, title, markdownBody, now, now],
		});

		// Upsert into markdown_notes_normalized: delete then insert
		// (markdown_notes_fts is auto-populated by SQLite triggers)
		queries.push({ sql: 'DELETE FROM markdown_notes_normalized WHERE id = ?', params: [noteId] });
		queries.push({
			sql: `INSERT INTO markdown_notes_normalized (id, title, body)
				  VALUES (?, ?, ?)`,
			params: [
				noteId,
				this.normalizeText(title),
				this.normalizeText(markdownBody),
			],
		});

		try {
			await db.transactionExecBatch(queries);
			this.processedCount_++;
		} catch (error) {
			console.error(`InteropService_Exporter_Markdowndb: Error saving markdown note ${noteId}:`, error);
		}
	}

	async processResource(_resource: any, _filePath: string) {
		// No file output needed for DB export
	}

	async close() {
		console.log(`InteropService_Exporter_Markdowndb: Processed ${this.processedCount_} notes`);
	}
}
