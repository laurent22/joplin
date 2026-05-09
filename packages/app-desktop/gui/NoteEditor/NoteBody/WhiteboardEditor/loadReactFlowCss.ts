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
		// React Flow base styles, then our overrides. Selected edges should
		// stand out as clearly as selected cards (which use #4a90e2).
		el.textContent = `${css}
.react-flow__edge.selected .react-flow__edge-path,
.react-flow__edge:focus .react-flow__edge-path,
.react-flow__edge:focus-visible .react-flow__edge-path {
	stroke: #4a90e2 !important;
	stroke-width: 2 !important;
}
.react-flow__edge.selected .react-flow__edge-textbg {
	fill: #4a90e2;
}
.react-flow__edge.selected .react-flow__edge-text {
	fill: #ffffff;
}
/* Hide connection handles by default; reveal on hover, when the node is
   selected, and on the source/target handle of an active connection drag
   (React Flow sets .connectingfrom on the source handle, .connectingto on
   the hovered target handle). */
.react-flow__node .react-flow__handle {
	opacity: 0;
	transition: opacity 120ms ease;
}
.react-flow__node:hover .react-flow__handle,
.react-flow__node.selected .react-flow__handle,
.react-flow__handle.connectingfrom,
.react-flow__handle.connectingto {
	opacity: 1;
}
`;
		document.head.appendChild(el);
		injected = true;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to load React Flow CSS', error);
	}
};

export default ensureReactFlowCss;
