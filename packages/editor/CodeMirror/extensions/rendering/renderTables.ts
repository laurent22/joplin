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
import { getCellContentPosition } from '../../editorCommands/tableCommands';

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

	// Save the horizontal scroll position of this widget's container before
	// a dispatch that will rebuild the widget, then restore it after rebuild.
	private saveAndRestoreScroll(view: EditorView) {
		const container = view.dom.querySelector(`.${W}`) as HTMLElement | null;
		const scrollLeft = container ? container.scrollLeft : 0;
		if (scrollLeft > 0) {
			requestAnimationFrame(() => {
				const newContainer = view.dom.querySelector(`.${W}`) as HTMLElement | null;
				if (newContainer) newContainer.scrollLeft = scrollLeft;
			});
		}
	}

	// Dispatch a structural table change (add/delete row/column).
	// A trailing newline is appended when needed to ensure a blank line
	// separates the table from subsequent text, preventing the parser
	// from absorbing later lines as extra table rows.
	private apply(view: EditorView, newTable: Table | null) {
		if (!newTable) return;
		this.saveAndRestoreScroll(view);
		const newText = serializeTable(newTable);
		const doc = view.state.doc;
		const afterTable = this.to < doc.length ? doc.sliceString(this.to, Math.min(this.to + 2, doc.length)) : '';
		const needsBlankLine = !afterTable.startsWith('\n\n');
		const insert = needsBlankLine ? `${newText}\n` : newText;
		view.dispatch({
			changes: { from: this.from, to: this.to, insert },
		});
	}

	// Sync a single cell edit back to the markdown document.
	// Does NOT move the cursor so the user can continue working in the widget.
	private syncCell(view: EditorView, table: Table, row: number, col: number, text: string) {
		// Sanitise: newlines are illegal in markdown table cells; pipes must be escaped
		text = text.replace(/\n/g, '<br>').replace(/\|/g, '\\|');
		if (row === 0) {
			table.header.cells[col].content = text;
		} else {
			const b = row - 1;
			if (b < table.body.length && col < table.body[b].cells.length) {
				table.body[b].cells[col].content = text;
			}
		}
		this.saveAndRestoreScroll(view);
		const newText = serializeTable(table);
		const doc = view.state.doc;
		const afterTable = this.to < doc.length ? doc.sliceString(this.to, Math.min(this.to + 2, doc.length)) : '';
		const needsBlankLine = !afterTable.startsWith('\n\n');
		const insert = needsBlankLine ? `${newText}\n` : newText;
		view.dispatch({
			changes: { from: this.from, to: this.to, insert },
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

		// Flag to skip onblur sync when Tab/Enter handles it
		let skipBlurSync = false;

		// Sync all dirty cells back to the table model (without dispatching).
		// Must be called before any structural apply() so edits are not lost.
		const syncDirtyCells = () => {
			for (let ri = 0; ri < allCells.length; ri++) {
				for (let ci = 0; ci < allCells[ri].length; ci++) {
					const td = allCells[ri][ci].querySelector('.cm-tw-text') as HTMLElement;
					if (!td) continue;
					// Sanitise: newlines → <br>, pipes → escaped
					const v = (td.textContent || '').trim().replace(/\n/g, '<br>').replace(/\|/g, '\\|');
					const isH = ri === 0;
					const orig = isH
						? table.header.cells[ci]?.content
						: table.body[ri - 1]?.cells[ci]?.content;
					if (v !== orig) {
						if (isH) table.header.cells[ci].content = v;
						else if (ri - 1 < table.body.length) table.body[ri - 1].cells[ci].content = v;
					}
				}
			}
		};

		// ---- Editable cell ----
		const mkCell = (text: string, r: number, c: number, isHdr: boolean) => {
			const el = document.createElement(isHdr ? 'th' : 'td');
			el.classList.add(CELL);
			if (isHdr) el.classList.add(HDR);

			// Editable text lives in its own div — cell itself is NOT editable
			const textDiv = document.createElement('div');
			textDiv.classList.add('cm-tw-text');
			textDiv.contentEditable = 'true';
			textDiv.spellcheck = false;
			textDiv.textContent = text;

			// Sync CM cursor to this cell so toolbar commands work
			textDiv.onfocus = () => {
				const tableRange = {
					from: this.from,
					to: this.to,
					text: this.tableText,
				};
				const cellPos = getCellContentPosition(view.state, tableRange, r, c);
				if (cellPos !== null) {
					view.dispatch({
						selection: { anchor: cellPos, head: cellPos },
					});
				}
			};

			textDiv.onblur = () => {
				if (skipBlurSync) { skipBlurSync = false; return; }
				const v = (textDiv.textContent || '').trim();
				const orig = isHdr
					? table.header.cells[c]?.content
					: table.body[r - 1]?.cells[c]?.content;
				if (v !== orig) this.syncCell(view, table, r, c, v);
			};

			textDiv.onkeydown = (e) => {
				// Block newlines — not allowed in markdown table cells
				if (e.key === 'Enter' && e.shiftKey) {
					e.preventDefault();
					return;
				}
				if (e.key === 'Tab') {
					e.preventDefault();
					e.stopPropagation();

					// Sync current cell first if content changed
					const v = (textDiv.textContent || '').trim();
					const orig = isHdr
						? table.header.cells[c]?.content
						: table.body[r - 1]?.cells[c]?.content;
					const changed = v !== orig;
					if (changed) {
						skipBlurSync = true;
						this.syncCell(view, table, r, c, v);
					}

					// Compute target cell index
					const flat = allCells.flat();
					const i = flat.indexOf(el);
					const nextIdx = e.shiftKey ? i - 1 : i + 1;

					if (nextIdx >= 0 && nextIdx < flat.length) {
						if (changed) {
							// Widget rebuilds after syncCell — find new cell after rebuild
							requestAnimationFrame(() => {
								const cells = view.dom.querySelectorAll(`.${W} .cm-tw-text`);
								if (nextIdx < cells.length) {
									focus('TableWidget', cells[nextIdx] as HTMLElement);
								}
							});
						} else {
							const targetText = flat[nextIdx].querySelector('.cm-tw-text') as HTMLElement;
							if (targetText) focus('TableWidget', targetText);
						}
					} else if (!e.shiftKey) {
						// Past last cell — add new row and focus its first cell
						skipBlurSync = true;
						const cv = (textDiv.textContent || '').trim();
						const co = isHdr
							? table.header.cells[c]?.content
							: table.body[r - 1]?.cells[c]?.content;
						if (cv !== co) {
							if (isHdr) table.header.cells[c].content = cv;
							else table.body[r - 1].cells[c].content = cv;
						}
						syncDirtyCells();
						this.apply(view, addRow(table, numBodyRows - 1));
						const newRowIdx = totalRows * numCols;
						requestAnimationFrame(() => {
							const cells = view.dom.querySelectorAll(`.${W} .cm-tw-text`);
							if (newRowIdx < cells.length) {
								focus('TableWidget', cells[newRowIdx] as HTMLElement);
							}
						});
					}
				} else if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					skipBlurSync = true;
					// Sync current cell
					const v = (textDiv.textContent || '').trim();
					const orig = isHdr
						? table.header.cells[c]?.content
						: table.body[r - 1]?.cells[c]?.content;
					if (v !== orig) this.syncCell(view, table, r, c, v);
					if (r === totalRows - 1 && c === numCols - 1) {
						this.apply(view, addRow(table, numBodyRows - 1));
					}
				} else if (e.key === 'Escape') {
					e.preventDefault();
					blur('TableWidget', textDiv);
				}
			};

			el.appendChild(textDiv);
			el.oncontextmenu = (e) => showCtx(e, r, c);

			return el;
		};

		// ---- Hover "+" buttons (absolute positioned) ----
		// These are tiny buttons that sit on the right/bottom edge of each cell
		// and appear only on hover. No extra columns needed.

		const mkAddColBtn = (afterCol: number, anchorCell: HTMLElement) => {
			const wrapper = document.createElement('span');
			wrapper.contentEditable = 'false';
			wrapper.classList.add('cm-tw-ac-wrap');
			const btn = document.createElement('button');
			btn.classList.add('cm-tw-ac');
			btn.textContent = '+';
			btn.title = 'Add column to the right';
			btn.tabIndex = -1;
			btn.onmousedown = (e) => {
				if (e.button !== 0) return; // left-click only
				e.preventDefault();
				e.stopPropagation();
				syncDirtyCells();
				this.apply(view, addColumn(table, afterCol));
				// Focus the new column's header cell after rebuild
				requestAnimationFrame(() => {
					const cells = view.dom.querySelectorAll(`.${W} .cm-tw-text`);
					const targetIdx = afterCol + 1;
					if (targetIdx < cells.length) {
						focus('TableWidget', cells[targetIdx] as HTMLElement);
					}
				});
			};
			wrapper.appendChild(btn);
			anchorCell.appendChild(wrapper);
		};

		const mkAddRowBtn = (afterBodyIdx: number, anchorCell: HTMLElement) => {
			const wrapper = document.createElement('span');
			wrapper.contentEditable = 'false';
			wrapper.classList.add('cm-tw-ar-wrap');
			const btn = document.createElement('button');
			btn.classList.add('cm-tw-ar');
			btn.textContent = '+';
			btn.title = 'Add row below';
			btn.tabIndex = -1;
			btn.onmousedown = (e) => {
				if (e.button !== 0) return; // left-click only
				e.preventDefault();
				e.stopPropagation();
				syncDirtyCells();
				this.apply(view, addRow(table, afterBodyIdx));
				// Focus the first cell of the new row after rebuild
				const newNumCols = numCols;
				const targetIdx = (afterBodyIdx + 2) * newNumCols;
				requestAnimationFrame(() => {
					const cells = view.dom.querySelectorAll(`.${W} .cm-tw-text`);
					if (targetIdx < cells.length) {
						focus('TableWidget', cells[targetIdx] as HTMLElement);
					}
				});
			};
			wrapper.appendChild(btn);
			anchorCell.appendChild(wrapper);
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

		// ---- Highlight helpers ----
		const highlightRow = (rowIdx: number) => {
			if (rowIdx >= 0 && rowIdx < allCells.length) {
				for (const cell of allCells[rowIdx]) {
					cell.classList.add('cm-tw-hl');
				}
			}
		};
		const highlightCol = (colIdx: number) => {
			for (const row of allCells) {
				if (colIdx >= 0 && colIdx < row.length) {
					row[colIdx].classList.add('cm-tw-hl');
				}
			}
		};
		const clearHighlight = () => {
			for (const el of tableEl.querySelectorAll('.cm-tw-hl')) {
				el.classList.remove('cm-tw-hl');
			}
		};

		// ---- Context menu ----
		const showCtx = (e: MouseEvent, r: number, c: number) => {
			e.preventDefault();
			container.querySelector(`.${CTX}`)?.remove();
			clearHighlight();

			const menu = document.createElement('div');
			menu.classList.add(CTX);
			// Use viewport coordinates since the menu is position:fixed
			menu.style.left = `${e.clientX}px`;
			menu.style.top = `${e.clientY}px`;

			type MenuItem = { label: string; action: ()=> void; hlRow?: number; hlCol?: number };
			const items: MenuItem[] = [
				{ label: '+ Insert row above', action: () => { syncDirtyCells(); this.apply(view, addRow(table, r <= 0 ? -1 : r - 2)); } },
				{ label: '+ Insert row below', action: () => { syncDirtyCells(); this.apply(view, addRow(table, r === 0 ? -1 : r - 1)); } },
				{ label: '+ Insert column left', action: () => { syncDirtyCells(); this.apply(view, addColumn(table, c - 1)); } },
				{ label: '+ Insert column right', action: () => { syncDirtyCells(); this.apply(view, addColumn(table, c)); } },
			];
			if (r > 1) items.push({ label: '↑ Move row up', action: () => { syncDirtyCells(); this.apply(view, swapRows(table, r - 1, r - 2)); }, hlRow: r });
			if (r > 0 && r < numBodyRows) items.push({ label: '↓ Move row down', action: () => { syncDirtyCells(); this.apply(view, swapRows(table, r - 1, r)); }, hlRow: r });
			if (c > 0) items.push({ label: '← Move column left', action: () => { syncDirtyCells(); this.apply(view, swapColumns(table, c, c - 1)); }, hlCol: c });
			if (c < numCols - 1) items.push({ label: '→ Move column right', action: () => { syncDirtyCells(); this.apply(view, swapColumns(table, c, c + 1)); }, hlCol: c });
			// Delete row: for header (r===0) deletes entire table, for body rows deletes that row
			items.push({
				label: '✕ Delete row',
				action: () => {
					syncDirtyCells();
					if (r === 0) {
						view.dispatch({ changes: { from: this.from, to: this.to, insert: '' } });
					} else {
						this.apply(view, deleteRow(table, r - 1));
					}
				},
				hlRow: r,
			});
			if (numCols > 1) items.push({ label: '✕ Delete column', action: () => { syncDirtyCells(); this.apply(view, deleteColumn(table, c)); }, hlCol: c });

			for (const item of items) {
				const div = document.createElement('div');
				div.textContent = item.label;
				div.onmouseenter = () => {
					clearHighlight();
					if (item.hlRow !== undefined) highlightRow(item.hlRow);
					if (item.hlCol !== undefined) highlightCol(item.hlCol);
				};
				div.onmouseleave = () => clearHighlight();
				div.onmousedown = (ev) => {
					ev.preventDefault();
					ev.stopPropagation();
					clearHighlight();
					menu.remove();
					item.action();
				};
				menu.appendChild(div);
			}
			container.appendChild(menu);
			const close = () => { clearHighlight(); menu.remove(); document.removeEventListener('mousedown', close); };
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
		maxWidth: '100%',
		overflowX: 'auto',
		padding: '14px',
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
	// Editable text area inside cells
	['& .cm-tw-text']: {
		outline: 'none',
		minHeight: '1.2em',
		width: '100%',
		display: 'block',
		cursor: 'text',
		margin: '0',
		padding: '0',
		boxSizing: 'border-box',
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word',
	},
	['& .cm-tw-text:focus']: {
		outline: 'none',
	},
	// Highlight the entire cell when its text div is focused
	[`& .${CELL}:focus-within`]: {
		backgroundColor: 'var(--joplin-selected-color, rgba(0,120,255,0.06))',
		boxShadow: 'inset 0 0 0 2px var(--joplin-color3, #0078ff)',
	},
	[`& .${HDR}`]: {
		fontWeight: 'bold',
		backgroundColor: 'var(--joplin-background-color3, #f0f0f0)',
	},

	// Highlight for row/column on context menu hover
	['& .cm-tw-hl']: {
		backgroundColor: 'var(--joplin-selected-color, rgba(0,120,255,0.12)) !important',
	},

	// Wrapper for "+" buttons — non-editable island inside contentEditable cells
	['& .cm-tw-ac-wrap']: {
		position: 'absolute',
		top: '50%',
		right: '-12px',
		transform: 'translateY(-50%)',
		zIndex: '30',
		display: 'none',
	},
	[`& .${CELL}:hover > .cm-tw-ac-wrap`]: {
		display: 'block',
	},
	['& .cm-tw-ar-wrap']: {
		position: 'absolute',
		bottom: '-12px',
		left: '50%',
		transform: 'translateX(-50%)',
		zIndex: '30',
		display: 'none',
	},
	[`& .${CELL}:hover > .cm-tw-ar-wrap`]: {
		display: 'block',
	},
	// "+" button styles (shared)
	['& .cm-tw-ac, & .cm-tw-ar']: {
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
		textAlign: 'center',
		'&:hover': {
			backgroundColor: 'var(--joplin-color3, #0078ff)',
			color: '#fff',
			borderColor: 'var(--joplin-color3, #0078ff)',
		},
	},

	// Context menu
	[`& .${CTX}`]: {
		position: 'fixed',
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
		hideWhenContainsSelection: false,
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
