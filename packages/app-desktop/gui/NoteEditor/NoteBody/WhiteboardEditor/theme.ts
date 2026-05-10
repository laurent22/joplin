import { themeStyle } from '@joplin/lib/theme';

// The blue accent for "selected" state is shared across selected cards and
// edges. Kept as our own constant rather than pulled from the theme so the
// selection cue stays consistent across light and dark modes.
export const SELECTION_COLOR = '#4a90e2';
export const SELECTION_SHADOW = 'rgba(74,144,226,0.25)';

export interface WhiteboardThemeColors {
	// Card / panel surfaces.
	cardBackground: string;
	cardBorder: string;
	cardBorderSelected: string;
	cardShadow: string;
	cardShadowSelected: string;

	// Card text.
	textColor: string;
	mutedColor: string;
	headerColor: string;

	// Markdown content inside cards.
	codeBackground: string;
	codeColor: string;
	codeBorder: string;
	blockquoteBorder: string;
	blockquoteColor: string;
	tableBorder: string;
	dividerColor: string;
	linkColor: string;

	// Surface itself (the canvas background) and React Flow handles.
	surfaceBackground: string;
	handleColor: string;
}

// Translate the active Joplin theme into the colour set our whiteboard uses.
export const whiteboardColors = (themeId: number): WhiteboardThemeColors => {
	const theme = themeStyle(themeId);
	return {
		cardBackground: theme.backgroundColor,
		cardBorder: theme.dividerColor,
		cardBorderSelected: SELECTION_COLOR,
		cardShadow: '0 1px 3px rgba(0,0,0,0.08)',
		cardShadowSelected: `0 4px 12px ${SELECTION_SHADOW}`,

		textColor: theme.color,
		mutedColor: theme.colorFaded || theme.color3 || theme.color,
		headerColor: theme.colorFaded || theme.color3 || theme.color,

		codeBackground: theme.codeBackgroundColor,
		codeColor: theme.codeColor,
		codeBorder: theme.codeBorderColor,
		blockquoteBorder: theme.dividerColor,
		blockquoteColor: theme.colorFaded || theme.color,
		tableBorder: theme.dividerColor,
		dividerColor: theme.dividerColor,
		linkColor: theme.urlColor,

		surfaceBackground: theme.backgroundColor3 || theme.backgroundColor,
		handleColor: theme.colorFaded || '#888',
	};
};
