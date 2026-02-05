(() => {
	let initDone_ = false;

	const getLibrary = () => {
		return window?.ABCJS;
	};

	const getOptions = (element) => {
		const options = element.getAttribute('data-abc-options');

		if (options) {
			try {
				return JSON.parse(options);
			} catch (error) {
				console.error('Could not parse ABC options:', options, error);
			}
		}

		return {};
	};

	const initialize = () => {
		if (initDone_) return true;

		const lib = getLibrary();
		if (!lib) return false;

		initDone_ = true;

		const elements = document.querySelectorAll('.joplin-editable > .joplin-abc-notation-rendered');

		for (const renderContainer of elements) {
			const block = renderContainer.parentElement;
			const sourceElement = block.querySelector('.joplin-source');
			if (!sourceElement) continue;

			const options = getOptions(sourceElement);
			lib.renderAbc(renderContainer, sourceElement.textContent, { ...options });
		}

		return true;
	};

	document.addEventListener('joplin-noteDidUpdate', () => {
		initDone_ = false;
		initialize();
	});

	const initIID_ = setInterval(() => {
		if (initialize()) clearInterval(initIID_);
	}, 100);

	document.addEventListener('DOMContentLoaded', () => {
		if (initialize()) clearInterval(initIID_);
	});
})();

