import Logger from '../Logger';

const { removeDiacritics } = require('../string-utils.js');

export interface MarkdownNoteData {
	noteId: string;
	parentId: string;
	title: string;
	markdownBody: string;
	normalizedTitle: string;
	normalizedBody: string;
}

export default class MarkdownNoteService {

	public static instance_: MarkdownNoteService = null;

	private logger_ = new Logger();
	private db_: any = null;
	private worker_: Worker = null;

	static instance() {
		if (MarkdownNoteService.instance_) return MarkdownNoteService.instance_;
		MarkdownNoteService.instance_ = new MarkdownNoteService();
		return MarkdownNoteService.instance_;
	}

	setLogger(logger: Logger) {
		this.logger_ = logger;
	}

	logger() {
		return this.logger_;
	}

	setDb(db: any) {
		this.db_ = db;
	}

	db() {
		return this.db_;
	}

	private initWorker() {
		if (this.worker_) return;
		try {
			this.worker_ = new Worker('./MarkdownNoteWorker.js', { type: 'module' });
			this.logger().info('MarkdownNoteService: WebWorker created');
		} catch (error) {
			this.logger().error('MarkdownNoteService: Failed to create WebWorker', error);
		}
	}

	// Save markdown note data to markdown_notes and markdown_notes_normalized tables
	async saveMarkdownNote(data: MarkdownNoteData) {
		if (!this.db_) {
			this.logger().warn('MarkdownNoteService: Database not set, skipping save');
			return;
		}

		const now = Date.now();
		const queries: any[] = [];

		// Upsert into markdown_notes: delete then insert
		queries.push({ sql: 'DELETE FROM markdown_notes WHERE id = ?', params: [data.noteId] });
		queries.push({
			sql: `INSERT INTO markdown_notes (id, parent_id, title, body, created_time, updated_time)
				  VALUES (?, ?, ?, ?, ?, ?)`,
			params: [data.noteId, data.parentId, data.title, data.markdownBody, now, now],
		});

		// Upsert into markdown_notes_normalized: delete then insert
		queries.push({ sql: 'DELETE FROM markdown_notes_normalized WHERE id = ?', params: [data.noteId] });
		queries.push({
			sql: `INSERT INTO markdown_notes_normalized (id, title, body)
				  VALUES (?, ?, ?)`,
			params: [
				data.noteId,
				data.normalizedTitle,
				data.normalizedBody,
			],
		});

		try {
			await this.db_.transactionExecBatch(queries);
			this.logger().debug(`MarkdownNoteService: Saved markdown note ${data.noteId}`);
		} catch (error) {
			this.logger().error(`MarkdownNoteService: Error saving markdown note ${data.noteId}`, error);
		}
	}

	// Delete a markdown note from all markdown tables
	async deleteMarkdownNote(noteId: string) {
		if (!this.db_) return;

		const queries: any[] = [];
		queries.push({ sql: 'DELETE FROM markdown_notes WHERE id = ?', params: [noteId] });
		queries.push({ sql: 'DELETE FROM markdown_notes_normalized WHERE id = ?', params: [noteId] });

		try {
			await this.db_.transactionExecBatch(queries);
		} catch (error) {
			this.logger().error(`MarkdownNoteService: Error deleting markdown note ${noteId}`, error);
		}
	}

	// Convert HTML to Markdown via WebWorker and save to DB
	// This is the main entry point called from Note.save()
	processNote(noteId: string, parentId: string, title: string, body: string) {
		this.initWorker();

		if (!this.worker_) {
			this.logger().warn('MarkdownNoteService: Worker not available, processing synchronously');
			this.processNoteFallback(noteId, parentId, title, body);
			return;
		}

		this.worker_.onmessage = (event: MessageEvent) => {
			const result = event.data;

			if (result.error) {
				this.logger().error(`MarkdownNoteService: Worker error for note ${result.noteId}:`, result.error);
				return;
			}

			void this.saveMarkdownNote({
				noteId: result.noteId,
				parentId: result.parentId,
				title: result.title,
				markdownBody: result.markdownBody,
				normalizedTitle: result.normalizedTitle,
				normalizedBody: result.normalizedBody,
			});
		};

		this.worker_.onerror = (error: ErrorEvent) => {
			this.logger().error('MarkdownNoteService: Worker error:', error.message);
		};

		this.worker_.postMessage({ noteId, parentId, title, body });
	}

	// Fallback synchronous processing when Worker is not available
	private async processNoteFallback(noteId: string, parentId: string, title: string, body: string) {
		try {
			const HtmlToMd = require('../HtmlToMd').default;
			const htmlToMd = new HtmlToMd();
			const markdownBody = htmlToMd.parse(body);
			const normalizedText = (text: string) => {
				const n = text.normalize ? text.normalize() : text;
				return removeDiacritics(n.toLowerCase());
			};

			await this.saveMarkdownNote({
				noteId,
				parentId,
				title,
				markdownBody,
				normalizedTitle: normalizedText(title),
				normalizedBody: normalizedText(markdownBody),
			});
		} catch (error) {
			this.logger().error(`MarkdownNoteService: Fallback processing error for note ${noteId}:`, error);
		}
	}

	async destroy() {
		if (this.worker_) {
			this.worker_.terminate();
			this.worker_ = null;
		}
	}
}
