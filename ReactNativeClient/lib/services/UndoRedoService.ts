class UndoRedoService {
	totalKeyEventCount:any;
	totalClickEventCount:any;
	textHistory:string[];
	text:string;

	constructor() {
		this.totalKeyEventCount = 0;
		this.totalClickEventCount = 0;
		this.textHistory = [];
		this.text = '';
	}

	// It will, increment totalKeyEventCount on text change and get the text
	// to store with refrence to totalKeyEventCount inside textHistory[]
	handleText(text:string) {
		this.totalKeyEventCount++;
		this.textHistory[this.totalKeyEventCount] = text;
	}

	// It will return the text value assigned
	getValue() {
		return this.text;
	}

	// It will empty the textHistory[]
	clearHistory() {
		this.textHistory = [];
	}

	// It will increment totalClickEventCount if it is less than totalKeyEventCount
	// so to find out the text position from textHistory[]
	undo() {
		if (this.totalClickEventCount < this.totalKeyEventCount) {
			this.totalClickEventCount++;
		}
		this.text = this.textHistory[this.textHistory.length - this.totalClickEventCount];
	}

	// It will decrement totalClickEventCount if it is greater than 1
	// so to find out the text position from textHistory[]
	redo() {
		if (this.totalClickEventCount > 1) {
			this.totalClickEventCount--;
		}
		this.text = this.textHistory[this.textHistory.length - this.totalClickEventCount];
	}
}

module.exports = UndoRedoService;
