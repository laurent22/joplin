import HtmlToMd from '../HtmlToMd';
import { _ } from '../locale';
import { CommandContext, CommandRuntime, CommandDeclaration } from '../services/CommandService';

export const declaration: CommandDeclaration = {
	name: 'convertHtmlToMarkdown',
	label: () => _('Convert HTML to Markdown'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, html: string) => {
			const htmlToMdParser = new HtmlToMd();

			const markdown = await htmlToMdParser.parse(`<div>${html}</div>`, {
				baseUrl: '',
				anchorNames: [],
				convertEmbeddedPdfsToLinks: true,
			});

			return markdown;
		},
	};
};
