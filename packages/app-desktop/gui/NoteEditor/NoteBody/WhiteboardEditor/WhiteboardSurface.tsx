import * as React from 'react';
import { CSSProperties, DragEvent as ReactDragEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
	ReactFlow,
	ReactFlowProvider,
	applyEdgeChanges,
	applyNodeChanges,
	useReactFlow,
} from '@xyflow/react';
import ensureReactFlowCss from './loadReactFlowCss';
import { Canvas, CanvasEdge, CanvasNode } from '@joplin/lib/services/whiteboard/jsoncanvas';

ensureReactFlowCss();
import { canvasToFlow, flowToCanvas, WhiteboardFlowEdge, WhiteboardFlowNode } from './canvasFlow';
import TextNode from './nodes/TextNode';
import FileNode from './nodes/FileNode';
import LinkNode from './nodes/LinkNode';
import { ActionButton, ActionDivider, ActionInput, ActionPanel } from './ActionPanel';

const containerStyle: CSSProperties = {
	position: 'relative',
	flex: 1,
	width: '100%',
	height: '100%',
	background: '#f4f4f4',
	outline: 'none',
};

const generateId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const makeArrowMarker = () => ({ type: MarkerType.ArrowClosed, width: 18, height: 18 });

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
	onAddNode: (node: CanvasNode)=> void;
}

const nodeTypes: NodeTypes = {
	wbText: TextNode as unknown as NodeTypes[string],
	wbFile: FileNode as unknown as NodeTypes[string],
	wbLink: LinkNode as unknown as NodeTypes[string],
};

const InnerSurface = ({ canvas, onChange, onAddNode }: Props) => {
	const initial = useMemo(() => canvasToFlow(canvas), [canvas]);
	const [flowNodes, setFlowNodes] = useState<WhiteboardFlowNode[]>(initial.nodes);
	const [flowEdges, setFlowEdges] = useState<WhiteboardFlowEdge[]>(initial.edges);
	// JSONCanvas group nodes are not rendered, but we preserve them through
	// round-trip so importing a canvas from another tool (e.g. Obsidian) and
	// re-saving doesn't silently drop them.
	const preservedGroupsRef = useRef<CanvasNode[]>(initial.preservedGroups);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const rf = useReactFlow();

	// When the incoming canvas changes (note loaded externally), reload state
	// — but skip if it's the same canvas we just emitted (avoid feedback loops).
	const lastEmittedRef = useRef<string>(JSON.stringify(canvas));
	useEffect(() => {
		const incoming = JSON.stringify(canvas);
		if (incoming === lastEmittedRef.current) return;
		lastEmittedRef.current = incoming;
		const next = canvasToFlow(canvas);
		setFlowNodes(next.nodes);
		setFlowEdges(next.edges);
		preservedGroupsRef.current = next.preservedGroups;
	}, [canvas]);

	// Push changes back to the parent whenever the local flow state changes.
	useEffect(() => {
		const out = flowToCanvas(flowNodes, flowEdges, preservedGroupsRef.current);
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

	const defaultEdgeOptions = useMemo(() => ({
		markerEnd: makeArrowMarker(),
	}), []);

	const onAddText = useCallback(() => {
		const view = rf.getViewport();
		const rect = containerRef.current?.getBoundingClientRect();
		const cx = rect ? (rect.width / 2 - view.x) / view.zoom : 0;
		const cy = rect ? (rect.height / 2 - view.y) / view.zoom : 0;
		onAddNode({
			id: generateId(),
			type: 'text',
			x: cx - 100,
			y: cy - 50,
			width: 200,
			height: 100,
			text: 'New text card',
		});
	}, [rf, onAddNode]);

	// Selection summaries for the action panels.
	const selectedEdges = useMemo(() => flowEdges.filter(e => e.selected), [flowEdges]);
	const selectedNodes = useMemo(() => flowNodes.filter(n => n.selected), [flowNodes]);

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

	const onDragOver = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
		const types = Array.from(e.dataTransfer.types);
		if (types.includes('text/x-jop-note-ids') || types.includes('text/x-jop-resource-ids')) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'link';
		}
	}, []);

	const onDrop = useCallback((e: ReactDragEvent<HTMLDivElement>) => {
		const noteIdsRaw = e.dataTransfer.getData('text/x-jop-note-ids');
		const resourceIdsRaw = e.dataTransfer.getData('text/x-jop-resource-ids');
		if (!noteIdsRaw && !resourceIdsRaw) return;
		e.preventDefault();
		e.stopPropagation();

		const drop = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
		const tryParse = (raw: string): string[] => {
			if (!raw) return [];
			try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch { return []; }
		};
		const ids = [
			...tryParse(noteIdsRaw),
			...tryParse(resourceIdsRaw),
		];
		let offset = 0;
		for (const id of ids) {
			onAddNode({
				id: generateId(),
				type: 'file',
				x: drop.x - 120 + offset,
				y: drop.y - 60 + offset,
				width: 240,
				height: 160,
				file: `:/${id}`,
			});
			offset += 24;
		}
	}, [rf, onAddNode]);

	return (
		<div
			ref={containerRef}
			style={containerStyle}
			onDragOver={onDragOver}
			onDrop={onDrop}
		>
			<ReactFlow
				nodes={flowNodes as unknown as Node[]}
				edges={flowEdges as unknown as Edge[]}
				nodeTypes={nodeTypes}
				defaultEdgeOptions={defaultEdgeOptions}
				connectionMode={ConnectionMode.Loose}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				deleteKeyCode={['Backspace', 'Delete']}
				multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
				selectionKeyCode={['Shift']}
				panOnScroll
				panOnDrag
				zoomOnPinch
				zoomOnScroll={false}
				fitView={flowNodes.length > 0}
				proOptions={{ hideAttribution: true }}
			>
				<Background gap={16} size={1} />
				<Controls showInteractive={false} />
				<MiniMap pannable zoomable style={{ width: 160, height: 100 }} />

				<ActionPanel position="top-right">
					<ActionButton onClick={onAddText} title="Add a text card">+ Text</ActionButton>
				</ActionPanel>

				{selectedEdges.length > 0 ? (
					<ActionPanel
						position="bottom-center"
						caption={`${selectedEdges.length} connection${selectedEdges.length === 1 ? '' : 's'}`}
					>
						<ActionButton onClick={() => setArrowMode('none')} active={currentArrowMode === 'none'} title="No arrow">—</ActionButton>
						<ActionButton onClick={() => setArrowMode('forward')} active={currentArrowMode === 'forward'} title="Arrow at target">→</ActionButton>
						<ActionButton onClick={() => setArrowMode('backward')} active={currentArrowMode === 'backward'} title="Arrow at source">←</ActionButton>
						<ActionButton onClick={() => setArrowMode('both')} active={currentArrowMode === 'both'} title="Bidirectional">↔</ActionButton>
						<ActionDivider />
						<ActionButton onClick={flipDirection} title="Swap source and target">Flip</ActionButton>
						{selectedEdges.length === 1 ? (
							<>
								<ActionDivider />
								<ActionInput
									value={typeof selectedEdges[0].label === 'string' ? selectedEdges[0].label : ''}
									placeholder="Label"
									onChange={setEdgeLabel}
								/>
							</>
						) : null}
					</ActionPanel>
				) : null}

				{selectedNodes.length > 0 && selectedEdges.length === 0 ? (
					<ActionPanel
						position="bottom-center"
						caption={`${selectedNodes.length} card${selectedNodes.length === 1 ? '' : 's'}`}
					>
						{/* Per-card actions can be added here later (colour, alignment, etc.). */}
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
