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

			for (const svg of renderContainer.querySelectorAll('svg')) {
				const w = Number.parseFloat(svg.getAttribute('width') ?? '');
				const h = Number.parseFloat(svg.getAttribute('height') ?? '');
				if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0 && !svg.getAttribute('viewBox')) {
					svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
				}
			}
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

