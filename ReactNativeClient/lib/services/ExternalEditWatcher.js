const { Logger } = require('lib/logger.js');
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const { shim } = require('lib/shim');
const chokidar = require('chokidar');
const EventEmitter = require('events');
const { splitCommandString } = require('lib/string-utils');
const spawn	= require('child_process').spawn;

class ExternalEditWatcher {

	constructor(dispatch = null) {
		this.logger_ = new Logger();
		this.dispatch_ = dispatch ? dispatch : (action) => {};
		this.watcher_ = null;
		this.eventEmitter_ = new EventEmitter();
		this.skipNextChangeEvent_ = {};
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

	dispatch(action) {
		this.dispatch_(action);
	}

	watch(fileToWatch) {
		if (!this.watcher_) {
			this.watcher_ = chokidar.watch(fileToWatch);
			this.watcher_.on('all', async (event, path) => {
				this.logger().debug('ExternalEditWatcher: Event: ' + event + ': ' + path);

				if (event === 'unlink') {
					this.watcher_.unwatch(path);
				} else if (event === 'change') {
					const id = Note.pathToId(path);

					if (!this.skipNextChangeEvent_[id]) {
						const note = await Note.load(id);
						const noteContent = await shim.fsDriver().readFile(path, 'utf-8');
						const updatedNote = await Note.unserializeForEdit(noteContent);
						updatedNote.id = id;
						await Note.save(updatedNote);
						this.eventEmitter_.emit('noteChange', { id: updatedNote.id });
					}

					this.skipNextChangeEvent_ = {};
				} else if (event === 'error') {
					this.logger().error('ExternalEditWatcher:');
					this.logger().error(error)
				}
			});
		} else {
			this.watcher_.add(fileToWatch);
		}

		return this.watcher_;
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new ExternalEditWatcher();
		return this.instance_;
	}

	noteFilePath(note) {
		return Setting.value('tempDir') + '/' + note.id + '.md';
	}

	watchedFiles() {
		if (!this.watcher_) return [];

		const output = [];
		const watchedPaths = this.watcher_.getWatched();

		for (let dirName in watchedPaths) {
			if (!watchedPaths.hasOwnProperty(dirName)) continue;

			for (let i = 0; i < watchedPaths[dirName].length; i++) {
				const f = watchedPaths[dirName][i];
				output.push(Setting.value('tempDir') + '/' + f);
			}
		}

		return output;
	}

	noteIsWatched(note) {
		if (!this.watcher_) return false;

		const noteFilename = Note.systemPath(note);

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

		const s = splitCommandString(editorCommand);

		const path = s.splice(0, 1);
		if (!path.length) throw new Error('Invalid editor command: ' + editorCommand);

		return {
			path: path[0],
			args: s,
		};
	}

	async spawnCommand(path, args, options) {
		return new Promise((resolve, reject) => {
			const subProcess = spawn(path, args, options);

			const iid = setInterval(() => {
				if (subProcess && subProcess.pid) {
					this.logger().debug('Started editor with PID ' + subProcess.pid);
					clearInterval(iid);
					resolve();
				}
			}, 100);

			subProcess.on('error', (error) => {
				clearInterval(iid);
				reject(error);
			});
		});
	}

	async openAndWatch(note) {
		if (!note || !note.id) {
			this.logger().warn('ExternalEditWatcher: Cannot open note: ', note);
			return;
		}

		const filePath = await this.writeNoteToFile_(note);
		this.watch(filePath);

		const cmd = this.textEditorCommand();
		if (!cmd) {
			bridge().openExternal('file://' + filePath);
		} else {
			cmd.args.push(filePath);
			await this.spawnCommand(cmd.path, cmd.args, { detached: true });
		}

		this.dispatch({
			type: 'NOTE_FILE_WATCHER_ADD',
			id: note.id,
		});

		this.logger().info('ExternalEditWatcher: Started watching ' + filePath);
	}

	async stopWatching(note) {
		if (!note || !note.id) return;

		const filePath = this.noteFilePath(note);
		if (this.watcher_) this.watcher_.unwatch(filePath);
		await shim.fsDriver().remove(filePath);
		this.dispatch({
			type: 'NOTE_FILE_WATCHER_REMOVE',
			id: note.id,
		});
		this.logger().info('ExternalEditWatcher: Stopped watching ' + filePath);
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

		this.logger().debug('ExternalEditWatcher: Update note file: ' + note.id);

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

		const filePath = this.noteFilePath(note);
		const noteContent = await Note.serializeForEdit(note);
		await shim.fsDriver().writeFile(filePath, noteContent, 'utf-8');
		return filePath;
	}

}

module.exports = ExternalEditWatcher;