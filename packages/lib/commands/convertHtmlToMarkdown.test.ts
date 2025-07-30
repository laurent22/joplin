import { runtime } from './convertHtmlToMarkdown';
import { CommandContext } from '../services/CommandService';
import { defaultState } from '../reducer';

const command = runtime();

const makeContext = (): CommandContext => {
	return {
		state: defaultState,
		dispatch: ()=>{},
	};
};

describe('convertHtmlToMarkdown', () => {

	it.each([
		['<b>test</b>', '**test**'],
		['<a href="https://joplin.org">Joplin</a>', '[Joplin](https://joplin.org)'],
		['<h1>Title</h1>\n<h2>Subtitle</h2>', '# Title\n\n## Subtitle'],
		['<ul><li>One</li><li>Two</li></ul>', '- One\n- Two'],
		['<p>First paragraph</p><p>This is the second paragraph</p>', 'First paragraph\n\nThis is the second paragraph'],
		['<p>A paragraph with <strong>bold</strong> and <em>italic</em></p>', 'A paragraph with **bold** and *italic*'],
	])('should turn HTML into Markdown', async (html, markdown) => {
		const context = makeContext();
		const result: string = await command.execute(context, html);

		expect(result).toBe(markdown);
	});

});
