import Logger from '../Logger';
import Setting from '../models/Setting';
import shim from '../shim';
import { fileExtension, basename, toSystemSlashes } from '../path-utils';
import time from '../time';
import { NoteEntity } from './database/types';

import Note from '../models/Note';
const EventEmitter = require('events');
const { splitCommandString } = require('../string-utils');
const spawn = require('child_process').spawn;
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

	tempDir() {
		return Setting.value('profileDir');
	}

	on(eventName: string, callback: Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	off(eventName: string, callback: Function) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	setLogger(l: Logger) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	watch(fileToWatch: string) {
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

						const updatedNote = await Note.unserializeForEdit(noteContent);
						updatedNote.id = id;
						updatedNote.parent_id = note.parent_id;
						await Note.save(updatedNote);
						this.eventEmitter_.emit('noteChange', { id: updatedNote.id, note: updatedNote });
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

	noteIdToFilePath_(noteId: string) {
		return `${this.tempDir()}/edit-${noteId}.md`;
	}

	noteFilePathToId_(path: string) {
		let id: any = toSystemSlashes(path, 'linux').split('/');
		if (!id.length) throw new Error(`Invalid path: ${path}`);
		id = id[id.length - 1];
		id = id.split('.');
		id.pop();
		id = id[0].split('-');
		return id[1];
	}

	watchedFiles() {
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

	noteIsWatched(note: NoteEntity) {
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

	textEditorCommand() {
		const editorCommand = Setting.value('editor');
		if (!editorCommand) return null;

		const s = splitCommandString(editorCommand, { handleEscape: false });
		const path = s.splice(0, 1);
		if (!path.length) throw new Error(`Invalid editor command: ${editorCommand}`);

		return {
			path: path[0],
			args: s,
		};
	}

	async spawnCommand(path: string, args: string[], options: any) {
		return new Promise((resolve, reject) => {
			// App bundles need to be opened using the `open` command.
			// Additional args can be specified after --args, and the
			// -n flag is needed to ensure that the app is always launched
			// with the arguments. Without it, if the app is already opened,
			// it will just bring it to the foreground without opening the file.
			// So the full command is:
			//
			// open -n /path/to/editor.app --args -app-flag -bla /path/to/file.md
			//
			if (shim.isMac() && fileExtension(path) === 'app') {
				args = args.slice();
				args.splice(0, 0, '--args');
				args.splice(0, 0, path);
				args.splice(0, 0, '-n');
				path = 'open';
			}

			const wrapError = (error: any) => {
				if (!error) return error;
				const msg = error.message ? [error.message] : [];
				msg.push(`Command was: "${path}" ${args.join(' ')}`);
				error.message = msg.join('\n\n');
				return error;
			};

			try {
				const subProcess = spawn(path, args, options);

				const iid = shim.setInterval(() => {
					if (subProcess && subProcess.pid) {
						this.logger().debug(`Started editor with PID ${subProcess.pid}`);
						shim.clearInterval(iid);
						resolve(null);
					}
				}, 100);

				subProcess.on('error', (error: any) => {
					shim.clearInterval(iid);
					reject(wrapError(error));
				});
			} catch (error) {
				throw wrapError(error);
			}
		});
	}

	async openAndWatch(note: NoteEntity) {
		if (!note || !note.id) {
			this.logger().warn('ExternalEditWatcher: Cannot open note: ', note);
			return;
		}

		const filePath = await this.writeNoteToFile_(note);
		if (!filePath) return;
		this.watch(filePath);

		const cmd = this.textEditorCommand();
		if (!cmd) {
			this.bridge_().openExternal(`file://${filePath}`);
		} else {
			cmd.args.push(filePath);
			await this.spawnCommand(cmd.path, cmd.args, { detached: true });
		}

		this.dispatch({
			type: 'NOTE_FILE_WATCHER_ADD',
			id: note.id,
		});

		this.logger().info(`ExternalEditWatcher: Started watching ${filePath}`);
	}

	async stopWatching(noteId: string) {
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

	async stopWatchingAll() {
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

	async updateNoteFile(note: NoteEntity) {
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

	async writeNoteToFile_(note: NoteEntity) {
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
