import { Config } from '../../utils/types';
import JoplinDatabase from '@joplin/lib/JoplinDatabase';
import Logger from '@joplin/lib/Logger';
import BaseModel from '@joplin/lib/BaseModel';
// import BaseItem from "@joplin/lib/models/BaseItem";
import Note from '@joplin/lib/models/Note';
import { File } from '../../db';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { MarkupToHtml } from '@joplin/renderer';
import Setting from '@joplin/lib/models/Setting';
const { DatabaseDriverNode } = require('@joplin/lib/database-driver-node.js');
const { themeStyle } = require('@joplin/lib/theme');

const logger = Logger.create('JoplinApp');

export default class Application {

	private config_: Config;

	// Although we don't use the database to store data, we still need to setup
	// so that its schema can be accessed. This needed for example to knoww what
	// fields are valid for a note.
	private db_: JoplinDatabase;

	private markupToHtml_: MarkupToHtml;

	public constructor(config: Config) {
		this.config_ = config;
	}

	public async initialize() {
		const filePath = `${this.config_.tempDir}/joplin.sqlite`;

		this.db_ = new JoplinDatabase(new DatabaseDriverNode());
		this.db_.setLogger(logger as Logger);
		await this.db_.open({ name: filePath });

		BaseModel.setDb(this.db_);

		// BaseItem.loadClass('Note', Note);
		// BaseItem.loadClass('Folder', Folder);
		// BaseItem.loadClass('Resource', Resource);
		// BaseItem.loadClass('Tag', Tag);
		// BaseItem.loadClass('NoteTag', NoteTag);
		// BaseItem.loadClass('MasterKey', MasterKey);
		// BaseItem.loadClass('Revision', Revision);

		this.markupToHtml_ = new MarkupToHtml({});
	}

	public async renderFile(file: File): Promise<string> {
		const note: NoteEntity = await Note.unserialize(file.content.toString());
		const result = await this.markupToHtml_.render(note.markup_language, note.body, themeStyle(Setting.THEME_LIGHT), {});
		return `${note.title}\n\n${result.html}`;
	}

	public async isNoteFile(file: File): Promise<boolean> {
		if (file.mime_type !== 'text/markdown') return false;

		try {
			await Note.unserialize(file.content.toString());
		} catch (error) {
			console.info(error);
			// No need to log - it means it's not a note file
			return false;
		}

		return true;
	}

}
