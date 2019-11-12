const { Logger } = require('lib/logger.js');
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const { shim } = require('lib/shim');
const EventEmitter = require('events');
const { splitCommandString } = require('lib/string-utils');
const { fileExtension, basename } = require('lib/path-utils');
const spawn = require('child_process').spawn;
const chokidar = require('chokidar');
const { bridge } = require('electron').remote.require('./bridge');
const { time } = require('lib/time-utils.js');

class ExternalEditWatcher {
	constructor() {
		this.logger_ = new Logger();
		this.dispatch = () => {};
		this.watcher_ = null;
		this.eventEmitter_ = new EventEmitter();
		this.skipNextChangeEvent_ = {};
		this.chokidar_ = chokidar;
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new ExternalEditWatcher();
		return this.instance_;
	}

	tempDir() {
		return Setting.value('profileDir');
	}

	on(eventName, callback) {
		return this.eventEmitter_.on(eventName, callback);
	}

	off(eventName, callback) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	setLogger(l) {
		this.logger_ = l;
	}

	logger() {
		return this.logger_;
	}

	watch(fileToWatch) {
		if (!this.chokidar_) return;

		if (!this.watcher_) {
			this.watcher_ = this.chokidar_.watch(fileToWatch);
			this.watcher_.on('all', async (event, path) => {
				// For now, to investigate the lost content issue when using an external editor,
				// make all the debug statement to info() so that it goes to the log file.
				// Those that were previous debug() statements are marked as "was_debug"

				/* was_debug */ this.logger().info(`ExternalEditWatcher: Event: ${event}: ${path}`);

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
							this.stopWatching(id);
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
						this.eventEmitter_.emit('noteChange', { id: updatedNote.id });
					}

					this.skipNextChangeEvent_ = {};
				} else if (event === 'error') {
					this.logger().error('ExternalEditWatcher: error');
				}
			});
			// Hack to support external watcher on some linux applications (gedit, gvim, etc)
			// taken from https://github.com/paulmillr/chokidar/issues/591
			this.watcher_.on('raw', async (event, path, { watchedPath }) => {
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

	noteIdToFilePath_(noteId) {
		return `${this.tempDir()}/edit-${noteId}.md`;
	}

	noteFilePathToId_(path) {
		let id = path.split('/');
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

		for (let dirName in watchedPaths) {
			if (!watchedPaths.hasOwnProperty(dirName)) continue;

			for (let i = 0; i < watchedPaths[dirName].length; i++) {
				const f = watchedPaths[dirName][i];
				output.push(`${this.tempDir()}/${f}`);
			}
		}

		return output;
	}

	noteIsWatched(note) {
		if (!this.watcher_) return false;

		const noteFilename = basename(this.noteIdToFilePath_(note.id));

		const watchedPaths = this.watcher_.getWatched();

		for (let dirName in watchedPaths) {
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

	async spawn(path, args, options) {
		return new Promise((resolve, reject) => {

			const wrapError = error => {
				if (!error) return error;
				let msg = error.message ? [error.message] : [];
				msg.push(`Command was: "${path}" ${args.join(' ')}`);
				error.message = msg.join('\n\n');
				return error;
			};

			try {
				const subProcess = spawn(path, args, options);

				const iid = setInterval(() => {
					if (subProcess && subProcess.pid) {
						/* was_debug */ this.logger().info(`Started editor with PID ${subProcess.pid}`);
						clearInterval(iid);
						resolve();
					}
				}, 100);

				subProcess.on('error', error => {
					clearInterval(iid);
					reject(wrapError(error));
				});
				if (options.onClose) {
					subProcess.on('close', options.onClose);
				}
			} catch (error) {
				throw wrapError(error);
			}
		});
	}

	async spawnDefault(file, onClose) {
		// windows
		let path = '';

		if (shim.isWindows()) {
			path = 'start';
		} else if (shim.isMac()) {
			path = 'open';
		} else if (shim.isLinux() || shim.isFreeBSD()) {
			path = 'xdg-open';
		} else {
			// Fallback on the electron open method
			return new Promise((resolve, reject) => {

				if (bridge().openExternal(`file://${file}`)) {
					resolve();
				} else {
					reject(new Error(`Could not open file: ${file}`));
				}
			});
		}

		return this.spawn(path, [file], { onClose: onClose });
	}

	async spawnCommand(path, args, options) {
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

		return this.spawn(path, args, options);
	}

	async openAndWatch(note) {
		if (!note || !note.id) {
			this.logger().warn('ExternalEditWatcher: Cannot open note: ', note);
			return;
		}

		const filePath = await this.writeNoteToFile_(note);
		this.watch(filePath);

		const onClose = () => {
			this.stopWatching(note.id);
		};

		const cmd = this.textEditorCommand();
		if (!cmd) {
			await this.spawnDefault(filePath, onClose);
		} else {
			cmd.args.push(filePath);
			await this.spawnCommand(cmd.path, cmd.args, { detached: true, onClose: onClose });
		}

		this.dispatch({
			type: 'NOTE_FILE_WATCHER_ADD',
			id: note.id,
		});

		this.logger().info(`ExternalEditWatcher: Started watching ${filePath}`);
	}

	async stopWatching(noteId) {
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

	async updateNoteFile(note) {
		if (!this.noteIsWatched(note)) return;

		if (!note || !note.id) {
			this.logger().warn('ExternalEditWatcher: Cannot update note file: ', note);
			return;
		}

		/* was_debug */ this.logger().info(`ExternalEditWatcher: Update note file: ${note.id}`);

		// When the note file is updated programmatically, we skip the next change event to
		// avoid update loops. We only want to listen to file changes made by the user.
		this.skipNextChangeEvent_[note.id] = true;

		this.writeNoteToFile_(note);
	}

	async writeNoteToFile_(note) {
		if (!note || !note.id) {
			this.logger().warn('ExternalEditWatcher: Cannot update note file: ', note);
			return;
		}

		const filePath = this.noteIdToFilePath_(note.id);
		const noteContent = await Note.serializeForEdit(note);
		await shim.fsDriver().writeFile(filePath, noteContent, 'utf-8');
		return filePath;
	}
}

module.exports = ExternalEditWatcher;
