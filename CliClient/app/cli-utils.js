const stringPadding = require('string-padding');

const cliUtils = {

	printArray: function(logFunction, rows, headers = null) {
		if (!rows.length) return '';

		const ALIGN_LEFT = 0;
		const ALIGN_RIGHT = 1;

		let colWidths = [];
		let colAligns = [];

		for (let i = 0; i < rows.length; i++) {
			let row = rows[i];
			
			for (let j = 0; j < row.length; j++) {
				let item = row[j];
				let width = item ? item.toString().length : 0;
				let align = typeof item == 'number' ? ALIGN_RIGHT : ALIGN_LEFT;
				if (!colWidths[j] || colWidths[j] < width) colWidths[j] = width;
				if (colAligns.length <= j) colAligns[j] = align;
			}
		}

		let lines = [];
		for (let row = 0; row < rows.length; row++) {
			let line = [];
			for (let col = 0; col < colWidths.length; col++) {
				let item = rows[row][col];
				let width = colWidths[col];
				let dir = colAligns[col] == ALIGN_LEFT ? stringPadding.RIGHT : stringPadding.LEFT;
				line.push(stringPadding(item, width, ' ', dir));
			}
			logFunction(line.join(' '));
		}
	},

}

export { cliUtils };