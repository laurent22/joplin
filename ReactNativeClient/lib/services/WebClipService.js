const Note = require('lib/models/Note');
const Resource = require('lib/models/Resource');
const ResourceFetcher = require('lib/services/ResourceFetcher');
const BaseService = require('lib/services/BaseService');
const WebClipper = require('lib/services/WebClipper');
const BaseSyncTarget = require('lib/BaseSyncTarget');
const { Logger } = require('lib/logger.js');
const EventEmitter = require('events');
const isUrl = require('valid-url').isWebUri;
const HtmlToMd = require('lib/HtmlToMd');
const markdownUtils = require('lib/markdownUtils');
const Api = require('lib/services/rest/Api');
const api = new Api(() => {
	return Setting.value('api.token');
});

class WebClipService extends BaseService {

	constructor(dispatch = null) {
		super();
		
		this.logger_ = new Logger();
		this.queue_ = [];
		this.dispatch = dispatch;
		this.fetchingItems_ = {};
		this.maxWebClipTasks_ = 3;
		this.addingNotes_ = false;
		this.eventEmitter_ = new EventEmitter();
	}

	static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new WebClipService();
		return this.instance_;
	}

	on(eventName, callback) {
		return this.eventEmitter_.on(eventName, callback);
	}

	off(eventName, callback) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	setLogger(logger) {
		this.logger_ = logger;
	}

	logger() {
		return this.logger_;
	}

	clipper() {
		if (!this.clipper_)
			this.clipper_ = new WebClipper(this);
		return this.clipper_;
	}

	htmlToMdParser() {
		if (this.htmlToMdParser_) return this.htmlToMdParser_;
		this.htmlToMdParser_ = new HtmlToMd();
		return this.htmlToMdParser_;
	}

	queuedItemIndex_(noteId) {
		for (let i = 0; i < this.fetchingItems_.length; i++) {
			const item = this.fetchingItems_[i];
			if (item.id === noteId) return i;
		}
		return -1;
	}

	queueWebClipTask(note, priority = null) {
		if (!note.id || !isUrl(note.body)) return false;
		if (priority === null) priority = 'normal';

		const index = this.queuedItemIndex_(note.id);
		if (index >= 0) return false;

		const item = {id: note.id, url: note.body};

		if (priority === 'high') {
			this.queue_.splice(0, 0, item);
		} else {
			this.queue_.push(item);
		}

		this.scheduleQueueProcess();
		return true;
	}

	async startWebClipTask_(noteId, url) {
		if (this.fetchingItems_[noteId]) return;
		this.fetchingItems_[noteId] = true;

		const completeWebClipTask = (emit = true) => {
			delete this.fetchingItems_[noteId];
			this.scheduleQueueProcess();
			if (emit) this.eventEmitter_.emit('webClipTaskComplete', { id: noteId });
		}

		try {
			const clipper = this.clipper();
			const newNote = await clipper.clipSimplifiedPage(noteId, url);
			const htmlToMdParser = this.htmlToMdParser();
			const newBody = await htmlToMdParser.parse('<div>' + newNote.html + '</div>', {
				baseUrl: newNote.base_url ? newNote.base_url : '',
			});
			const imageUrls = markdownUtils.extractImageUrls(newBody);

			this.logger().debug('clipHtml (' + noteId + '): Downloading images: ', imageUrls);

			let result = await api.downloadImages_(imageUrls);

			this.logger().debug('clipHtml (' + noteId + '): Creating resources from paths: ', result);

			result = await api.createResourcesFromPaths_(result);
			await api.removeTempFiles_(result);
			const noteBody = api.replaceImageUrlsByResources_(newBody, result);
			Note.save({
				id: noteId,
				body: noteBody,
				title: newNote.title,
				source_url: newNote.source_url,
			});
			this.logger().info("completeWebClipTask" + noteId + " " + newNote.title);
			completeWebClipTask();
		} catch(error) {
			this.logger().error('WebClipService: Could not download note: ' + noteId, error);
			completeWebClipTask();
		}
	}

	async processQueue_() {
		while (this.queue_.length && !this.clipper().loading_) {
			const item = this.queue_.splice(0, 1)[0];
			await this.startWebClipTask_(item.id, item.url);
		}

		if (!this.queue_.length) {
			this.autoAddNotes(10);
		}
	}

	async waitForAllFinished() {
		return new Promise((resolve, reject) => {
			const iid = setInterval(() => {
				if (!this.queue_.length && !Object.getOwnPropertyNames(this.fetchingItems_).length) {
					clearInterval(iid);
					resolve();
				}
			}, 100);
		});
	}

	async autoAddNotes(limit) {
		if (this.addingNotes_) return;
		this.addingNotes_ = true;

		let count = 0;
		const options = { conditions: ['title = body'] };
		if (limit) options.limit = limit;
		const notes = await Note.previews(null, options);
		for (let i = 0; i < notes.length; i++) {
			const note = notes[i]
			if (isUrl(note.body)) {
				const added = this.queueWebClipTask(note);
				if (added) count++;
			} else {
				this.logger().debug("not queueWebClipTask for" + note.title);
				//Note.save({ id: note.id, body: '\n'+note.body });
			}
		}

		this.logger().info('WebClipService: Auto-added notes: ' + count);
		this.addingNotes_ = false;
	}

	async exit() {
		await this.waitForAllFinished();
		if (this.scheduleQueueProcessIID_) {
			clearTimeout(this.scheduleQueueProcessIID_);
			this.scheduleQueueProcessIID_ = null;
		}
		this.clipper().stop();
		this.clipper_ =null;
	}

	async start() {
		this.autoAddNotes(10);
	}

	scheduleQueueProcess() {
		if (this.scheduleQueueProcessIID_) {
			clearTimeout(this.scheduleQueueProcessIID_);
			this.scheduleQueueProcessIID_ = null;
		}

		let scheduleIID = setTimeout(() => {
			this.processQueue_(scheduleIID);
			this.scheduleQueueProcessIID_ = null;
		}, 100);
		this.scheduleQueueProcessIID_ = scheduleIID;
	}

	async fetchAll() {
		this.autoAddNotes(null);
	}

}

module.exports = WebClipService;
