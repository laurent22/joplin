function IObject() { this.i; return this; }
const iObject = new IObject(); iObject.i = 0;
const _iObject = new IObject(); _iObject.i = 0;
let history = new Array();
let text = '';

class UndoRedoService {
	static handleText(text) {
		iObject.i++;
		const y = iObject.i;
		const x = text;
		history[y] = x;
	}

	static getValue() { return text; }

	static clearHistory() { history = []; }

	static undo() {
		if ((_iObject.i) < (iObject.i)) { _iObject.i++; }
		const j = history.length - _iObject.i;

		if (history[j]) { text = history[j]; } else { text = history[0]; }
	}

	static redo() {
		if ((_iObject.i) > 1) { _iObject.i--; }
		const j = history.length - _iObject.i;

		if (history[j]) { text = history[j]; } else { text = history[0]; }
	}
}

module.exports = UndoRedoService;
