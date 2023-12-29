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
	return typeof mermaid !== 'undefined' && mermaid !== null && typeof mermaid === 'object' && !!mermaid.initialize;
}

const isDarkMode = (mermaidTargetNodes) => {
	if (!mermaidTargetNodes.length) return false;

	return mermaidTargetNodes[0].classList.contains('theme-dark');
};

function rerenderMermaid() {
	if (mermaidReady()) {
		const mermaidTargetNodes = document.getElementsByClassName('mermaid');

		try {
			const darkMode = isDarkMode(mermaidTargetNodes);
			const config = {
				// We call mermaid.run ourselves whenever the note updates. Don't auto-start
				startOnLoad: false,

				darkMode,
				theme: darkMode ? 'dark' : 'base',
			};
			mermaid.initialize(config);
			mermaid.run({
				nodes: mermaidTargetNodes,
			});
		} catch (error) {
			console.error('Mermaid error', error);
		}

		// Resetting elements size - see mermaid.ts
		for (const element of mermaidTargetNodes) {
			element.style.width = '100%';
		}
	}
}

document.addEventListener('joplin-noteDidUpdate', () => {
	rerenderMermaid();
});

const initIID_ = setInterval(() => {
	const isReady = mermaidReady();
	if (isReady) {
		clearInterval(initIID_);

		rerenderMermaid();
	}
}, 100);
