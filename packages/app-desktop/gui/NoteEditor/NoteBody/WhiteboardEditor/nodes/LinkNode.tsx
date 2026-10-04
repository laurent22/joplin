import * as React from 'react';
import { useCallback } from 'react';
import { Handle, NodeProps, NodeResizer } from '@xyflow/react';
import { _ } from '@joplin/lib/locale';
import { LinkCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { resolveCanvasColor } from '@joplin/lib/services/whiteboard/presetColors';
import { useWhiteboardContext } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';
import handlePositions from './handlePositions';
import useCardWheel from './useCardWheel';

const LinkNode = ({ data, selected }: NodeProps<{ id: string; type: 'wbLink'; data: WhiteboardNodeData; position: { x: number; y: number } }>) => {
	const ctx = useWhiteboardContext();
	const node = data.canvasNode as LinkCanvasNode;
	const onWheel = useCardWheel();

	const onDoubleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		ctx.onOpenRef(node.url);
	}, [ctx, node.url]);

	return (
		<>
			<NodeResizer minWidth={80} minHeight={40} isVisible={!!selected} />
			{handlePositions.map(({ id: hid, position }) => (
				<Handle key={hid} type="source" position={position} id={hid} />
			))}
			<div
				className={`whiteboard-node ${selected ? '-selected' : ''}`}
				onDoubleClick={onDoubleClick}
				onWheelCapture={onWheel}
				style={{
					borderColor: resolveCanvasColor(node.color, ctx.themeAppearance, 'stroke') ?? (selected ? '#4a90e2' : undefined),
					backgroundColor: resolveCanvasColor(node.color, ctx.themeAppearance, 'fill'),
				}}
			>
				<div className="header">{_('Link')}</div>
				<div className="body -url">{node.url}</div>
			</div>
		</>
	);
};

export default LinkNode;
