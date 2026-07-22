import * as React from 'react';
import { DragEvent as ReactDragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Background,
	Connection,
	ConnectionMode,
	Controls,
	Edge,
	MarkerType,
	MiniMap,
	Node,
	NodeTypes,
	OnConnect,
	OnEdgesChange,
	OnNodesChange,
	OnReconnect,
	ReactFlow,
	ReactFlowProvider,
	applyEdgeChanges,
	applyNodeChanges,
	reconnectEdge,
	useReactFlow,
} from '@xyflow/react';
import generateId from '@joplin/lib/services/whiteboard/generateId';
import findEmptySpot from '@joplin/lib/services/whiteboard/findEmptySpot';
import { _, _n } from '@joplin/lib/locale';
import { Canvas, CanvasColor, CanvasEdge, CanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';
import { presetColors, resolveCanvasColor } from '@joplin/lib/services/whiteboard/presetColors';
import { useWhiteboardContext } from './WhiteboardContext';
import shim from '@joplin/lib/shim';
import Logger from '@joplin/utils/Logger';
import { webUtils } from 'electron';
import { canvasNodeToFlowNode, canvasToFlow, flowToCanvas, WhiteboardFlowEdge, WhiteboardFlowNode } from './canvasFlow';

const logger = Logger.create('WhiteboardSurface');
import TextNode from './nodes/TextNode';
import FileNode from './nodes/FileNode';
import LinkNode from './nodes/LinkNode';
import GroupNode from './nodes/GroupNode';
import { ActionButton, ActionDivider, ActionInput, ActionPanel, ActionSwatch } from './ActionPanel';

const makeArrowMarker = () => ({ type: MarkerType.ArrowClosed, width: 27, height: 27, markerUnits: 'userSpaceOnUse' });

type ArrowMode = 'none' | 'forward' | 'backward' | 'both' | 'mixed';
const arrowModeFor = (e: WhiteboardFlowEdge): Exclude<ArrowMode, 'mixed'> => {
	const start = !!e.markerStart;
	const end = !!e.markerEnd;
	if (start && end) return 'both';
	if (end) return 'forward';
	if (start) return 'backward';
	return 'none';
};

interface Props {
	canvas: Canvas;
	onChange: (canvas: Canvas)=> void;
}

const nodeTypes: NodeTypes = {
	wbText: TextNode as unknown as NodeTypes[string],
	wbFile: FileNode as unknown as NodeTypes[string],
	wbLink: LinkNode as unknown as NodeTypes[string],
	wbGroup: GroupNode as unknown as NodeTypes[string],
};

const InnerSurface = ({ canvas, onChange }: Props) => {
	const ctx = useWhiteboardContext();
	const initial = useMemo(() => canvasToFlow(canvas), [canvas]);
	const [flowNodes, setFlowNodes] = useState<WhiteboardFlowNode[]>(initial.nodes);
	const [flowEdges, setFlowEdges] = useState<WhiteboardFlowEdge[]>(initial.edges);
	const [labelFocusToken, setLabelFocusToken] = useState(0);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const rf = useReactFlow();

	const lastEmittedRef = useRef<string>(JSON.stringify(flowToCanvas(initial.nodes, initial.edges)));
	useEffect(() => {
		const incoming = JSON.stringify(canvas);
		if (incoming === lastEmittedRef.current) return;
		const next = canvasToFlow(canvas);
		setFlowNodes(next.nodes);
		setFlowEdges(next.edges);
		lastEmittedRef.current = JSON.stringify(flowToCanvas(next.nodes, next.edges));
	}, [canvas]);

	useEffect(() => {
		const out = flowToCanvas(flowNodes, flowEdges);
		const serialized = JSON.stringify(out);
		if (serialized === lastEmittedRef.current) return;
		lastEmittedRef.current = serialized;
		onChange(out);
	}, [flowNodes, flowEdges, onChange]);

	const onNodesChange: OnNodesChange = useCallback((changes) => {
		setFlowNodes(prev => applyNodeChanges(changes, prev) as WhiteboardFlowNode[]);
	}, []);

	const onEdgesChange: OnEdgesChange = useCallback((changes) => {
		setFlowEdges(prev => applyEdgeChanges(changes, prev) as WhiteboardFlowEdge[]);
	}, []);

	// Drag-along for groups: when the user drags a group, all non-selected
	// nodes whose centre lies inside the group's starting bounds move with it.
	// The set is captured once at drag-start so adding/removing overlap
	// mid-drag doesn't change membership. Other groups can be captives too;
	// their own captives are NOT re-evaluated because we only translate them.
	type Captive = { id: string; originX: number; originY: number };
	const dragRef = useRef<{ groupId: string; originX: number; originY: number; captives: Captive[] } | null>(null);

	const onNodeDragStart = useCallback((_e: React.MouseEvent, node: Node) => {
		const dragged = flowNodes.find(n => n.id === node.id);
		if (!dragged || dragged.data?.canvasNode?.type !== 'group') return;
		const gx = dragged.position.x;
		const gy = dragged.position.y;
		const gw = (typeof dragged.width === 'number' ? dragged.width : (typeof dragged.style?.width === 'number' ? dragged.style.width : 0)) ?? 0;
		const gh = (typeof dragged.height === 'number' ? dragged.height : (typeof dragged.style?.height === 'number' ? dragged.style.height : 0)) ?? 0;
		// If the group itself is part of a multi-selection, React Flow drags
		// every selected node together — in that case we must skip selected
		// captives or they'd be double-moved by our delta. If the group isn't
		// in the multi-selection, only the group moves, so all nodes inside
		// (selected or not) need to come along.
		const groupInMultiSelect = !!dragged.selected;
		const captives: Captive[] = [];
		for (const n of flowNodes) {
			if (n.id === dragged.id) continue;
			if (groupInMultiSelect && n.selected) continue;
			const nw = (typeof n.width === 'number' ? n.width : (typeof n.style?.width === 'number' ? n.style.width : 0)) ?? 0;
			const nh = (typeof n.height === 'number' ? n.height : (typeof n.style?.height === 'number' ? n.style.height : 0)) ?? 0;
			const cx = n.position.x + nw / 2;
			const cy = n.position.y + nh / 2;
			if (cx >= gx && cx <= gx + gw && cy >= gy && cy <= gy + gh) {
				captives.push({ id: n.id, originX: n.position.x, originY: n.position.y });
			}
		}
		dragRef.current = { groupId: dragged.id, originX: gx, originY: gy, captives };
	}, [flowNodes]);

	const onNodeDrag = useCallback((_e: React.MouseEvent, node: Node) => {
		const ctx = dragRef.current;
		if (!ctx || node.id !== ctx.groupId || !ctx.captives.length) return;
		const dx = node.position.x - ctx.originX;
		const dy = node.position.y - ctx.originY;
		const originById = new Map(ctx.captives.map(c => [c.id, c]));
		setFlowNodes(prev => prev.map(n => {
			const origin = originById.get(n.id);
			if (!origin) return n;
			return { ...n, position: { x: origin.originX + dx, y: origin.originY + dy } };
		}));
	}, []);

	const onNodeDragStop = useCallback(() => {
		dragRef.current = null;
	}, []);

	const onConnect: OnConnect = useCallback((connection: Connection) => {
		const edge: WhiteboardFlowEdge = {
			id: generateId(),
			source: connection.source,
			target: connection.target,
			sourceHandle: connection.sourceHandle ?? undefined,
			targetHandle: connection.targetHandle ?? undefined,
			markerEnd: makeArrowMarker(),
			data: {
				canvasEdge: {
					id: '',
					fromNode: connection.source,
					toNode: connection.target,
				} as CanvasEdge,
			},
		};
		setFlowEdges(prev => [...prev, edge]);
	}, []);

	const onReconnect: OnReconnect = useCallback((oldEdge, newConnection) => {
		// `oldEdge` is the rendered edge, which carries the derived `style.stroke`
		// (blue when selected) baked in by `renderedEdges`. reconnectEdge copies
		// those fields onto the new edge, so it would persist that stroke into
		// state and leave the edge blue-but-not-bold after deselection. Reconnect
		// against the clean edge from state instead, keyed by id.
		setFlowEdges(prev => {
			const clean = prev.find(e => e.id === oldEdge.id);
			return reconnectEdge((clean ?? oldEdge) as unknown as WhiteboardFlowEdge, newConnection, prev) as WhiteboardFlowEdge[];
		});
	}, []);

	// Double-clicking an edge selects it exclusively and focuses the label
	// input, so a user can start typing without moving the mouse to the panel.
	const onEdgeDoubleClick = useCallback((_e: React.MouseEvent, edge: Edge) => {
		setFlowEdges(prev => prev.map(x => ({ ...x, selected: x.id === edge.id })));
		setFlowNodes(prev => prev.some(n => n.selected) ? prev.map(n => ({ ...n, selected: false })) : prev);
		setLabelFocusToken(t => t + 1);
	}, []);

	const defaultEdgeOptions = useMemo(() => ({
		markerEnd: makeArrowMarker(),
	}), []);

	const addCanvasNode = useCallback((n: CanvasNode) => {
		const flow = canvasNodeToFlowNode(n);
		setFlowNodes(prev => n.type === 'group' ? [flow, ...prev] : [...prev, flow]);
	}, []);

	const viewportCentre = useCallback((): { x: number; y: number } => {
		const view = rf.getViewport();
		const rect = containerRef.current?.getBoundingClientRect();
		const cx = rect ? (rect.width / 2 - view.x) / view.zoom : 0;
		const cy = rect ? (rect.height / 2 - view.y) / view.zoom : 0;
		return { x: cx, y: cy };
	}, [rf]);

	// Viewport bounds in canvas coordinates.
	const viewportBounds = useCallback((): { x: number; y: number; width: number; height: number } | null => {
		const view = rf.getViewport();
		const rect = containerRef.current?.getBoundingClientRect();
		if (!rect) return null;
		return {
			x: -view.x / view.zoom,
			y: -view.y / view.zoom,
			width: rect.width / view.zoom,
			height: rect.height / view.zoom,
		};
	}, [rf]);

	const existingRects = useCallback(() => {
		return flowNodes.map(n => ({
			x: n.position.x,
			y: n.position.y,
			width: (typeof n.width === 'number' ? n.width : (typeof n.style?.width === 'number' ? n.style.width : 0)) ?? 0,
			height: (typeof n.height === 'number' ? n.height : (typeof n.style?.height === 'number' ? n.style.height : 0)) ?? 0,
		}));
	}, [flowNodes]);

	const onAddText = useCallback(() => {
		const { x: cx, y: cy } = viewportCentre();
		addCanvasNode({
			id: generateId(),
			type: 'text',
			x: cx - 120,
			y: cy - 70,
			width: 240,
			height: 140,
			text: _('New text card'),
		});
	}, [viewportCentre, addCanvasNode]);

	const onAddGroup = useCallback(() => {
		const { x, y, width, height } = findEmptySpot({
			existing: existingRects(),
			viewport: viewportBounds(),
			centre: viewportCentre(),
			preferred: { width: 320, height: 240 },
			min: { width: 100, height: 100 },
		});
		addCanvasNode({
			id: generateId(),
			type: 'group',
			x,
			y,
			width,
			height,
			label: _('New group'),
		});
	}, [existingRects, viewportBounds, viewportCentre, addCanvasNode]);

	const selectedEdges = useMemo(() => flowEdges.filter(e => e.selected), [flowEdges]);
	const selectedNodes = useMemo(() => flowNodes.filter(n => n.selected), [flowNodes]);

	const DEFAULT_SELECTION_COLOR = '#4a90e2';
	const renderedEdges = useMemo<WhiteboardFlowEdge[]>(() => {
		return flowEdges.map(e => {
			// If the edge has a colour, use it for both the stroke and (when
			// selected) the selection affordance — otherwise fall back to the
			// default blue for selected edges, and to nothing (React Flow's
			// theme default) for unselected ones.
			const own = resolveCanvasColor(e.data?.color, ctx.themeAppearance, 'stroke');
			const stroke = own ?? (e.selected ? DEFAULT_SELECTION_COLOR : undefined);
			if (!stroke) return e;
			const tint = (m: WhiteboardFlowEdge['markerEnd']) =>
				(m && typeof m === 'object') ? { ...m, color: stroke } : m;
			return {
				...e,
				style: { ...(e.style ?? {}), stroke },
				markerEnd: tint(e.markerEnd),
				markerStart: tint(e.markerStart),
			};
		});
	}, [flowEdges, ctx.themeAppearance]);

	const updateSelectedEdges = useCallback((patch: (e: WhiteboardFlowEdge)=> WhiteboardFlowEdge) => {
		setFlowEdges(prev => prev.map(e => e.selected ? patch(e) : e));
	}, []);

	const currentArrowMode: ArrowMode = useMemo(() => {
		if (!selectedEdges.length) return 'none';
		const first = arrowModeFor(selectedEdges[0]);
		for (const e of selectedEdges) if (arrowModeFor(e) !== first) return 'mixed';
		return first;
	}, [selectedEdges]);

	const setArrowMode = useCallback((mode: Exclude<ArrowMode, 'mixed'>) => {
		updateSelectedEdges(e => ({
			...e,
			markerStart: (mode === 'backward' || mode === 'both') ? makeArrowMarker() : undefined,
			markerEnd: (mode === 'forward' || mode === 'both') ? makeArrowMarker() : undefined,
		}));
	}, [updateSelectedEdges]);

	const flipDirection = useCallback(() => {
		updateSelectedEdges(e => ({
			...e,
			source: e.target,
			target: e.source,
			sourceHandle: e.targetHandle,
			targetHandle: e.sourceHandle,
			markerStart: e.markerEnd,
			markerEnd: e.markerStart,
		}));
	}, [updateSelectedEdges]);

	const setEdgeLabel = useCallback((label: string) => {
		updateSelectedEdges(e => ({ ...e, label }));
	}, [updateSelectedEdges]);

	const setSelectedColor = useCallback((color: CanvasColor | undefined) => {
		setFlowEdges(prev => prev.map(e => e.selected
			? { ...e, data: { ...(e.data as WhiteboardFlowEdge['data'] & object), color } }
			: e));
		setFlowNodes(prev => prev.map(n => {
			if (!n.selected) return n;
			const cn = n.data?.canvasNode;
			if (!cn) return n;
			const nextCanvasNode = { ...cn, ...(color ? { color } : {}) } as CanvasNode;
			if (!color) delete (nextCanvasNode as { color?: CanvasColor }).color;
			return { ...n, data: { ...n.data, canvasNode: nextCanvasNode } };
		}));
	}, []);

	// A single preset "wins" as the current colour only when every selected
	// item shares it. Mixed selections show no active swatch — clicking one
	// still applies it to everything, which matches the arrow-mode behaviour.
	const currentColor = useMemo<CanvasColor | undefined>(() => {
		const colors: (CanvasColor | undefined)[] = [
			...selectedEdges.map(e => e.data?.color),
			...selectedNodes.map(n => n.data?.canvasNode?.color),
		];
		if (!colors.length) return undefined;
		const first = colors[0];
		return colors.every(c => c === first) ? first : undefined;
	}, [selectedEdges, selectedNodes]);

	const colorSwatches = (
		<>
			<ActionSwatch
				color={null}
				active={currentColor === undefined}
				title={_('No colour')}
				onClick={() => setSelectedColor(undefined)}
			/>
			{presetColors.map(p => (
				<ActionSwatch
					key={p.id}
					color={resolveCanvasColor(p.id, ctx.themeAppearance, 'stroke') ?? '#888'}
					active={currentColor === p.id}
					title={p.label}
					onClick={() => setSelectedColor(p.id)}
				/>
			))}
		</>
	);

	const onDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
		const types = Array.from(e.dataTransfer.types);
		if (types.includes('text/x-jop-note-ids') || types.includes('text/x-jop-resource-ids')) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'link';
		} else if (types.includes('Files')) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';
		}
	}, []);

	const onDrop = useCallback(async (e: ReactDragEvent<HTMLDivElement>) => {
		const noteIdsRaw = e.dataTransfer.getData('text/x-jop-note-ids');
		const resourceIdsRaw = e.dataTransfer.getData('text/x-jop-resource-ids');
		// Electron's recommended way to get the on-disk path of a dropped File
		// (the deprecated `File.path` was removed in recent Electron versions).
		const droppedFiles = Array.from(e.dataTransfer.files);
		const filePaths = droppedFiles.map(f => webUtils.getPathForFile(f)).filter((p): p is string => !!p);
		if (!noteIdsRaw && !resourceIdsRaw && !filePaths.length) return;
		e.preventDefault();
		e.stopPropagation();

		const drop = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
		const tryParse = (raw: string): string[] => {
			if (!raw) return [];
			try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
		};

		const placeCardForResource = (resourceId: string, index: number) => {
			const offset = index * 24;
			addCanvasNode({
				id: generateId(),
				type: 'file',
				x: drop.x - 120 + offset,
				y: drop.y - 60 + offset,
				width: 240,
				height: 160,
				file: `:/${resourceId}`,
			});
		};

		const internalIds = [
			...tryParse(noteIdsRaw),
			...tryParse(resourceIdsRaw),
		];
		for (let i = 0; i < internalIds.length; i++) placeCardForResource(internalIds[i], i);

		if (filePaths.length) {
			// Import each file into the resource store, then add a card. Done
			// in parallel for throughput; the card index (and thus the offset)
			// follows the original drop order so cards stagger predictably
			// even if larger files finish importing later.
			await Promise.all(filePaths.map(async (filePath, i) => {
				try {
					const resource = await shim.createResourceFromPath(filePath);
					placeCardForResource(resource.id, internalIds.length + i);
				} catch (error) {
					logger.warn(`Could not import dropped file ${filePath}:`, error);
				}
			}));
		}
	}, [rf, addCanvasNode]);

	return (
		<div
			ref={containerRef}
			className="whiteboard-surface"
			onDragOver={onDragOver}
			onDrop={onDrop}
		>
			<ReactFlow
				nodes={flowNodes as unknown as Node[]}
				edges={renderedEdges as unknown as Edge[]}
				nodeTypes={nodeTypes}
				defaultEdgeOptions={defaultEdgeOptions}
				connectionMode={ConnectionMode.Loose}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onReconnect={onReconnect}
				onEdgeDoubleClick={onEdgeDoubleClick}
				edgesReconnectable
				onNodeDragStart={onNodeDragStart}
				onNodeDrag={onNodeDrag}
				onNodeDragStop={onNodeDragStop}
				elevateEdgesOnSelect
				deleteKeyCode={['Backspace', 'Delete']}
				multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
				selectionKeyCode={['Shift']}
				panOnScroll
				panOnDrag
				zoomOnPinch
				zoomOnScroll={false}
				fitView={flowNodes.length > 0}
				elevateNodesOnSelect={false}
				proOptions={{ hideAttribution: true }}
			>
				<Background gap={16} size={1} />
				<Controls showInteractive={false} />
				<MiniMap pannable zoomable />

				<ActionPanel position="top-right">
					<ActionButton onClick={onAddText} title={_('Add a text card')}>{_('+ Text')}</ActionButton>
					<ActionButton onClick={onAddGroup} title={_('Add a group')}>{_('+ Group')}</ActionButton>
				</ActionPanel>

				{selectedEdges.length > 0 ? (
					<ActionPanel
						position="bottom-center"
						caption={_n('%d connection', '%d connections', selectedEdges.length, selectedEdges.length)}
					>
						<ActionButton onClick={() => setArrowMode('none')} active={currentArrowMode === 'none'} title={_('No arrow')}>—</ActionButton>
						<ActionButton onClick={() => setArrowMode('forward')} active={currentArrowMode === 'forward'} title={_('Arrow at target')}>→</ActionButton>
						<ActionButton onClick={() => setArrowMode('backward')} active={currentArrowMode === 'backward'} title={_('Arrow at source')}>←</ActionButton>
						<ActionButton onClick={() => setArrowMode('both')} active={currentArrowMode === 'both'} title={_('Bidirectional')}>↔</ActionButton>
						<ActionDivider />
						<ActionButton onClick={flipDirection} title={_('Swap source and target')}>{_('Flip')}</ActionButton>
						<ActionDivider />
						{colorSwatches}
						{selectedEdges.length === 1 ? (
							<>
								<ActionDivider />
								<ActionInput
									value={typeof selectedEdges[0].label === 'string' ? selectedEdges[0].label : ''}
									placeholder={_('Label')}
									focusToken={labelFocusToken}
									onChange={setEdgeLabel}
								/>
							</>
						) : null}
					</ActionPanel>
				) : null}

				{selectedNodes.length > 0 && selectedEdges.length === 0 ? (
					<ActionPanel
						position="bottom-center"
						caption={_n('%d card', '%d cards', selectedNodes.length, selectedNodes.length)}
					>
						{colorSwatches}
					</ActionPanel>
				) : null}
			</ReactFlow>
		</div>
	);
};

const WhiteboardSurface = (props: Props) => (
	<ReactFlowProvider>
		<InnerSurface {...props} />
	</ReactFlowProvider>
);

export default WhiteboardSurface;
