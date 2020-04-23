// LOGIC: Extract the & UUID of the youtube video and the host name from the href link
// and render it in iframe if both of the are valid.
const url = require('url');
const videoCss = () => {
	return [
		{
			inline: true,
			mime: 'text/css',
			text: `
				.jop-video-container {
					position: relative;
					width: 100%;
					height: 0;
					padding-bottom: 56.25%;
				}

				.jop-video-iframe {
					position: absolute;
					top: 0;
					left: 0;
					width: 100%;
					height: 100%;
				}`,
		},
	];
};

function addContextAssets(context) {
	if ('video' in context.pluginAssets) return;

	context.pluginAssets['video'] = videoCss();
}

function installRule(markdownIt, mdOptions, ruleOptions, context) {
	const defaultRender = markdownIt.renderer.rules.link_open;

	const videoIDRegex = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
	const validHostName = ['youtu.be', 'www.youtube.com','www.youtube-nocookie.com'];
	// videoIDRegex extracts the unique 11 digit code which is unique to every youtube video

	markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {

		const renderLink = defaultRender(tokens, idx, options, env, self);
		const token = tokens[idx];

		const link = token.attrGet('href');
		const videoID = link.match(videoIDRegex);
		const hostname = url.parse(link).hostname;
		const isValidHostName = validHostName.includes(hostname);

		if (!videoID || !isValidHostName) {
			return renderLink;
		}

		if (videoID[2] && isValidHostName) {
			if (!('video' in context.pluginAssets)) {
				addContextAssets(context);
			}
			return `<div class="jop-video-container"><iframe class="jop-video-iframe" src="https://www.youtube.com/embed/${videoID[2]}" frameborder="0" allowfullscreen></iframe></div>${renderLink}`;
		}
	};
}

module.exports = {
	install: function(context, ruleOptions) {
		return function(md, mdOptions) {
			installRule(md, mdOptions, ruleOptions, context);
		};
	},
	style: videoCss,
};
