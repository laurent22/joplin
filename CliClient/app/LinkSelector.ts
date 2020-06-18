const open = require('open');
interface LinkStoreEntry {
	link: string;
	noteX: number;
	noteY: number;
}

class LinkSelector {
	noteId_: string;
	scrollTop_: number;
	renderedText_: string;
	currentLinkIndex_: number;
	linkStore_: LinkStoreEntry[];
	linkRegex_: RegExp;

	constructor() {
		this.noteId_ = null;
		this.scrollTop_ = null; // used so 'o' won't open unhighlighted link after scrolling
		this.renderedText_ = null;
		this.currentLinkIndex_ = null;
		this.linkStore_ = null;
		this.linkRegex_ = /http:\/\/[0-9.]+:[0-9]+\/[0-9]+/g;
	}

	get link(): string | null {
		if (this.currentLinkIndex_ === null) return null;
		return this.linkStore_[this.currentLinkIndex_].link;
	}

	get noteX(): number | null {
		if (this.currentLinkIndex_ === null) return null;
		return this.linkStore_[this.currentLinkIndex_].noteX;
	}

	get noteY(): number | null {
		if (this.currentLinkIndex_ === null) return null;
		return this.linkStore_[this.currentLinkIndex_].noteY;
	}

	findLinks(renderedText: string): LinkStoreEntry[] {
		const newLinkStore: LinkStoreEntry[] = [];
		const lines: string[] = renderedText.split('\n');
		for (let i = 0; i < lines.length; i++) {
			const matches = [...lines[i].matchAll(this.linkRegex_)];
			matches.forEach((_e, n) => {
				newLinkStore.push(
					{
						link: matches[n][0],
						noteX: matches[n].index,
						noteY: i,
					}
				);
			});
		}
		return newLinkStore;
	}

	updateText(renderedText: string): void {
		this.currentLinkIndex_ = null;
		this.renderedText_ = renderedText;
		this.linkStore_ = this.findLinks(this.renderedText_);
	}

	updateNote(textWidget: any): void {
		this.noteId_ = textWidget.noteId;
		this.scrollTop_ = textWidget.scrollTop_;
		this.updateText(textWidget.renderedText_);
	}

	scrollWidget(textWidget: any): void {
		if (this.currentLinkIndex_ === null) return;

		const noteY = this.linkStore_[this.currentLinkIndex_].noteY;

		let viewBoxMin = textWidget.scrollTop_ + 1;
		let viewBoxMax = viewBoxMin + textWidget.innerHeight - 2;

		if (noteY < viewBoxMin) {
			for (; noteY < viewBoxMin; textWidget.pageUp()) {
				viewBoxMin = textWidget.scrollTop_;
				viewBoxMax = viewBoxMin + textWidget.innerHeight;
			}
			return;

		} else if (noteY > viewBoxMax) {
			for (; noteY > viewBoxMax; textWidget.pageDown()) {
				viewBoxMin = textWidget.scrollTop_;
				viewBoxMax = viewBoxMin + textWidget.innerHeight;
			}
			return;
		}
		return;
	}

	changeLink(textWidget: any, offset: number): void | null {
		if (textWidget.noteId !== this.noteId_) {
			this.updateNote(textWidget);
			this.changeLink(textWidget, offset);
			return;
		}
		if (textWidget.renderedText_ !== this.renderedText_) {
			this.updateText(textWidget.renderedText_);
			this.changeLink(textWidget, offset);
			return;
		}
		if (textWidget.scrollTop_ !== this.scrollTop_) this.scrollTop_ = textWidget.scrollTop_;

		if (!this.linkStore_.length) return null;

		let offsetMod = (offset + this.currentLinkIndex_) % this.linkStore_.length;

		if (this.currentLinkIndex_ === null) {
			if (offsetMod < 0) this.currentLinkIndex_ = this.linkStore_.length + offsetMod;
			else if (!offsetMod) this.currentLinkIndex_ = 0;
			else this.currentLinkIndex_ = offsetMod - 1;
			return;
		}

		if (offsetMod < 0) offsetMod = this.linkStore_.length + offsetMod;

		this.currentLinkIndex_ = offsetMod;
		return;
	}

	openLink(textWidget: any): void {
		if (textWidget.noteId !== this.noteId_) return;
		if (textWidget.renderedText_ !== this.renderedText_) return;
		if (textWidget.scrollTop_ !== this.scrollTop_) return;
		open(this.linkStore_[this.currentLinkIndex_].link);
	}
}

export default LinkSelector;

