// LOGIC: Extract the & UUID of the youtube video and render iframe

module.exports = function installRule(markdownIt) {

	const defaultRender = markdownIt.renderer.rules.link_open;
	const videoIDRegex = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
	// videoIDRegex extracts the unique 11 digit code which is unique to every youtube video

	markdownIt.renderer.rules.link_open = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const link = token.attrGet('href');
		const videoID = link.match(videoIDRegex);

		if (!videoID) return defaultRender(tokens, idx, options, env, self);

		if (videoID[2]) {
			return `<div><iframe  width="560" height="315" src="https://www.youtube.com/embed/${videoID[2]}" frameborder="0" allowfullscreen></iframe></div>`;
		}

		return defaultRender(tokens, idx, options, env, self);
	};
};
