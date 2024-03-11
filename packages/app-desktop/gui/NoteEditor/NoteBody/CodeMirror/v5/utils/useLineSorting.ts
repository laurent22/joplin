// Duplicates AceEditors line sorting function
// https://discourse.joplinapp.org/t/sort-lines/8874/2
export default function useLineSorting(CodeMirror: any) {
	CodeMirror.commands.sortSelectedLines = function(cm: any) {
		const ranges = cm.listSelections();
		// Batches the insert operations, if this wasn't done the inserts
		// could potentially overwrite one another
		cm.operation(() => {
			for (let i = 0; i < ranges.length; i++) {
				// anchor is where the selection starts, and head is where it ends
				// this changes based on how the uses makes a selection
				const { anchor, head } = ranges[i];
				const start = Math.min(anchor.line, head.line);
				const end = Math.max(anchor.line, head.line);

				const lines = [];
				for (let j = start; j <= end; j++) {
					lines.push(cm.getLine(j));
				}

				const text = lines.sort().join('\n');
				// Get the end of the last line
				const ch = lines[lines.length - 1].length;

				cm.replaceRange(text, { line: start, ch: 0 }, { line: end, ch: ch });
			}
		});
	};
}
