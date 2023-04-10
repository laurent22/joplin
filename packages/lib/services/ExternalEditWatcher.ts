import Logger from '../Logger';
import Setting from '../models/Setting';
import shim from '../shim';
import { basename, toSystemSlashes } from '../path-utils';
import time from '../time';
import { NoteEntity } from './database/types';
import Note from '../models/Note';
import { openFileWithExternalEditor } from './ExternalEditWatcher/utils';
const EventEmitter = require('events');
const chokidar = require('chokidar');
const { ErrorNotFound } = require('./rest/utils/errors');

export default class ExternalEditWatcher {

	private dispatch: Function;
	private bridge_: Function;
	private logger_: Logger = new Logger();
	private watcher_: any = null;
	private eventEmitter_: any = new EventEmitter();
	private skipNextChangeEvent_: any = {};
	private chokidar_: any = chokidar;

	private static instance_: ExternalEditWatcher;

	public static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new ExternalEditWatcher();
		return this.instance_;
	}

	public initialize(bridge: Function, dispatch: Function) {
		this.bridge_ = bridge;
		this.dispatch = dispatch;
	}

	public externalApi() {
		const loadNote = async (noteId: string) => {
			const note = await Note.load(noteId);
			if (!note) throw new ErrorNotFound(`No such note: ${noteId}`);
			return note;
		};

		return {
			openAndWatch: async (args: any) => {
				const note = await loadNote(args.noteId);
				return this.openAndWatch(note);
			},
			stopWatching: async (args: any) => {
				return this.stopWatching(args.noteId);
			},
			noteIsWatched: async (args: any) => {
				const note = await loadNote(args.noteId);
				return this.noteIsWatched(note);
			},
		};
	}

	public tempDir() {
		return Setting.value('profileDir');
	}

	public on(eventName: string, callback: Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	public off(eventName: string, callback: Function) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	public setLogger(l: Logger) {
		this.logger_ = l;
	}

	public logger() {
		return this.logger_;
	}

	public watch(fileToWatch: string) {
		if (!this.chokidar_) return;

		if (!this.watcher_) {
			this.watcher_ = this.chokidar_.watch(fileToWatch, {
				useFsEvents: false,
			});

			this.watcher_.on('all', async (event: string, path: string) => {
				this.logger().debug(`ExternalEditWatcher: Event: ${event}: ${path}`);

				if (event === 'unlink') {
					// File are unwatched in the stopWatching functions below. When we receive an unlink event
					// here it might be that the file is quickly moved to a different location and replaced by
					// another file with the same name, as it happens with emacs. So because of this
					// we keep watching anyway.
					// See: https://github.com/laurent22/joplin/issues/710#issuecomment-420997167
					// this.watcher_.unwatch(path);
				} else if (event === 'change') {
					const id = this.noteFilePathToId_(path);

					if (!this.skipNextChangeEvent_[id]) {
						const note = await Note.load(id);

						if (!note) {
							this.logger().warn(`ExternalEditWatcher: Watched note has been deleted: ${id}`);
							void this.stopWatching(id);
							return;
						}

						let noteContent = await shim.fsDriver().readFile(path, 'utf-8');

						// In some very rare cases, the "change" event is going to be emitted but the file will be empty.
						// This is likely to be the editor that first clears the file, then writes the content to it, so if
						// the file content is read very quickly after the change event, we'll get empty content.
						// Usually, re-reading the content again will fix the issue and give back the file content.
						// To replicate on Windows: associate Typora as external editor, and leave Ctrl+S pressed -
						// it will keep on saving very fast and the bug should happen at some point.
						// Below we re-read the file multiple times until we get the content, but in my tests it always
						// work in the first try anyway. The loop is just for extra safety.
						// https://github.com/laurent22/joplin/issues/1854
						if (!noteContent) {
							this.logger().warn(`ExternalEditWatcher: Watched note is empty - this is likely to be a bug and re-reading the note should fix it. Trying again... ${id}`);

							for (let i = 0; i < 10; i++) {
								noteContent = await shim.fsDriver().readFile(path, 'utf-8');
								if (noteContent) {
									this.logger().info(`ExternalEditWatcher: Note is now readable: ${id}`);
									break;
								}
								await time.msleep(100);
							}

							if (!noteContent) this.logger().warn(`ExternalEditWatcher: Could not re-read note - user might have purposely deleted note content: ${id}`);
						}

						this.logger().debug('ExternalEditWatcher: Updating note object.');

						const updatedNote = await Note.unserializeForEdit(noteContent);
						updatedNote.id = id;
						updatedNote.parent_id = note.parent_id;
						await Note.save(updatedNote);
						this.eventEmitter_.emit('noteChange', { id: updatedNote.id, note: updatedNote });
					} else {
						this.logger().debug('ExternalEditWatcher: Skipping this event.');
					}

					this.skipNextChangeEvent_ = {};
				} else if (event === 'error') {
					this.logger().error('ExternalEditWatcher: error');
				}
			});
			// Hack to support external watcher on some linux applications (gedit, gvim, etc)
			// taken from https://github.com/paulmillr/chokidar/issues/591
			this.watcher_.on('raw', async (event: string, _path: string, options: any) => {
				const watchedPath: string = options.watchedPath;
				this.logger().debug(`ExternalEditWatcher: Raw event: ${event}: ${watchedPath}`);
				if (event === 'rename') {
					this.watcher_.unwatch(watchedPath);
					this.watcher_.add(watchedPath);
				}
			});
		} else {
			this.watcher_.add(fileToWatch);
		}

		return this.watcher_;
	}

	private noteIdToFilePath_(noteId: string) {
		return `${this.tempDir()}/edit-${noteId}.md`;
	}

	private noteFilePathToId_(path: string) {
		let id: any = toSystemSlashes(path, 'linux').split('/');
		if (!id.length) throw new Error(`Invalid path: ${path}`);
		id = id[id.length - 1];
		id = id.split('.');
		id.pop();
		id = id[0].split('-');
		return id[1];
	}

	public watchedFiles() {
		if (!this.watcher_) return [];

		const output = [];
		const watchedPaths = this.watcher_.getWatched();

		for (const dirName in watchedPaths) {
			if (!watchedPaths.hasOwnProperty(dirName)) continue;

			for (let i = 0; i < watchedPaths[dirName].length; i++) {
				const f = watchedPaths[dirName][i];
				output.push(`${this.tempDir()}/${f}`);
			}
		}

		return output;
	}

	public noteIsWatched(note: NoteEntity) {
		if (!this.watcher_) return false;

		const noteFilename = basename(this.noteIdToFilePath_(note.id));

		const watchedPaths = this.watcher_.getWatched();

		for (const dirName in watchedPaths) {
			if (!watchedPaths.hasOwnProperty(dirName)) continue;

			for (let i = 0; i < watchedPaths[dirName].length; i++) {
				const f = watchedPaths[dirName][i];
				if (f === noteFilename) return true;
			}
		}

		return false;
	}

	public async openAndWatch(note: NoteEntity) {
		if (!note || !note.id) {
			this.logger().warn('ExternalEditWatcher: Cannot open note: ', note);
			return;
		}

		const filePath = await this.writeNoteToFile_(note);
		if (!filePath) return;
		this.watch(filePath);

		await openFileWithExternalEditor(filePath, this.bridge_());

		this.dispatch({
			type: 'NOTE_FILE_WATCHER_ADD',
			id: note.id,
		});

		this.logger().info(`ExternalEditWatcher: Started watching ${filePath}`);
	}

	public async stopWatching(noteId: string) {
		if (!noteId) return;

		const filePath = this.noteIdToFilePath_(noteId);
		if (this.watcher_) this.watcher_.unwatch(filePath);
		await shim.fsDriver().remove(filePath);
		this.dispatch({
			type: 'NOTE_FILE_WATCHER_REMOVE',
			id: noteId,
		});
		this.logger().info(`ExternalEditWatcher: Stopped watching ${filePath}`);
	}

	public async stopWatchingAll() {
		const filePaths = this.watchedFiles();
		for (let i = 0; i < filePaths.length; i++) {
			await shim.fsDriver().remove(filePaths[i]);
		}

		if (this.watcher_) this.watcher_.close();
		this.watcher_ = null;
		this.logger().info('ExternalEditWatcher: Stopped watching all files');
		this.dispatch({
			type: 'NOTE_FILE_WATCHER_CLEAR',
		});
	}

	public async updateNoteFile(note: NoteEntity) {
		if (!this.noteIsWatched(note)) return;

		if (!note || !note.id) {
			this.logger().warn('ExternalEditWatcher: Cannot update note file: ', note);
			return;
		}

		this.logger().debug(`ExternalEditWatcher: Update note file: ${note.id}`);

		// When the note file is updated programmatically, we skip the next change event to
		// avoid update loops. We only want to listen to file changes made by the user.
		this.skipNextChangeEvent_[note.id] = true;

		await this.writeNoteToFile_(note);
	}

	private async writeNoteToFile_(note: NoteEntity) {
		if (!note || !note.id) {
			this.logger().warn('ExternalEditWatcher: Cannot update note file: ', note);
			return null;
		}

		const filePath = this.noteIdToFilePath_(note.id);
		const noteContent = await Note.serializeForEdit(note);
		await shim.fsDriver().writeFile(filePath, noteContent, 'utf-8');
		return filePath;
	}
}
