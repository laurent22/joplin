import * as React from 'react';
import { CSSProperties, useCallback } from 'react';
import { Handle, NodeProps, NodeResizer, Position } from '@xyflow/react';
import { LinkCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { useWhiteboardContext } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';

const cardStyle = (selected: boolean): CSSProperties => ({
	width: '100%',
	height: '100%',
	border: selected ? '2px solid #4a90e2' : '1px solid #d0d0d0',
	borderRadius: 6,
	background: '#ffffff',
	overflow: 'hidden',
	boxSizing: 'border-box',
	display: 'flex',
	flexDirection: 'column',
});

const headerStyle: CSSProperties = {
	fontSize: 11,
	color: '#888',
	padding: '4px 8px',
	borderBottom: '1px solid #eee',
	textTransform: 'uppercase',
	letterSpacing: 0.5,
};

const bodyStyle: CSSProperties = {
	flex: 1,
	padding: 8,
	wordBreak: 'break-all',
	fontSize: 13,
};

const handlePositions = [
	{ id: 'top', position: Position.Top },
	{ id: 'right', position: Position.Right },
	{ id: 'bottom', position: Position.Bottom },
	{ id: 'left', position: Position.Left },
];

const LinkNode = ({ data, selected }: NodeProps<{ id: string; type: 'wbLink'; data: WhiteboardNodeData; position: { x: number; y: number } }>) => {
	const ctx = useWhiteboardContext();
	const node = data.canvasNode as LinkCanvasNode;

	const onDoubleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		ctx.onOpenRef(node.url);
	}, [ctx, node.url]);

	return (
		<>
			<NodeResizer minWidth={80} minHeight={40} isVisible={!!selected} />
			{handlePositions.map(({ id: hid, position }) => (
				<Handle key={hid} type="source" position={position} id={hid} style={{ background: '#888' }} />
			))}
			<div style={cardStyle(!!selected)} onDoubleClick={onDoubleClick}>
				<div style={headerStyle}>Link</div>
				<div style={bodyStyle}>{node.url}</div>
			</div>
		</>
	);
};

export default LinkNode;
