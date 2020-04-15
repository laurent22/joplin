const TextWidget = require('tkwidgets/TextWidget.js');

class ConsoleWidget extends TextWidget {
	constructor() {
		super();
		this.lines_ = [];
		this.updateText_ = false;
		this.markdownRendering = false;
		this.stickToBottom = true;
		this.maxLines_ = 1000;
	}

	get name() {
		return 'console';
	}

	get lastLine() {
		return this.lines_.length ? this.lines_[this.lines_.length - 1] : '';
	}

	addLine(line) {
		this.lines_.push(line);
		this.updateText_ = true;
		this.invalidate();
	}

	onFocus() {
		this.stickToBottom = false;
		super.onFocus();
	}

	onBlur() {
		this.stickToBottom = true;
		super.onBlur();
	}

	render() {
		if (this.updateText_) {
			if (this.lines_.length > this.maxLines_) {
				this.lines_.splice(0, this.lines_.length - this.maxLines_);
			}
			this.text = this.lines_.join('\n');
			this.updateText_ = false;
		}

		super.render();
	}
}

module.exports = ConsoleWidget;
