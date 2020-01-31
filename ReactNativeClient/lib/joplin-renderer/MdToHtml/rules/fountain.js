const fountain = require('../../vendor/fountain.min.js');

const fountainCss = `
.fountain {
	font-family: monospace;
	line-height: 107%;
	max-width: 1000px;
	margin-left: auto;
	margin-right: auto;
}

.fountain .title-page,
.fountain .page { 
	box-shadow: 0 0 5px rgba(0,0,0,0.1);
	border: 1px solid #d2d2d2;
	padding: 10%;
	margin-bottom: 2em;
}

.fountain h1,
.fountain h2,
.fountain h3,
.fountain h4,
.fountain p {
	font-weight: normal;
	line-height: 107%;
	margin: 1em 0;
	border: none;
	font-size: 1em;
}

.fountain .bold {
	font-weight: bold;
}

.fountain .underline {
	text-decoration: underline;
}

.fountain .centered {
	text-align: center;
}

.fountain h2 {
	text-align: right;
}

.fountain .dialogue p.parenthetical {
	margin-left: 11%;
}

.fountain .title-page .credit,
.fountain .title-page .authors,
.fountain .title-page .source {
	text-align: center;
}

.fountain .title-page h1 {
	margin-bottom: 1.5em;
	text-align: center;
}

.fountain .title-page .source {
	margin-top: 1.5em;
}

.fountain .title-page .notes {
	text-align: right;
	margin: 3em 0;
}

.fountain .title-page h1 {
	margin-bottom: 1.5em;
	text-align: center;
}

.fountain .dialogue {
	margin-left: 3em;
	margin-right: 3em;
}

.fountain .dialogue p,
.fountain .dialogue h1,
.fountain .dialogue h2,
.fountain .dialogue h3,
.fountain .dialogue h4 {
	margin: 0;
}

.fountain .dialogue h1,
.fountain .dialogue h2,
.fountain .dialogue h3,
.fountain .dialogue h4 {
	text-align: center;
}
`;

function renderFountainScript(content) {
	const result = fountain.parse(content);
	return `
		<div class="fountain">
			<div class="title-page">
				${result.html.title_page}
			</div>
			<div class="page">
				${result.html.script}
			</div>
		</div>
	`;
}

function addContextAssets(context) {
	if ('fountain' in context.pluginAssets) return;

	context.pluginAssets['fountain'] = [
		{
			inline: true,
			text: fountainCss,
			mime: 'text/css',
		},
	];
}

function installRule(markdownIt, mdOptions, ruleOptions, context) {
	const defaultRender = markdownIt.renderer.rules.fence || function(tokens, idx, options, env, self) {
		return self.renderToken(tokens, idx, options);
	};

	markdownIt.renderer.rules.fence = function(tokens, idx, options, env, self) {
		const token = tokens[idx];
		if (token.info !== 'fountain') return defaultRender(tokens, idx, options, env, self);
		addContextAssets(context);
		return renderFountainScript(token.content);
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions, context);
	};
};
