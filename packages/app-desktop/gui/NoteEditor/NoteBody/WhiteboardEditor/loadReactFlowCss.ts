// React Flow ships CSS as a separate file. Joplin's desktop build doesn't run
// CSS imports through a loader, so we read the stylesheet at runtime and
// inject it into the document head once.

import injectStyle from './injectStyle';
import { SELECTION_COLOR } from './theme';

const STYLE_ELEMENT_ID = 'whiteboard-react-flow-css';

let injected = false;

const ensureReactFlowCss = () => {
	if (injected) return;
	if (typeof document === 'undefined') return;

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
		const baseCss = fs.readFileSync(cssPath, 'utf8');

		// React Flow base styles, then our overrides. Selected edges should
		// stand out as clearly as selected cards, and connection handles are
		// hidden until hover/selection so the canvas isn't littered with dots.
		const overrides = `
.react-flow__edge.selected .react-flow__edge-path,
.react-flow__edge:focus .react-flow__edge-path,
.react-flow__edge:focus-visible .react-flow__edge-path {
	stroke: ${SELECTION_COLOR} !important;
	stroke-width: 2 !important;
}
.react-flow__edge.selected .react-flow__edge-textbg {
	fill: ${SELECTION_COLOR};
}
.react-flow__edge.selected .react-flow__edge-text {
	fill: #ffffff;
}
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
		injectStyle(STYLE_ELEMENT_ID, `${baseCss}${overrides}`);
		injected = true;
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error('Failed to load React Flow CSS', error);
	}
};

export default ensureReactFlowCss;
