function installRule(markdownIt, mdOptions, ruleOptions) {
	const defaultRenderer = markdownIt.renderer.rules.image;

	const longPressDelay = ruleOptions.longPressDelay ? ruleOptions.longPressDelay : 500;

	markdownIt.renderer.rules.image = function(tokens, idx, options, env, self) {
		if (!ruleOptions.enableLongPress) {
			return;
		}

		const html = defaultRenderer(tokens, idx, options, env, self);

		return html.replace(/^<img(.*)data-from-md data-resource-id="([^"]*)"(.*)\/>$/, (s, prefix, id, suffix) => {
			const longPressHandler = `${ruleOptions.postMessageSyntax}('longclick:${id}')`;

			const touchStart = `t=setTimeout(()=>{t=null; ${longPressHandler};}, ${longPressDelay});`;
			const touchEnd = 'if (!!t) clearTimeout(t); t=null';

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
