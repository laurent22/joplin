/* eslint-disable import/prefer-default-export */

export interface RenderedNoteMetadata {
	printTitle: boolean;
}

export const parseRenderedNoteMetadata = (noteHtml: string) => {
	const output: RenderedNoteMetadata = {
		printTitle: true,
	};

	// <!-- joplin-metadata-print-title = false -->
	const match = noteHtml.match(/<!--[\s]+joplin-metadata-(.*?)[\s]+=[\s]+(.*?)[\s]+-->/);
	if (match) {
		const [, propName, propValue] = match;

		if (propName === 'print-title') {
			output.printTitle = propValue.toLowerCase() === 'true' || propValue === '1';
		} else {
			throw new Error(`Unknown view metadata: ${propName}`);
		}
	}

	return output;
};
