function installRule(markdownIt, mdOptions, ruleOptions) {
	const defaultRenderer = markdownIt.renderer.rules.image;

	const longPressDelay = ruleOptions.longPressDelay ? ruleOptions.longPressDelay : 500;

	markdownIt.renderer.rules.image = function(tokens, idx, options, env, self) {
		const html = defaultRenderer(tokens, idx, options, env, self);

		return html.replace(/^<img(.*)data-from-md data-resource-id="([^"]*)"(.*)\/>$/, (s, prefix, id, suffix) => {
			const longPressHandler = `${ruleOptions.postMessageSyntax}('longclick:${id}')`;

			const touchStart = `timer=setTimeout(()=>{timer=null; ${longPressHandler};}, ${longPressDelay});`;
			const touchEnd = 'if (timer) clearTimeout(timer); timer=null';

			const handlers = `ontouchstart="${touchStart}" ontouchend="${touchEnd}"`;

			return `<img${prefix}data-from-md data-resource-id="${id}"${suffix} ${handlers}/>`;
		});
	};
}

module.exports = function(context, ruleOptions) {
	return function(md, mdOptions) {
		installRule(md, mdOptions, ruleOptions);
	};
};
