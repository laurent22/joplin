import moment from 'moment';
import fs from 'fs-extra';

class Logger {

	constructor() {
		this.targets_ = [];
		this.level_ = Logger.LEVEL_ERROR;
		this.fileAppendQueue_ = []
	}

	setLevel(level) {
		this.level_ = level;
	}

	level() {
		return this.level_;
	}

	clearTargets() {
		this.targets_.clear();
	}

	addTarget(type, options = null) {
		let target = { type: type };
		for (let n in options) {
			if (!options.hasOwnProperty(n)) continue;
			target[n] = options[n];
		}

		this.targets_.push(target);
	}

	log(level, object) {
		if (this.level() < level || !this.targets_.length) return;

		let levelString = '';
		if (this.level() == Logger.LEVEL_INFO) levelString = '[info] ';
		if (this.level() == Logger.LEVEL_WARN) levelString = '[warn] ';
		if (this.level() == Logger.LEVEL_ERROR) levelString = '[error] ';
		let line = moment().format('YYYY-MM-DD HH:mm:ss') + ': ' + levelString;

		for (let i = 0; i < this.targets_.length; i++) {
			let t = this.targets_[i];
			if (t.type == 'console') {
				let fn = 'debug';
				if (level = Logger.LEVEL_ERROR) fn = 'error';
				if (level = Logger.LEVEL_WARN) fn = 'warn';
				if (level = Logger.LEVEL_INFO) fn = 'info';
				if (typeof object === 'object') {
					console[fn](line, object);
				} else {
					console[fn](line + object);
				}
			} else if (t.type == 'file') {
				let serializedObject = '';

				if (typeof object === 'object') {
					if (object instanceof Error) {
						serializedObject = object.toString();
						if (object.stack) serializedObject += "\n" + object.stack;
					} else {
						serializedObject = JSON.stringify(object);
					}
				} else {
					serializedObject = object;
				}

				fs.appendFileSync(t.path, line + serializedObject + "\n");

				// this.fileAppendQueue_.push({
				// 	path: t.path,
				// 	line: line + serializedObject + "\n",
				// });

				// this.scheduleFileAppendQueueProcessing_();
			} else if (t.type == 'vorpal') {
				t.vorpal.log(object);
			}
		}
	}

	// scheduleFileAppendQueueProcessing_() {
	// 	if (this.fileAppendQueueTID_) return;

	// 	this.fileAppendQueueTID_ = setTimeout(async () => {
	// 		this.fileAppendQueueTID_ = null;

	// 		let queue = this.fileAppendQueue_.slice(0);
	// 		for (let i = 0; i < queue.length; i++) {
	// 			let t = queue[i];
	// 			await fs.appendFile(t.path, t.line);
	// 		}
	// 		this.fileAppendQueue_.splice(0, queue.length);
	// 	}, 1);
	// }

	error(object) { return this.log(Logger.LEVEL_ERROR, object); }
	warn(object)  { return this.log(Logger.LEVEL_WARN, object); }
	info(object)  { return this.log(Logger.LEVEL_INFO, object); }
	debug(object) { return this.log(Logger.LEVEL_DEBUG, object); }

}

Logger.LEVEL_NONE = 0;
Logger.LEVEL_ERROR = 10;
Logger.LEVEL_WARN = 20;
Logger.LEVEL_INFO = 30;
Logger.LEVEL_DEBUG = 40;

export { Logger };