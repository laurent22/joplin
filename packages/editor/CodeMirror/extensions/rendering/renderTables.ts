// Joplin-native interactive table editor widget for CodeMirror 6.
// Clean design: no grip columns, table stays flush-left.
// - Hover near row/column edges → "+" button appears via absolute positioning
// - Right-click any cell → context menu for insert/move/delete
// - Enter in last cell → adds new row
// - Tab/Shift+Tab → navigate cells

import { EditorView, WidgetType } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';
import makeBlockReplaceExtension from './utils/makeBlockReplaceExtension';
import { focus, blur } from '@joplin/lib/utils/focusHandler';
import {
	parseTable, serializeTable,
	addRow, addColumn, deleteRow, deleteColumn,
	swapRows, swapColumns,
	Table,
} from '../../utils/markdown/tableUtils';

// Short class name prefix
const W = 'cm-tw';
const CELL = 'cm-tw-c';
const HDR = 'cm-tw-h';
const CTX = 'cm-tw-ctx';

class TableWidget extends WidgetType {
	public constructor(
		private tableText: string,
		private from: number,
		private to: number,
	) {
		super();
	}

	public eq(other: TableWidget) {
		return this.tableText === other.tableText;
	}

	private apply(view: EditorView, newTable: Table | null) {
		if (!newTable) return;
		view.dispatch({
			changes: { from: this.from, to: this.to, insert: serializeTable(newTable) },
		});
	}

	private syncCell(view: EditorView, table: Table, row: number, col: number, text: string) {
		if (row === 0) {
			table.header.cells[col].content = text;
		} else {
			const b = row - 1;
			if (b < table.body.length && col < table.body[b].cells.length) {
				table.body[b].cells[col].content = text;
			}
		}
		view.dispatch({
			changes: { from: this.from, to: this.to, insert: serializeTable(table) },
		});
	}

	public toDOM(view: EditorView) {
		const table = parseTable(this.tableText);
		if (!table) {
			const pre = document.createElement('pre');
			pre.textContent = this.tableText;
			return pre;
		}

		const numCols = table.header.cells.length;
		const numBodyRows = table.body.length;
		const totalRows = numBodyRows + 1;
		const allCells: HTMLElement[][] = [];

		const container = document.createElement('div');
		container.classList.add(W);

		const tableEl = document.createElement('table');

		// ---- Editable cell ----
		const mkCell = (text: string, r: number, c: number, isHdr: boolean) => {
			const el = document.createElement(isHdr ? 'th' : 'td');
			el.classList.add(CELL);
			if (isHdr) el.classList.add(HDR);
			el.textContent = text;
			el.contentEditable = 'true';
			el.spellcheck = false;

			el.onblur = () => {
				// Read only direct text nodes (not button children like "+")
				const v = Array.from(el.childNodes)
					.filter(n => n.nodeType === Node.TEXT_NODE)
					.map(n => n.textContent || '')
					.join('')
					.trim();
				const orig = isHdr
					? table.header.cells[c]?.content
					: table.body[r - 1]?.cells[c]?.content;
				if (v !== orig) this.syncCell(view, table, r, c, v);
			};

			el.onkeydown = (e) => {
				if (e.key === 'Tab') {
					e.preventDefault();
					e.stopPropagation();
					const flat = allCells.flat();
					const i = flat.indexOf(el);
					if (e.shiftKey) {
						if (i > 0) focus('TableWidget', flat[i - 1]);
					} else if (i < flat.length - 1) {
						focus('TableWidget', flat[i + 1]);
					} else {
						this.apply(view, addRow(table, numBodyRows - 1));
					}
				} else if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					if (r === totalRows - 1 && c === numCols - 1) {
						blur('TableWidget', el);
						this.apply(view, addRow(table, numBodyRows - 1));
					} else {
						blur('TableWidget', el);
					}
				} else if (e.key === 'Escape') {
					e.preventDefault();
					blur('TableWidget', el);
				}
			};

			el.oncontextmenu = (e) => showCtx(e, r, c);

			return el;
		};

		// ---- Hover "+" buttons (absolute positioned) ----
		// These are tiny buttons that sit on the right/bottom edge of each cell
		// and appear only on hover. No extra columns needed.

		const mkAddColBtn = (afterCol: number, anchorCell: HTMLElement) => {
			const btn = document.createElement('button');
			btn.classList.add('cm-tw-ac');
			btn.textContent = '+';
			btn.title = 'Add column to the right';
			btn.onmousedown = (e) => {
				if (e.button !== 0) return; // left-click only
				e.preventDefault();
				e.stopPropagation();
				this.apply(view, addColumn(table, afterCol));
			};
			anchorCell.appendChild(btn);
		};

		const mkAddRowBtn = (afterBodyIdx: number, anchorCell: HTMLElement) => {
			const btn = document.createElement('button');
			btn.classList.add('cm-tw-ar');
			btn.textContent = '+';
			btn.title = 'Add row below';
			btn.onmousedown = (e) => {
				if (e.button !== 0) return; // left-click only
				e.preventDefault();
				e.stopPropagation();
				this.apply(view, addRow(table, afterBodyIdx));
			};
			anchorCell.appendChild(btn);
		};

		// ---- Build header ----
		const thead = document.createElement('thead');
		const headerTr = document.createElement('tr');
		allCells[0] = [];
		for (let c = 0; c < numCols; c++) {
			const cell = mkCell(table.header.cells[c].content, 0, c, true);
			// "+" on right edge of every header cell → add column
			mkAddColBtn(c, cell);
			// "+" on bottom edge of first header cell → add row below header
			if (c === 0) mkAddRowBtn(-1, cell);
			allCells[0].push(cell);
			headerTr.appendChild(cell);
		}
		thead.appendChild(headerTr);
		tableEl.appendChild(thead);

		// ---- Build body ----
		const tbody = document.createElement('tbody');
		for (let r = 0; r < numBodyRows; r++) {
			const tr = document.createElement('tr');
			allCells[r + 1] = [];
			for (let c = 0; c < numCols; c++) {
				const content = c < table.body[r].cells.length ? table.body[r].cells[c].content : '';
				const cell = mkCell(content, r + 1, c, false);
				// "+" on bottom edge of first column cell → add row
				if (c === 0) mkAddRowBtn(r, cell);
				allCells[r + 1].push(cell);
				tr.appendChild(cell);
			}
			tbody.appendChild(tr);
		}
		tableEl.appendChild(tbody);
		container.appendChild(tableEl);

		// ---- Context menu ----
		const showCtx = (e: MouseEvent, r: number, c: number) => {
			e.preventDefault();
			container.querySelector(`.${CTX}`)?.remove();

			const menu = document.createElement('div');
			menu.classList.add(CTX);
			const rect = container.getBoundingClientRect();
			menu.style.left = `${e.clientX - rect.left}px`;
			menu.style.top = `${e.clientY - rect.top}px`;

			const items: { label: string; action: ()=> void }[] = [
				{ label: '+ Insert row above', action: () => this.apply(view, addRow(table, r <= 0 ? -1 : r - 2)) },
				{ label: '+ Insert row below', action: () => this.apply(view, addRow(table, r === 0 ? -1 : r - 1)) },
				{ label: '+ Insert column left', action: () => this.apply(view, addColumn(table, c - 1)) },
				{ label: '+ Insert column right', action: () => this.apply(view, addColumn(table, c)) },
			];
			if (r > 1) items.push({ label: '↑ Move row up', action: () => this.apply(view, swapRows(table, r - 1, r - 2)) });
			if (r > 0 && r < numBodyRows) items.push({ label: '↓ Move row down', action: () => this.apply(view, swapRows(table, r - 1, r)) });
			if (c > 0) items.push({ label: '← Move column left', action: () => this.apply(view, swapColumns(table, c, c - 1)) });
			if (c < numCols - 1) items.push({ label: '→ Move column right', action: () => this.apply(view, swapColumns(table, c, c + 1)) });
			if (r > 0) items.push({ label: '✕ Delete row', action: () => this.apply(view, deleteRow(table, r - 1)) });
			if (numCols > 1) items.push({ label: '✕ Delete column', action: () => this.apply(view, deleteColumn(table, c)) });

			for (const item of items) {
				const div = document.createElement('div');
				div.textContent = item.label;
				div.onmousedown = (ev) => {
					ev.preventDefault();
					ev.stopPropagation();
					menu.remove();
					item.action();
				};
				menu.appendChild(div);
			}
			container.appendChild(menu);
			const close = () => { menu.remove(); document.removeEventListener('mousedown', close); };
			setTimeout(() => document.addEventListener('mousedown', close), 0);
		};

		return container;
	}

	public ignoreEvent() { return true; }
}

// ===================== THEME =====================
const tableTheme = EditorView.theme({
	// Root — no border, no background, just positioning context
	[`& .${W}`]: {
		margin: '4px 0',
		position: 'relative',
		outline: 'none',
	},
	[`& .${W} table`]: {
		borderCollapse: 'collapse',
		tableLayout: 'auto',
	},

	// Cells
	[`& .${CELL}`]: {
		border: '1px solid var(--joplin-divider-color, #ddd)',
		padding: '6px 10px',
		minWidth: '50px',
		outline: 'none',
		verticalAlign: 'top',
		lineHeight: '1.5',
		fontSize: 'inherit',
		fontFamily: 'inherit',
		position: 'relative', // anchor for + buttons
	},
	[`& .${CELL}:focus`]: {
		backgroundColor: 'var(--joplin-selected-color, rgba(0,120,255,0.06))',
		boxShadow: 'inset 0 0 0 2px var(--joplin-color3, #0078ff)',
	},
	[`& .${HDR}`]: {
		fontWeight: 'bold',
		backgroundColor: 'var(--joplin-background-color3, #f0f0f0)',
	},

	// "+" button on right edge of cell (add column) — sits outside
	['& .cm-tw-ac']: {
		display: 'none',
		position: 'absolute',
		top: '50%',
		right: '-12px',
		transform: 'translateY(-50%)',
		width: '22px',
		height: '22px',
		lineHeight: '20px',
		fontSize: '16px',
		fontWeight: 'bold',
		border: '1px solid var(--joplin-divider-color, #ccc)',
		borderRadius: '50%',
		backgroundColor: 'var(--joplin-background-color, #fff)',
		color: 'var(--joplin-color3, #0078ff)',
		cursor: 'pointer',
		padding: '0',
		zIndex: '30',
		textAlign: 'center',
		'&:hover': {
			backgroundColor: 'var(--joplin-color3, #0078ff)',
			color: '#fff',
			borderColor: 'var(--joplin-color3, #0078ff)',
		},
	},
	[`& .${CELL}:hover > .cm-tw-ac`]: {
		display: 'block',
	},

	// "+" button on bottom edge of cell (add row) — sits outside
	['& .cm-tw-ar']: {
		display: 'none',
		position: 'absolute',
		bottom: '-12px',
		left: '50%',
		transform: 'translateX(-50%)',
		width: '22px',
		height: '22px',
		lineHeight: '20px',
		fontSize: '16px',
		fontWeight: 'bold',
		border: '1px solid var(--joplin-divider-color, #ccc)',
		borderRadius: '50%',
		backgroundColor: 'var(--joplin-background-color, #fff)',
		color: 'var(--joplin-color3, #0078ff)',
		cursor: 'pointer',
		padding: '0',
		zIndex: '30',
		textAlign: 'center',
		'&:hover': {
			backgroundColor: 'var(--joplin-color3, #0078ff)',
			color: '#fff',
			borderColor: 'var(--joplin-color3, #0078ff)',
		},
	},
	[`& .${CELL}:hover > .cm-tw-ar`]: {
		display: 'block',
	},

	// Context menu
	[`& .${CTX}`]: {
		position: 'absolute',
		backgroundColor: 'var(--joplin-background-color, #fff)',
		border: '1px solid var(--joplin-divider-color, #ccc)',
		borderRadius: '6px',
		boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
		zIndex: '100',
		minWidth: '190px',
		padding: '4px 0',
		fontSize: '13px',
		'& > div': {
			padding: '6px 14px',
			cursor: 'pointer',
			whiteSpace: 'nowrap',
			'&:hover': {
				backgroundColor: 'var(--joplin-background-color-hover3, #f0f0f0)',
			},
		},
	},
});

// ===================== EXTENSION =====================
const renderTables = [
	tableTheme,
	EditorView.domEventHandlers({
		mousedown: (event) => {
			if ((event.target as Element).closest(`.${W}`)) return true;
			return false;
		},
	}),
	makeBlockReplaceExtension({
		createDecoration: (node: SyntaxNodeRef, state: EditorState) => {
			if (node.name !== 'TableHeader') return null;
			const startLine = state.doc.lineAt(node.from);
			let endLine = startLine;
			for (let n = startLine.number + 1; n <= state.doc.lines; n++) {
				const l = state.doc.line(n);
				if (l.text.trim().startsWith('|') || l.text.includes('|')) {
					endLine = l;
				} else { break; }
			}
			const text = state.doc.sliceString(startLine.from, endLine.to);
			if (!parseTable(text)) return null;
			return new TableWidget(text, startLine.from, endLine.to);
		},
		getDecorationRange: (node: SyntaxNodeRef, state: EditorState) => {
			if (node.name !== 'TableHeader') return null;
			const startLine = state.doc.lineAt(node.from);
			let endLine = startLine;
			for (let n = startLine.number + 1; n <= state.doc.lines; n++) {
				const l = state.doc.line(n);
				if (l.text.trim().startsWith('|') || l.text.includes('|')) {
					endLine = l;
				} else { break; }
			}
			return [startLine.from, endLine.to];
		},
	}),
];

export default renderTables;
