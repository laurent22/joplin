import * as React from 'react';
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { NodeProps, NodeResizer } from '@xyflow/react';
import { focus } from '@joplin/lib/utils/focusHandler';
import { _ } from '@joplin/lib/locale';
import { GroupCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { useWhiteboardContext } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';

const GroupNode = ({ data, selected, id }: NodeProps<{ id: string; type: 'wbGroup'; data: WhiteboardNodeData; position: { x: number; y: number } }>) => {
	const ctx = useWhiteboardContext();
	const node = data.canvasNode as GroupCanvasNode;
	const label = node.label ?? '';

	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(label);
	const inputRef = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		if (!editing) setDraft(label);
	}, [editing, label]);

	useEffect(() => {
		if (editing && inputRef.current) {
			focus('WhiteboardGroupNode::beginEdit', inputRef.current);
			inputRef.current.select();
		}
	}, [editing]);

	const beginEdit = useCallback(() => {
		setDraft(label);
		setEditing(true);
	}, [label]);

	const commit = useCallback(() => {
		if (!editing) return;
		if (draft !== label) ctx.onUpdateNode(id, { label: draft });
		setEditing(false);
	}, [editing, draft, label, ctx, id]);

	const cancel = useCallback(() => setEditing(false), []);

	const onKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
		} else if (e.key === 'Enter') {
			e.preventDefault();
			commit();
		}
	}, [commit, cancel]);

	const onDoubleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		beginEdit();
	}, [beginEdit]);

	return (
		<>
			<NodeResizer minWidth={80} minHeight={60} isVisible={selected && !editing} />
			<div className={`whiteboard-group ${selected ? '-selected' : ''}`}>
				<div className="background" />
				<div className="edge -top whiteboard-group-handle" />
				<div className="edge -right whiteboard-group-handle" />
				<div className="edge -bottom whiteboard-group-handle" />
				<div className="edge -left whiteboard-group-handle" />
				<div className="anchor whiteboard-group-handle" title={_('Drag to move group')} aria-label={_('Drag to move group')}>
					<i className="fas fa-arrows-alt" aria-hidden="true" />
				</div>
				{editing ? (
					<input
						ref={inputRef}
						className="label nodrag"
						type="text"
						value={draft}
						onChange={e => setDraft(e.target.value)}
						onBlur={commit}
						onKeyDown={onKeyDown}
					/>
				) : (
					<div className="label whiteboard-group-handle" title={label || _('Group')} onDoubleClick={onDoubleClick}>
						{label || <span className="placeholder">{_('Group')}</span>}
					</div>
				)}
			</div>
		</>
	);
};

export default GroupNode;
