/* global mermaid */

function mermaidReady() {
	// The Mermaid initialization code renders the Mermaid code within any element with class "mermaid" or
	// ID "mermaid". However in some cases some elements might have this ID but not be Mermaid code.
	// For example, Markdown code like this:
	//
	//     # Mermaid
	//
	// Will generate this HTML:
	//
	//     <h1 id="mermaid">Mermaid</h1>
	//
	// And that's going to make the lib set the `mermaid` object to the H1 element.
	// So below, we double-check that what we have really is an instance of the library.
	return typeof mermaid !== 'undefined' && mermaid !== null && typeof mermaid === 'object' && !!mermaid.init;
}

function mermaidInit() {
	// Mermaid's wonderful API has two init methods: init() and initialize().
	// init() is deprectated but works, and initialize() is recommended but doesn't
	// work, so let's use init() for now.
	if (mermaidReady()) {
		try {
			mermaid.init();
		} catch (error) {
			console.error('Mermaid error', error);
		}

		// Resetting elements size - see mermaid.ts
		const elements = document.getElementsByClassName('mermaid');
		for (const element of elements) {
			element.style.width = '100%';
		}
	}
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
