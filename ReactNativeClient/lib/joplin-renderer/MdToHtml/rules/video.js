// LOGIC: Extract the & UUID of the youtube video and render it in iframe
const videoCss = () => {
	return [
		{
			inline: true,
			mime: 'text/css',
			text: `
                .video-container {
                    position: relative;
                    width: 100%;
                    height: 0;
                    padding-bottom: 56.25%;
                }
                .video-iframe {
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
	// videoIDRegex extracts the unique 11 digit code which is unique to every youtube video

	markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const link = token.attrGet('href');
		const videoID = link.match(videoIDRegex);

		if (!videoID) return defaultRender(tokens, idx, options, env, self);

		if (videoID[2]) {
			if (!('video' in context.pluginAssets)) {
				addContextAssets(context);
			}
			return `<div class="video-container"><iframe  class="video-iframe"  width="560" height="315" src="https://www.youtube.com/embed/${videoID[2]}"  frameborder="0" allowfullscreen></iframe></div>`;

		}
		return defaultRender(tokens, idx, options, env, self);
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
