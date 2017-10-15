const ListWidget = require('tkwidgets/ListWidget.js');

class ConsoleWidget extends ListWidget {

	constructor() {
		super();
	}

	get name() {
		return 'console';
	}

	addItem(v) {
		super.addItem(v);
		this.currentIndex = this.items.length - 1;
	}

}

module.exports = ConsoleWidget;