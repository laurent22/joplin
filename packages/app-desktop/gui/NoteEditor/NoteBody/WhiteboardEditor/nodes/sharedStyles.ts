import { CSSProperties } from 'react';
import { Position } from '@xyflow/react';
import { WhiteboardThemeColors } from '../theme';

// Common card styling shared by Text/File/Link nodes. The `overflow` field
// varies between cards (auto for scrollable text, hidden for media/link
// previews) so it's set per-call.
export const cardStyle = (
	colors: WhiteboardThemeColors,
	selected: boolean,
	overflow: CSSProperties['overflow'] = 'hidden',
): CSSProperties => ({
	width: '100%',
	height: '100%',
	border: selected ? `2px solid ${colors.cardBorderSelected}` : `1px solid ${colors.cardBorder}`,
	borderRadius: 6,
	background: colors.cardBackground,
	overflow,
	boxShadow: selected ? colors.cardShadowSelected : colors.cardShadow,
	boxSizing: 'border-box',
	display: 'flex',
	flexDirection: 'column',
	color: colors.textColor,
});

export const headerStyle = (colors: WhiteboardThemeColors): CSSProperties => ({
	fontSize: 11,
	color: colors.headerColor,
	padding: '4px 8px',
	borderBottom: `1px solid ${colors.dividerColor}`,
	textTransform: 'uppercase',
	letterSpacing: 0.5,
	flexShrink: 0,
});

export const bodyStyle = (colors: WhiteboardThemeColors): CSSProperties => ({
	flex: 1,
	padding: 8,
	overflow: 'auto',
	wordBreak: 'break-word',
	fontSize: 13,
	lineHeight: 1.4,
	color: colors.textColor,
});

// The four sides shared by all node types — used both for rendering source
// handles around the perimeter and for routing edges to the right anchor.
export const handlePositions: { id: string; position: Position }[] = [
	{ id: 'top', position: Position.Top },
	{ id: 'right', position: Position.Right },
	{ id: 'bottom', position: Position.Bottom },
	{ id: 'left', position: Position.Left },
];
