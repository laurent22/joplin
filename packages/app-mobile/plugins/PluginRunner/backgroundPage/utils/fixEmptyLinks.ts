
// Hash links (e.g. <a href="#">...</a>) send loadStart and loadEnd events to React Native,
// **even though the page didn't reload**. This can break logic that expects loadEnd to
// only be fired when loading finishes.
//
// We disable a subset of hash links to work around this:
const fixEmptyLinks = () => {
	document.addEventListener('click', (event) => {
		const target = event.target as HTMLElement;
		if (!target.getAttribute || target.tagName !== 'A') {
			return;
		}

		const href = target.getAttribute('href') ?? '';
		if (href === '#' && !event.defaultPrevented) {
			// eslint-disable-next-line no-console
			console.info('Cancelled empty link navigation -- hash links don\'t work well with React Native Webview.');
			event.preventDefault();
		}
	});
};

export default fixEmptyLinks;
