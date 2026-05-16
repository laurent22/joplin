import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { Handle, NodeProps, NodeResizer } from '@xyflow/react';
import { LinkCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { useWhiteboardContext } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';
import { whiteboardColors } from '../theme';
import { bodyStyle, cardStyle, handlePositions, headerStyle } from './sharedStyles';

const LinkNode = ({ data, selected }: NodeProps<{ id: string; type: 'wbLink'; data: WhiteboardNodeData; position: { x: number; y: number } }>) => {
	const ctx = useWhiteboardContext();
	const node = data.canvasNode as LinkCanvasNode;
	const colors = useMemo(() => whiteboardColors(ctx.themeId), [ctx.themeId]);

	const onDoubleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		ctx.onOpenRef(node.url);
	}, [ctx, node.url]);

	return (
		<>
			<NodeResizer minWidth={80} minHeight={40} isVisible={!!selected} />
			{handlePositions.map(({ id: hid, position }) => (
				<Handle key={hid} type="source" position={position} id={hid} style={{ background: colors.handleColor }} />
			))}
			<div style={cardStyle(colors, !!selected)} onDoubleClick={onDoubleClick}>
				<div style={headerStyle(colors)}>Link</div>
				<div style={{ ...bodyStyle(colors), wordBreak: 'break-all' }}>{node.url}</div>
			</div>
		</>
	);
};

export default LinkNode;
