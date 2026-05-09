import { CSSProperties } from 'react';
import { Position } from '@xyflow/react';
import { SELECTION_COLOR, SELECTION_SHADOW } from '../theme';

// Common card styling shared by Text/File/Link nodes. The `overflow` field
// varies between cards (auto for scrollable text, hidden for media/link
// previews) so it's set per-call.
export const cardStyle = (selected: boolean, overflow: CSSProperties['overflow'] = 'hidden'): CSSProperties => ({
	width: '100%',
	height: '100%',
	border: selected ? `2px solid ${SELECTION_COLOR}` : '1px solid #d0d0d0',
	borderRadius: 6,
	background: '#ffffff',
	overflow,
	boxShadow: selected ? `0 4px 12px ${SELECTION_SHADOW}` : '0 1px 3px rgba(0,0,0,0.08)',
	boxSizing: 'border-box',
	display: 'flex',
	flexDirection: 'column',
});

export const headerStyle: CSSProperties = {
	fontSize: 11,
	color: '#888',
	padding: '4px 8px',
	borderBottom: '1px solid #eee',
	textTransform: 'uppercase',
	letterSpacing: 0.5,
	flexShrink: 0,
};

export const bodyStyle: CSSProperties = {
	flex: 1,
	padding: 8,
	overflow: 'auto',
	wordBreak: 'break-word',
	fontSize: 13,
	lineHeight: 1.4,
};

// The four sides shared by all node types — used both for rendering source
// handles around the perimeter and for routing edges to the right anchor.
export const handlePositions: { id: string; position: Position }[] = [
	{ id: 'top', position: Position.Top },
	{ id: 'right', position: Position.Right },
	{ id: 'bottom', position: Position.Bottom },
	{ id: 'left', position: Position.Left },
];
