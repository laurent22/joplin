import * as React from 'react';
import { CSSProperties, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, NodeProps, NodeResizer } from '@xyflow/react';
import { MarkupLanguage } from '@joplin/renderer';
import { focus } from '@joplin/lib/utils/focusHandler';
import { _ } from '@joplin/lib/locale';
import { TextCanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { useWhiteboardContext, WhiteboardContextValue } from '../WhiteboardContext';
import { WhiteboardNodeData } from '../canvasFlow';
import useCheckboxToggle from '../useCheckboxToggle';
import { replaceStyle } from '../injectStyle';
import { SELECTION_COLOR, WhiteboardThemeColors, whiteboardColors } from '../theme';
import { cardStyle as baseCardStyle, handlePositions } from './sharedStyles';

// Text cards put content directly inside the card div (no inner body wrapper)
// so we extend the shared card style with text-content tokens.
const textCardStyle = (colors: WhiteboardThemeColors, selected: boolean): CSSProperties => ({
	...baseCardStyle(colors, selected, 'auto'),
	padding: 8,
	fontSize: 13,
	lineHeight: 1.4,
});

const editTextareaStyle = (textColor: string): CSSProperties => ({
	width: '100%',
	height: '100%',
	border: 'none',
	outline: 'none',
	resize: 'none',
	fontFamily: 'inherit',
	fontSize: 13,
	lineHeight: 1.4,
	color: textColor,
	background: 'transparent',
});

const renderedHtmlStyle: CSSProperties = {
	flex: 1,
	overflow: 'auto',
	wordBreak: 'break-word',
	fontSize: 13,
	lineHeight: 1.4,
};

// Build the theme-dependent stylesheet for in-card markdown rendering. The
// renderer's HTML uses note-viewer CSS variables that don't exist outside the
// iframe, so we provide our own scoped overrides — and, crucially, keep them
// in sync with the active theme so dark mode looks dark.
const buildCardMdCss = (colors: WhiteboardThemeColors): string => `
.wb-card-md h1 { font-size: 16px; margin: 4px 0; }
.wb-card-md h2 { font-size: 15px; margin: 4px 0; }
.wb-card-md h3 { font-size: 14px; margin: 3px 0; }
.wb-card-md h4, .wb-card-md h5, .wb-card-md h6 { font-size: 13px; margin: 3px 0; }
.wb-card-md p { margin: 4px 0; }
.wb-card-md ul, .wb-card-md ol { margin: 4px 0; padding-left: 20px; }
.wb-card-md li { margin: 2px 0; }
.wb-card-md li.md-checkbox, .wb-card-md li.joplin-checkbox { list-style: none; margin-left: -20px; }
.wb-card-md li.md-checkbox input[type=checkbox] { margin-right: 6px; vertical-align: middle; }
.wb-card-md .checkbox-wrapper { display: inline; }
.wb-card-md pre { margin: 4px 0; padding: 6px; font-size: 12px; background: ${colors.codeBackground}; border: 1px solid ${colors.codeBorder}; border-radius: 4px; overflow: auto; color: ${colors.codeColor}; }
.wb-card-md code { font-size: 12px; background: ${colors.codeBackground}; color: ${colors.codeColor}; padding: 1px 4px; border-radius: 3px; }
.wb-card-md pre code { background: transparent; padding: 0; border: none; }
.wb-card-md blockquote { margin: 4px 0; padding-left: 8px; border-left: 3px solid ${colors.blockquoteBorder}; color: ${colors.blockquoteColor}; }
.wb-card-md img { max-width: 100%; height: auto; }
.wb-card-md table { font-size: 12px; border-collapse: collapse; }
.wb-card-md th, .wb-card-md td { padding: 2px 6px; border: 1px solid ${colors.tableBorder}; }
.wb-card-md hr { margin: 6px 0; border: none; border-top: 1px solid ${colors.dividerColor}; }
.wb-card-md a { color: ${colors.linkColor || SELECTION_COLOR}; }
`;

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

	const colors = useMemo(() => whiteboardColors(ctx.themeId), [ctx.themeId]);

	// Re-inject the in-card markdown stylesheet whenever the theme changes
	// so dark mode swaps in dark code blocks, blockquote tints, etc.
	useEffect(() => {
		replaceStyle('wb-card-md-style', buildCardMdCss(colors));
	}, [colors]);

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

	// Keyboard equivalent of double-click: when the card is focused (React
	// Flow makes nodes focusable for tab navigation), Enter or F2 opens the
	// editor. Skip when already editing — the textarea has its own handler.
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
				<Handle key={hid} type="source" position={position} id={hid} style={{ background: colors.handleColor }} />
			))}
			<div style={textCardStyle(colors, !!selected)} onDoubleClick={onDoubleClick} onKeyDown={onCardKeyDown}>
				{editing ? (
					<textarea
						ref={textareaRef}
						style={editTextareaStyle(colors.textColor)}
						value={draft}
						onChange={e => setDraft(e.target.value)}
						onBlur={commit}
						onKeyDown={onKeyDown}
						className="nodrag"
					/>
				) : (
					node.text
						? <div ref={checkboxRef} className="wb-card-md" style={renderedHtmlStyle} dangerouslySetInnerHTML={{ __html: html }} />
						: <div style={{ color: colors.mutedColor }}>{_('(empty — double-click to edit)')}</div>
				)}
			</div>
			{selected && !editing && node.text ? (
				<button
					type="button"
					onClick={onPromote}
					className="nodrag"
					title={_('Convert this card into a Joplin note')}
					style={{
						position: 'absolute',
						top: -10,
						right: -10,
						padding: '2px 8px',
						fontSize: 11,
						border: `1px solid ${SELECTION_COLOR}`,
						borderRadius: 10,
						background: colors.cardBackground,
						color: SELECTION_COLOR,
						cursor: 'pointer',
						zIndex: 5,
					}}
				>
					{_('Promote to note')}
				</button>
			) : null}
		</>
	);
};

export default TextNode;
