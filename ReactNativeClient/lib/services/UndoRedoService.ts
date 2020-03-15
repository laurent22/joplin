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

	handleText(text:string) {
		this.totalKeyEventCount++;
		this.textHistory[this.totalKeyEventCount] = text;
	}

	getValue() { return this.text; }

	clearHistory() { this.textHistory = []; }

	undo() {
		if (this.totalClickEventCount < this.totalKeyEventCount) { this.totalClickEventCount++; }

		if (this.textHistory[this.textHistory.length - this.totalClickEventCount]) {
			this.text = this.textHistory[this.textHistory.length - this.totalClickEventCount];
		} else {
			this.text = this.textHistory[0];
		}
	}

	redo() {
		if ((this.totalClickEventCount) > 1) { this.totalClickEventCount--; }

		if (this.textHistory[this.textHistory.length - this.totalClickEventCount]) {
			this.text = this.textHistory[this.textHistory.length - this.totalClickEventCount];
		} else {
			this.text = this.textHistory[0];
		}
	}
}

const undoRedoService = new UndoRedoService();

module.exports = undoRedoService;
