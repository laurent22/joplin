import { invertedEffects } from '@codemirror/commands';
import { EditorState, Extension, StateEffect, StateField, Transaction } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { wordDiff, WordDiffSegment } from '@joplin/lib/services/conflict/wordDiff';

// One conflicting line. from/to point at the other side's text in the document,
// localText is the user's version of the same line
export interface ConflictRegionSpec {
	from: number;
	to: number;
	localText: string;
	// Already on screen, so it is highlighted without a widget
	addedByThem?: boolean;
}

export interface ConflictRegion extends ConflictRegionSpec {
	id: number;
	// Empty by nature rather than because it was dealt with
	startedEmpty: boolean;
	// Edited to match localText. Kept so undo brings the conflict back
	settled: boolean;
}

export interface SetConflictRegions {
	regions: ConflictRegionSpec[];
	// The document these belong to, or null to clear them. The editor value is
	// set separately, so they cannot be used with another note.
	forText: string|null;
}

export const setConflictRegions = StateEffect.define<SetConflictRegions>();
export const resolveConflict = StateEffect.define<number>();
export const restoreConflict = StateEffect.define<ConflictRegion>();

// Separate from resolveConflict because the text must be replaced first, which
// the state field cannot do on its own
const useLocalVersion = StateEffect.define<number>();

const refreshConflictHighlights = StateEffect.define<void>();

const typingPauseMs = 400;

class LocalVersionWidget extends WidgetType {
	public constructor(
		private readonly regionId_: number,
		private readonly localText_: string,
		private readonly segments_: WordDiffSegment[],
	) {
		super();
	}

	public eq(other: LocalVersionWidget) {
		return this.regionId_ === other.regionId_ && this.localText_ === other.localText_;
	}

	public toDOM(view: EditorView) {
		const container = document.createElement('div');
		container.className = 'cm-conflictLocalVersion';
		// The editor's theme takes priority, so used the same colours as the editor.
		const editorColor = view.dom.ownerDocument.defaultView?.getComputedStyle(view.contentDOM).color;
		if (editorColor) container.style.color = editorColor;

		const text = document.createElement('div');
		text.className = 'cm-conflictLocalVersion-text';

		for (const segment of this.segments_) {
			const span = document.createElement('span');
			if (segment.highlighted) {
				span.className = 'cm-conflictLocalVersion-changedWord';
			}
			span.textContent = segment.text;
			text.appendChild(span);
		}
		container.appendChild(text);

		const button = document.createElement('button');
		button.className = 'cm-conflictUseVersionButton';
		button.textContent = view.state.phrase('Use my version');
		button.onclick = () => {
			view.dispatch({ effects: useLocalVersion.of(this.regionId_) });
		};
		container.appendChild(button);

		return container;
	}

	// Without this the button's own events are treated as editor input
	public ignoreEvent() {
		return true;
	}
}

class CurrentVersionWidget extends WidgetType {
	public eq() {
		return true;
	}

	public toDOM(view: EditorView) {
		const label = document.createElement('div');
		label.className = 'cm-conflictCurrentVersion';
		label.textContent = `✓ ${view.state.phrase('Current version')}`;
		return label;
	}

	public ignoreEvent() {
		return true;
	}
}

const regionDecoration = Decoration.mark({ class: 'cm-conflictRegion' });

// Line decorations, so the panel can be drawn without replacing the editable text
const incomingLine = Decoration.line({ class: 'cm-conflictIncoming' });
const incomingFirstLine = Decoration.line({ class: 'cm-conflictIncoming cm-conflictIncoming-first' });
const incomingLastLine = Decoration.line({ class: 'cm-conflictIncoming cm-conflictIncoming-last' });
const incomingOnlyLine = Decoration.line({ class: 'cm-conflictIncoming cm-conflictIncoming-first cm-conflictIncoming-last' });

const changedWordDecoration = Decoration.mark({ class: 'cm-conflictChangedWord' });

const changedWordRanges = (segments: WordDiffSegment[], offset: number) => {
	const ranges = [];
	let position = offset;

	for (const segment of segments) {
		const end = position + segment.text.length;
		if (segment.highlighted) {
			ranges.push(changedWordDecoration.range(position, end));
		}
		position = end;
	}

	return ranges;
};

interface DecorationDoc {
	length: number;
	sliceString: (from: number, to: number)=> string;
	lineAt: (pos: number)=> { from: number; to: number };
}

// Positions are limited because the region is checked in both documents.
const lineSpan = (doc: { length: number; lineAt: (pos: number)=> { number: number } }, from: number, to: number) => {
	const end = Math.min(Math.max(to, 0), doc.length);
	const start = Math.min(Math.max(from, 0), end);
	return doc.lineAt(end).number - doc.lineAt(start).number;
};

const buildDecorations = (doc: DecorationDoc, regions: ConflictRegion[]) => {
	const ranges = [];

	for (const region of regions) {
		if (region.settled) continue;

		const regionText = doc.sliceString(region.from, region.to);
		const diff = wordDiff(region.localText, regionText);

		// Their additions are already on screen, so a widget would be empty
		if (!region.addedByThem) {
			// Block widgets must be at a line boundary or else they split the line in two
			const lineStart = doc.lineAt(region.from).from;
			ranges.push(Decoration.widget({
				widget: new LocalVersionWidget(region.id, region.localText, diff.local),
				block: true,
				side: -1,
			}).range(lineStart));
		}

		// A region with no text cannot have a mark. The widget above it shows the text.
		if (region.from < region.to) {
			const firstLine = doc.lineAt(region.from);
			const lastLine = doc.lineAt(region.to);
			for (let line = firstLine; ; line = doc.lineAt(line.to + 1)) {
				const isFirst = line.from === firstLine.from;
				const isLast = line.from === lastLine.from;
				let decoration = incomingLine;
				if (isFirst && isLast) decoration = incomingOnlyLine;
				else if (isFirst) decoration = incomingFirstLine;
				else if (isLast) decoration = incomingLastLine;
				ranges.push(decoration.range(line.from));
				if (isLast || line.to >= doc.length) break;
			}

			ranges.push(regionDecoration.range(region.from, region.to));

			// Every word in an addition differs, so highlighting them all would shade the line twice.
			if (!region.addedByThem) {
				ranges.push(...changedWordRanges(diff.remote, region.from));
			}

			ranges.push(Decoration.widget({
				widget: new CurrentVersionWidget(),
				block: true,
				side: 1,
			}).range(lastLine.to));
		}
	}

	return Decoration.set(ranges, true);
};

interface ConflictState {
	regions: ConflictRegion[];
	decorations: DecorationSet;
	pending: SetConflictRegions|null;
}

const emptyState: ConflictState = { regions: [], decorations: Decoration.none, pending: null };

let nextRegionId = 0;

const conflictState = StateField.define<ConflictState>({
	create: () => emptyState,

	update: (state, transaction: Transaction) => {
		let regions = state.regions;
		let decorations = state.decorations;
		let pending = state.pending;
		let rebuild = false;

		if (transaction.docChanged) {
			// Mapping both edges keeps text typed at the region's boundary inside it.
			regions = regions.map(region => {
				const from = transaction.changes.mapPos(region.from, -1);
				const to = transaction.changes.mapPos(region.to, 1);
				// Re-checked after every change so undo can bring the conflict back.
				// A region that only exists on this side starts empty, so empty does not mean resolved.
				const settled = from >= to
					? !region.startedEmpty
					: transaction.state.doc.sliceString(from, to) === region.localText;

				// Waiting would leave the widget visible after the text already matches.
				if (settled !== region.settled) rebuild = true;

				// One decoration per line. Mapping moves existing ones but can't add new ones,
				// so splitting or joining lines needs a redraw.
				if (lineSpan(transaction.startState.doc, region.from, region.to) !== lineSpan(transaction.state.doc, from, to)) {
					rebuild = true;
				}

				return { ...region, from, to, settled };
			});

			const spans = new Set<string>();
			regions = regions.filter(region => {
				if (region.settled) return true;
				const key = `${region.from}:${region.to}`;
				if (spans.has(key)) return false;
				spans.add(key);
				return true;
			});
			decorations = decorations.map(transaction.changes);
		}

		for (const effect of transaction.effects) {
			if (effect.is(setConflictRegions)) {
				// Whatever the editor holds now, they no longer describe it
				regions = [];
				pending = effect.value.forText === null ? null : effect.value;
				rebuild = true;
			} else if (effect.is(resolveConflict)) {
				regions = regions.filter(region => region.id !== effect.value);
				rebuild = true;
			} else if (effect.is(restoreConflict)) {
				regions = [...regions, effect.value].sort((a, b) => a.from - b.from);
				rebuild = true;
			}
		}

		if (pending && transaction.state.doc.toString() === pending.forText) {
			const docLength = transaction.state.doc.length;
			regions = pending.regions
				// Invalid positions would cause an error when mapped later.
				.filter(spec => spec.from >= 0 && spec.to <= docLength && spec.from <= spec.to)
				.map(spec => ({
					...spec,
					id: nextRegionId++,
					startedEmpty: spec.from >= spec.to,
					// A region may already match, such as when resolved parts are added back.
					settled: spec.from >= spec.to
						? spec.localText === ''
						: transaction.state.doc.sliceString(spec.from, spec.to) === spec.localText,
				}));
			pending = null;
			rebuild = true;
		}

		if (transaction.effects.some(effect => effect.is(refreshConflictHighlights))) {
			rebuild = true;
		}

		if (rebuild) {
			decorations = buildDecorations(transaction.state.doc, regions);
		}

		if (regions === state.regions && decorations === state.decorations && pending === state.pending) {
			return state;
		}
		return { regions, decorations, pending };
	},

	provide: field => EditorView.decorations.from(field, state => state.decorations),
});

export const conflictRegions = (state: { field: <T>(field: StateField<T>)=> T }) => {
	return state.field(conflictState).regions.filter(region => !region.settled);
};

const applyLocalVersion = EditorState.transactionFilter.of(transaction => {
	const chosen = transaction.effects.filter(effect => effect.is(useLocalVersion));
	if (!chosen.length) return transaction;

	const regions = transaction.startState.field(conflictState).regions;
	const changes = [];
	const effects = [];

	for (const effect of chosen) {
		const region = regions.find(item => item.id === effect.value);
		if (!region) continue;

		changes.push({ from: region.from, to: region.to, insert: region.localText });
		effects.push(resolveConflict.of(region.id));
	}

	if (!changes.length) return transaction;

	// Replaces the transaction so the text and the resolution are one undo step
	return { changes, effects };
});

// Undo already handles the text, so this keeps the region change with it.
// One undo brings back both.
const undoableResolutions = invertedEffects.of(transaction => {
	const regions = transaction.startState.field(conflictState).regions;
	const restored = [];

	for (const effect of transaction.effects) {
		if (effect.is(resolveConflict)) {

			const region = regions.find(item => item.id === effect.value);
			if (region) restored.push(restoreConflict.of(region));
		} else if (effect.is(restoreConflict)) {
			restored.push(resolveConflict.of(effect.value.id));
		}
	}

	return restored;
});

const refreshOnTypingPause = ViewPlugin.fromClass(class {
	private timeout_: ReturnType<typeof setTimeout>|null = null;

	public constructor(private readonly view_: EditorView) {}

	public update(update: ViewUpdate) {
		if (!update.docChanged) return;
		if (!conflictRegions(update.state).length) return;

		this.cancel();
		this.timeout_ = setTimeout(() => {
			this.timeout_ = null;
			this.view_.dispatch({ effects: refreshConflictHighlights.of(undefined) });
		}, typingPauseMs);
	}

	public destroy() {
		this.cancel();
	}

	private cancel() {
		if (this.timeout_ !== null) {
			clearTimeout(this.timeout_);
			this.timeout_ = null;
		}
	}
});

const remoteAccent = 'var(--joplin-color4, #2D5BE5)';
const localAccent = 'var(--joplin-search-marker-background-color, #F7D26E)';
const surface = 'var(--joplin-background-color, #ffffff)';

const conflictTheme = EditorView.baseTheme({
	'& .cm-conflictRegion': {
		backgroundColor: `color-mix(in srgb, ${remoteAccent} 14%, ${surface})`,
	},

	'& .cm-conflictIncoming': {
		backgroundColor: `color-mix(in srgb, ${remoteAccent} 12%, ${surface})`,
		borderLeft: `2px solid ${remoteAccent}`,
		paddingLeft: '6px',
	},
	'& .cm-conflictIncoming-first': {
		paddingTop: '2px',
	},
	'& .cm-conflictIncoming-last': {
		paddingBottom: '0',
	},
	'& .cm-conflictCurrentVersion': {
		color: remoteAccent,
		fontSize: '0.85em',
		textAlign: 'right',
		// The panel background, not the left bar. Extending it past the last line
		// makes the label look like part of the note.
		backgroundColor: `color-mix(in srgb, ${remoteAccent} 12%, ${surface})`,
		padding: '0 8px 3px 8px',
		// A block widget occupies a position, so a click on it moves the cursor
		pointerEvents: 'none',
		userSelect: 'none',
	},
	'& .cm-conflictChangedWord': {
		backgroundColor: `color-mix(in srgb, ${remoteAccent} 35%, ${surface})`,
		borderRadius: '2px',
	},

	'& .cm-conflictLocalVersion': {
		display: 'flex',
		alignItems: 'flex-start',
		gap: '8px',
		backgroundColor: `color-mix(in srgb, ${localAccent} 16%, ${surface})`,
		border: `1px solid color-mix(in srgb, ${localAccent} 50%, ${surface})`,
		borderRadius: '4px',
		padding: '4px 8px',
		margin: '2px 0',
		// Outside the line, so the editor's own text colour does not reach it
		color: 'var(--joplin-color, inherit)',
		pointerEvents: 'none',
		userSelect: 'none',
	},
	'& .cm-conflictLocalVersion-text': {
		whiteSpace: 'pre-wrap',
		overflowWrap: 'anywhere',
		flex: 1,
		minWidth: 0,
	},
	'& .cm-conflictLocalVersion-changedWord': {
		backgroundColor: `color-mix(in srgb, ${localAccent} 45%, ${surface})`,
		borderRadius: '2px',
	},
	'& .cm-conflictUseVersionButton': {
		flexShrink: 0,
		alignSelf: 'center',
		cursor: 'pointer',
		whiteSpace: 'nowrap',
		pointerEvents: 'auto',
		border: '1px solid var(--joplin-border-color4, rgba(0, 0, 0, 0.3))',
		borderRadius: '3px',
		padding: '3px 14px',
		backgroundColor: surface,
		color: 'var(--joplin-color, inherit)',
		font: 'inherit',
		fontSize: '0.85em',
	},
	'& .cm-conflictUseVersionButton:hover': {
		backgroundColor: 'var(--joplin-background-color-hover3, rgba(0, 0, 0, 0.06))',
	},
	'& .cm-conflictUseVersionButton:active': {
		backgroundColor: `color-mix(in srgb, ${localAccent} 35%, ${surface})`,
	},
});

const conflictResolutionExtension = (): Extension => [
	conflictState,
	applyLocalVersion,
	undoableResolutions,
	refreshOnTypingPause,
	conflictTheme,
];

export default conflictResolutionExtension;
