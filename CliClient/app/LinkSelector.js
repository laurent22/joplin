const open = require('open');
// TODO: Figure out what the underscore after the variable means in other classes

class LinkSelector {
	constructor() {
		this.noteId_ = null; // the note id
		this.scrollTop_ = null; // units from the top of the scroll window
		this.renderedText_ = null; // rendered text string with correct newline chars
		this.currentLink_ = null; // currently selected link. obj with index, link, x, y
		this.linkStore_ = null; // object of all link objects in the text
		this.linkRegex_ = /http:\/\/[0-9.]+:[0-9]+\/[0-9]+/g; // link regex being searched for
	}

	// static findLinks(renderedText) {
	// 	const newLinkStore = [];
	// 	const lines = renderedText.split('\n');
	// 	// find them links
	// 	return newLinkStore;
	// }

	static updateText(renderedText) {
		this.currentLink_ = null;
		this.renderedText_ = renderedText;
		this.linkStore_ = this.findLinks(this.renderedText_);
	}

	static updateNote(textWidget) {
		this.noteId = textWidget.noteId;
		this.scrollTop_ = 0;
		this.updateText(textWidget);
	}

	selectLink(textWidget, offset) {
		if (textWidget.noteId !== this.noteId_) {
			this.updateNote(textWidget);
			this.selectLink(textWidget, offset);
			return;
		}
		if (textWidget.renderedText !== this.renderedText_) {
			this.updateText(textWidget.renderedText);
			this.selectLink(textWidget, offset);
			return;
		}
		if (textWidget.scrollTop !== this.scrollTop_) {
			this.selectLink(textWidget, 0);
			return;
		}

		const offsetMod = offset % this.currentLink_.index;

		if (!this.currentLink_) {
			if (offsetMod < 0) {
				this.currentLink_ = this.linkStore_[this.linkStore_.length + offsetMod];
				this.currentLink_.index = this.linkStore_.length + offsetMod;
			} else if (!offsetMod) {
				this.currentLink_ = this.linkStore_[0];
				this.currentLink_.index = 0;
			} else {
				this.currentLink_ = this.linkStore_[offsetMod - 1];
				this.currentLink_.index = offsetMod - 1;
			}
			return this.currentLink_;
		}

		this.currentLink_ = this.linkStore_[offsetMod];
		this.currentLink_.index = offsetMod;

		return this.currentLink_;
	}

	openLink(textWidget) {
		if (textWidget.noteId !== this.noteId_) return;
		if (textWidget.scrollTop !== this.scrollTop_) {
			return this.selectLink(textWidget, 0);
		}
		open(this.currentLink_);
	}

}

module.exports = LinkSelector;
