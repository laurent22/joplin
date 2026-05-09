// React Flow ships CSS as a separate file. Joplin's desktop build doesn't run
// CSS imports through a loader, so we read the stylesheet at runtime and
// inject it into the document head once.

const STYLE_ELEMENT_ID = 'whiteboard-react-flow-css';

let injected = false;

const ensureReactFlowCss = () => {
	if (injected) return;
	if (typeof document === 'undefined') return;
	if (document.getElementById(STYLE_ELEMENT_ID)) {
		injected = true;
		return;
	}

	try {
		// require() at runtime so this resolves through Node, which is fine in
		// Electron's renderer process. The path resolves relative to this
		// module via the bundler/Node module resolution.
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const fs = require('fs');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const path = require('path');
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const pkgPath = require.resolve('@xyflow/react/package.json');
		const cssPath = path.join(path.dirname(pkgPath), 'dist', 'style.css');
		const css = fs.readFileSync(cssPath, 'utf8');

		const el = document.createElement('style');
		el.id = STYLE_ELEMENT_ID;
		el.textContent = css;
		document.head.appendChild(el);
		injected = true;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to load React Flow CSS', error);
	}
};

export default ensureReactFlowCss;
