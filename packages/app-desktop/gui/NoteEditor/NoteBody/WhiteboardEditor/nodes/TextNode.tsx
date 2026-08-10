import * as React from 'react';
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, NodeProps, NodeResizer } from '@xyflow/react';
import { MarkupLanguage } from '@joplin/renderer';
import { focus } from '@joplin/lib/utils/focusHandler';
import { _ } from '@joplin/lib/locale';
import { TextCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { resolveCanvasColor } from '@joplin/lib/services/whiteboard/presetColors';
import { useWhiteboardContext, WhiteboardContextValue } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';
import useCheckboxToggle from '../useCheckboxToggle';
import handlePositions from './handlePositions';
import useCardWheel from './useCardWheel';

const useRenderedMarkdown = (md: string, ctx: WhiteboardContextValue) => {
	const [html, setHtml] = useState<string>('');

	useEffect(() => {
		let cancelled = false;
		if (!md) {
			setHtml('');
			return undefined;
		}
		void (async () => {
			try {
				const result = await ctx.markupToHtml(MarkupLanguage.Markdown, md, {
					resourceInfos: ctx.resourceInfos,
				});
				if (!cancelled) setHtml(result?.html ?? '');
			} catch {
				if (!cancelled) setHtml('');
			}
		})();
		return () => { cancelled = true; };
	}, [md, ctx]);

	return html;
};

const TextNode = ({ data, selected, id }: NodeProps<{ id: string; type: 'wbText'; data: WhiteboardNodeData; position: { x: number; y: number } }>) => {
	const ctx = useWhiteboardContext();
	const node = data.canvasNode as TextCanvasNode;
	const onWheel = useCardWheel();

	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(node.text);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	useEffect(() => {
		if (!editing) setDraft(node.text);
	}, [editing, node.text]);

	useEffect(() => {
		if (editing && textareaRef.current) {
			focus('WhiteboardTextNode::beginEdit', textareaRef.current);
			textareaRef.current.select();
		}
	}, [editing]);

	const html = useRenderedMarkdown(node.text, ctx);

	const beginEdit = useCallback(() => {
		setDraft(node.text);
		setEditing(true);
	}, [node.text]);

	const commit = useCallback(() => {
		if (!editing) return;
		if (draft !== node.text) ctx.onUpdateNode(id, { text: draft });
		setEditing(false);
	}, [editing, draft, node.text, ctx, id]);

	const cancel = useCallback(() => setEditing(false), []);

	const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
		} else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			commit();
		}
	}, [commit, cancel]);

	const onDoubleClick = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		beginEdit();
	}, [beginEdit]);

	const onCardKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
		if (editing) return;
		if (e.key === 'Enter' || e.key === 'F2') {
			e.preventDefault();
			e.stopPropagation();
			beginEdit();
		}
	}, [editing, beginEdit]);

	const onPromote = useCallback((e: React.MouseEvent) => {
		e.stopPropagation();
		ctx.onPromoteTextNode(id);
	}, [ctx, id]);

	const onCheckboxToggleBody = useCallback((newBody: string) => {
		ctx.onUpdateNode(id, { text: newBody });
	}, [ctx, id]);
	const checkboxRef = useCheckboxToggle({
		body: node.text,
		onChange: onCheckboxToggleBody,
	});

	return (
		<>
			<NodeResizer minWidth={80} minHeight={40} isVisible={selected && !editing} />
			{handlePositions.map(({ id: hid, position }) => (
				<Handle key={hid} type="source" position={position} id={hid} />
			))}
			<div
				className={`whiteboard-node -text ${selected ? '-selected' : ''}`}
				onDoubleClick={onDoubleClick}
				onKeyDown={onCardKeyDown}
				onWheelCapture={onWheel}
				style={{
					borderColor: resolveCanvasColor(node.color, ctx.themeAppearance, 'stroke') ?? (selected ? '#4a90e2' : undefined),
					backgroundColor: resolveCanvasColor(node.color, ctx.themeAppearance, 'fill'),
				}}
			>
				{editing ? (
					<textarea
						ref={textareaRef}
						className="editor nodrag"
						value={draft}
						onChange={e => setDraft(e.target.value)}
						onBlur={commit}
						onKeyDown={onKeyDown}
					/>
				) : (
					node.text
						? <div ref={checkboxRef} className="wb-card-md" dangerouslySetInnerHTML={{ __html: html }} />
						: <div className="empty">{_('(empty — double-click to edit)')}</div>
				)}
			</div>
			{selected && !editing && node.text ? (
				<button
					type="button"
					onClick={onPromote}
					className="whiteboard-node-promote nodrag"
					title={_('Convert this card into a Joplin note')}
				>
					{_('Promote to note')}
				</button>
			) : null}
		</>
	);
};

export default TextNode;
