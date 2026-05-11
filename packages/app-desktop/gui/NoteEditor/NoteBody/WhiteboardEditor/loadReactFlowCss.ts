// React Flow ships CSS as a separate file. Joplin's desktop build doesn't run
// CSS imports through a loader, so we read the stylesheet at runtime and
// inject it into the document head once. We also expose a theme-aware
// override that overrides React Flow's CSS custom properties (--xy-*) so
// edges, minimap and dot grid follow the active Joplin theme.

import injectStyle, { replaceStyle } from './injectStyle';
import { SELECTION_COLOR, WhiteboardThemeColors } from './theme';

const STYLE_ELEMENT_ID = 'whiteboard-react-flow-css';
const THEME_STYLE_ELEMENT_ID = 'whiteboard-react-flow-theme';

let injected = false;

const ensureReactFlowCss = () => {
	if (injected) return;
	if (typeof document === 'undefined') return;

	try {
		// require() at runtime so this resolves through Node, which is fine in
		// Electron's renderer process.
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

// Apply the active Joplin theme to React Flow by setting its `--xy-*` CSS
// custom properties at the `.react-flow` root. Re-injected on every theme
// change so dark mode actually looks dark. Scoped via a class so we don't
// accidentally affect other React Flow instances if Joplin ever embeds one.
export const applyReactFlowTheme = (colors: WhiteboardThemeColors) => {
	const css = `
.react-flow {
	--xy-background-color-default: ${colors.surfaceBackground};
	--xy-background-pattern-dots-color-default: ${colors.dividerColor};
	--xy-edge-stroke-default: ${colors.dividerColor};
	--xy-edge-stroke-selected-default: ${SELECTION_COLOR};
	--xy-connectionline-stroke-default: ${colors.handleColor};
	--xy-attribution-background-color-default: ${colors.cardBackground};
	--xy-minimap-background-color-default: ${colors.cardBackground};
	--xy-minimap-mask-background-color-default: ${colors.surfaceBackground};
	--xy-minimap-node-background-color-default: ${colors.handleColor};
	--xy-node-color-default: ${colors.textColor};
	--xy-node-background-color-default: ${colors.cardBackground};
	--xy-controls-button-background-color-default: ${colors.cardBackground};
	--xy-controls-button-color-default: ${colors.textColor};
	--xy-controls-button-border-color-default: ${colors.dividerColor};
}
`;
	replaceStyle(THEME_STYLE_ELEMENT_ID, css);
};

export default ensureReactFlowCss;
