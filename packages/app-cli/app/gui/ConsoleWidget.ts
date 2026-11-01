const TextWidget = require('tkwidgets/TextWidget.js');

class ConsoleWidget extends TextWidget {
	private lines_: string[];
	private updateText_: boolean;
	public markdownRendering: boolean;
	public stickToBottom: boolean;
	private maxLines_: number;

	public constructor() {
		super();
		this.lines_ = [];
		this.updateText_ = false;
		this.markdownRendering = false;
		this.stickToBottom = true;
		this.maxLines_ = 1000;
	}

	public get name() {
		return 'console';
	}

	public get lastLine() {
		return this.lines_.length ? this.lines_[this.lines_.length - 1] : '';
	}

	public addLine(line: string) {
		this.lines_.push(line);
		this.updateText_ = true;
		this.invalidate();
	}

	public onFocus() {
		this.stickToBottom = false;
		super.onFocus();
	}

	public onBlur() {
		this.stickToBottom = true;
		super.onBlur();
	}

	public clear() {
		this.lines_ = [];
		this.updateText_ = true;
		this.invalidate();
	}

	public render() {
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

export default ConsoleWidget;
