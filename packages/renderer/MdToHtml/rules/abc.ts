import type * as MarkdownIt from 'markdown-it';
import * as JSON5 from 'json5';

interface AbcContent {
	options: object;
	markup: string;
}

const parseOptions = (options: string) => {
	options = options.trim();
	if (!options) return {};

	try {
		const o = JSON5.parse(options);
		return o ? o : {};
	} catch (error) {
		error.message = `Could not parse ABC options: ${options}: ${error.message}`;
		throw error;
	}
};

const parseAbcContent = (content: string): AbcContent => {
	const pieces = content.split(/\n---\n/g);
	if (pieces.length < 2) return { markup: content.trim(), options: {} };

	return {
		markup: pieces[1].trim(),
		options: parseOptions(pieces[0]),
	};
};

const parseGlobalOptions = (content: string) => {
	content = content.trim();
	if (!content) return {};

	try {
		return JSON5.parse(content);
	} catch (error) {
		error.message = `Could not parse global ABC options: ${content}: ${error.message}`;
		throw error;
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- we still don't have a type for ruleOptions (and it's not RuleOptions)
const plugin = (markdownIt: MarkdownIt, ruleOptions: any) => {
	const defaultRender = markdownIt.renderer.rules.fence || function(tokens, idx, options, env, self) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Imported from ABC plugin and don't want to change the function signature as I'm not sure if it's a type issue or if env and self really aren't needed
		return (self.renderToken as any)(tokens, idx, options, env, self);
	};

	markdownIt.renderer.rules.fence = function(tokens, idx, options, env, self) {
		const token = tokens[idx];
		if (token.info !== 'abc') return defaultRender(tokens, idx, options, env, self);

		const escapeHtml = markdownIt.utils.escapeHtml;

		ruleOptions.context.pluginWasUsed.abc = true;

		try {
			const parsed = parseAbcContent(token.content);
			const globalOptions = ruleOptions.globalSettings ? parseGlobalOptions(ruleOptions.globalSettings['markdown.plugin.abc.options']) : {};
			const content = parsed.markup.trim();
			const contentHtml = escapeHtml(content);
			const optionsHtml = escapeHtml(JSON.stringify({
				...globalOptions,
				...parsed.options,
			}));

			const sourceContentLines: string[] = [];
			if (parsed.options && Object.keys(parsed.options).length) sourceContentLines.push(JSON5.stringify(parsed.options));
			sourceContentLines.push(content);
			const sourceContentHtml = escapeHtml(sourceContentLines.join('\n---\n'));

			return `
				<div class="joplin-editable joplin-abc-notation">
					<pre class="joplin-source" data-abc-options="${optionsHtml}" data-joplin-language="abc" data-joplin-source-open="\`\`\`abc&#10;" data-joplin-source-close="&#10;\`\`\`&#10;">${sourceContentHtml}</pre>
					<pre class="joplin-rendered joplin-abc-notation-rendered">${contentHtml}</pre>
				</div>
			`;
		} catch (error) {
			return `<div class="inline-code">${escapeHtml(error.message)}</div}>`;
		}
	};
};

const assets = () => {
	return [
		{
			inline: true,
			mime: 'text/css',
			text: `
				.abc-notation-block svg {
					background-color: white;
				}
			`,
		},
		{
			name: 'abcjs-basic-min.js',
		},
		{
			name: 'abc_render.js',
		},
	].map(e => {
		return {
			source: 'abc',
			...e,
		};
	});
};

export default {
	plugin,
	assets,
};

