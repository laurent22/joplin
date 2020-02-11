/* global mermaid */

function mermaidReady() {
	return typeof mermaid !== 'undefined';
}

function mermaidInit() {
	// Mermaid's wonderful API has two init methods: init() and initialize().
	// init() is deprectated but works, and initialize() is recommended but doesn't
	// work, so let's use init() for now.
	if (mermaidReady()) mermaid.init();
}

document.addEventListener('joplin-noteDidUpdate', () => {
	mermaidInit();
});

const initIID_ = setInterval(() => {
	const isReady = mermaidReady();
	if (isReady) {
		clearInterval(initIID_);
		mermaidInit();
	}
}, 100);
