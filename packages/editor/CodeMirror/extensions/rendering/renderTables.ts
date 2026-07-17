// Joplin-native interactive table editor widget for CodeMirror 6.
// Clean design: no grip columns, table stays flush-left.
// - Hover near row/column edges → "+" button appears via absolute positioning
// - Right-click any cell → context menu for insert/move/delete
// - Enter in last cell → adds new row
// - Tab/Shift+Tab → navigate cells

import { EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { SyntaxNodeRef } from '@lezer/common';
import { getSearchQuery, searchPanelOpen, SearchQuery } from '@codemirror/search';
import sanitizeHtml from '../../../ProseMirror/utils/sanitizeHtml';
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

// Cache for rendered table widget heights so CodeMirror can estimate
// heights correctly for scroll position and coordinate mapping.
const tableHeightCache = new Map<string, number>();

// Remembers the last-focused cell coordinates per table widget, keyed by
// the widget's document start position. Used to restore focus when the
// widget is rebuilt without an explicit refocus path — for example after
// an undo (Cmd+Z) reverts a cell edit. Cleared opportunistically when a
// widget at the same `from` mounts but the coordinates fall outside the
// new table's bounds.
const lastFocusedCellByFrom = new Map<number, { r: number; c: number }>();

// HTML-escape a string so captured cell text can be safely embedded into the
// HTML fragment we hand to DOMPurify. DOMPurify is the actual safety net for
// tag/attribute/URL filtering; this just keeps angle brackets and quotes in
// the input from being interpreted as markup at all.
const escapeHtml = (s: string): string => {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
};

// Render a small subset of inline markdown into DOM children appended to
// `parent`. Supports: **bold**, *italic* / _italic_, `code`, ~~strike~~,
// [label](url), and literal <br> as a line break. Escaped pipes (\|) are
// shown as plain |. The assembled HTML is run through DOMPurify before
// insertion, so unsafe URL schemes (javascript:, data:, ...) and any tags
// or attributes that slipped through the regex are removed.
export const renderInlineMarkdown = (parent: HTMLElement, text: string) => {
	// Normalise: escaped pipes → |, and split on literal <br> for soft breaks.
	const normalised = text.replace(/\\\|/g, '|');
	const segments = normalised.split(/<br\s*\/?>/i);
	const parts: string[] = [];
	for (let s = 0; s < segments.length; s++) {
		if (s > 0) parts.push('<br>');
		const segment = segments[s];
		// Single regex with alternatives, scanned left-to-right. Each branch
		// captures its inner content. Single * and _ emphasis use word-
		// boundary guards so identifiers like `foo_bar_baz` or `a*b*c` are
		// not rendered as emphasis.
		const re = /\*\*([^*]+)\*\*|__([^_]+)__|(?<![A-Za-z0-9])\*([^*]+)\*(?![A-Za-z0-9])|(?<![A-Za-z0-9])_([^_]+)_(?![A-Za-z0-9])|`([^`]+)`|~~([^~]+)~~|\[([^\]]+)\]\(([^)\s]+)\)/g;
		let lastIdx = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(segment)) !== null) {
			if (m.index > lastIdx) {
				parts.push(escapeHtml(segment.slice(lastIdx, m.index)));
			}
			if (m[1] !== undefined || m[2] !== undefined) {
				parts.push(`<strong>${escapeHtml((m[1] ?? m[2])!)}</strong>`);
			} else if (m[3] !== undefined || m[4] !== undefined) {
				parts.push(`<em>${escapeHtml((m[3] ?? m[4])!)}</em>`);
			} else if (m[5] !== undefined) {
				parts.push(`<code>${escapeHtml(m[5])}</code>`);
			} else if (m[6] !== undefined) {
				parts.push(`<del>${escapeHtml(m[6])}</del>`);
			} else {
				parts.push(`<a href="${escapeHtml(m[8]!)}">${escapeHtml(m[7]!)}</a>`);
			}
			lastIdx = m.index + m[0].length;
		}
		if (lastIdx < segment.length) {
			parts.push(escapeHtml(segment.slice(lastIdx)));
		}
	}
	parent.innerHTML = sanitizeHtml(parts.join(''));
};

class TableWidget extends WidgetType {
	public constructor(
		private tableText: string,
		private from: number,
		private to: number,
	) {
		super();
		this.cacheKey_ = `table_${from}_${to}_${tableText.length}`;
	}

	private cacheKey_: string;

	public eq(other: TableWidget) {
		return this.tableText === other.tableText
			&& this.from === other.from
			&& this.to === other.to;
	}

	public get estimatedHeight() {
		return tableHeightCache.get(this.cacheKey_) ?? -1;
	}

	// Find this widget's container after a rebuild by matching the document position.
	private findContainer(view: EditorView): HTMLElement | null {
		const containers = view.dom.querySelectorAll(`.${W}`);
		for (const c of containers) {
			try {
				const pos = view.posAtDOM(c);
				if (Math.abs(pos - this.from) < 3) return c as HTMLElement;
			} catch (_) { /* ignore */ }
		}
		// Fallback: return first container if only one table exists
		return containers.length === 1 ? containers[0] as HTMLElement : null;
	}

	// Save the horizontal scroll position of this widget's container before
	// a dispatch that will rebuild the widget, then restore it after rebuild.
	private saveAndRestoreScroll(view: EditorView) {
		const container = this.findContainer(view);
		const scrollLeft = container ? container.scrollLeft : 0;
		if (scrollLeft > 0) {
			requestAnimationFrame(() => {
				const newContainer = this.findContainer(view);
				if (newContainer) newContainer.scrollLeft = scrollLeft;
			});
		}
	}

	// Dispatch a structural table change (add/delete row/column).
	// A trailing newline is appended when needed to ensure a blank line
	// separates the table from subsequent text, preventing the parser
	// from absorbing later lines as extra table rows.
	// `userEvent` lets the caller tag the dispatch so CM's history can
	// group adjacent typing-style transactions into one undo step (the
	// live-sync flush uses 'input.type' for this reason).
	private apply(view: EditorView, newTable: Table | null, userEvent?: string) {
		if (!newTable) return;
		this.saveAndRestoreScroll(view);
		const newText = serializeTable(newTable);
		const doc = view.state.doc;
		const afterTable = this.to < doc.length ? doc.sliceString(this.to, Math.min(this.to + 2, doc.length)) : '';
		const needsBlankLine = !afterTable.startsWith('\n\n');
		const insert = needsBlankLine ? `${newText}\n` : newText;
		view.dispatch({
			changes: { from: this.from, to: this.to, insert },
			userEvent,
		});
	}

	public toDOM(view: EditorView) {
		// Use the owning document/window instead of globals so that
		// the widget works correctly in separate Electron windows.
		const doc = view.dom.ownerDocument;
		const win = doc.defaultView!;

		const table = parseTable(this.tableText);
		if (!table) {
			const pre = doc.createElement('pre');
			pre.textContent = this.tableText;
			return pre;
		}

		const numCols = table.header.cells.length;
		const numBodyRows = table.body.length;
		const totalRows = numBodyRows + 1;
		const allCells: HTMLElement[][] = [];

		const container = doc.createElement('div');
		container.classList.add(W);
		container.dataset.from = String(this.from);
		container.dataset.to = String(this.to);

		const tableEl = doc.createElement('table');

		// Flag to skip onblur sync when Tab/Enter handles it
		let skipBlurSync = false;

		// Track scrollbar interaction to prevent widget rebuild during drag
		let scrollbarDragging = false;
		let lastFocusedTextDiv: HTMLElement | null = null;

		// Debounced dispatch so the document source stays in sync with cell
		// edits — important so the preview pane reflects in-cell changes
		// (e.g. deleting an image) without waiting for blur or a structural
		// edit. Cleared whenever a structural apply() happens.
		let liveSyncTimer: number | null = null;
		const cancelLiveSync = () => {
			if (liveSyncTimer !== null) {
				win.clearTimeout(liveSyncTimer);
				liveSyncTimer = null;
			}
		};

		// Sync the focused cell's current text into the table model. Other
		// cells are kept in sync continuously via their oninput handler, so
		// this is just a final read of whichever cell is being edited right
		// now. Reading textContent of an unfocused cell would be wrong —
		// rendered cells have stripped markdown markers (** etc).
		const syncDirtyCells = () => {
			const active = doc.activeElement as HTMLElement | null;
			if (!active || !active.classList.contains('cm-tw-text')) return;
			if (!container.contains(active)) return;
			for (let ri = 0; ri < allCells.length; ri++) {
				for (let ci = 0; ci < allCells[ri].length; ci++) {
					const td = allCells[ri][ci].querySelector('.cm-tw-text') as HTMLElement;
					if (td !== active) continue;
					const v = (td.textContent || '').trim().replace(/\n/g, '<br>').replace(/\|/g, '\\|');
					const isH = ri === 0;
					if (isH) table.header.cells[ci].content = v;
					else if (ri - 1 < table.body.length) table.body[ri - 1].cells[ci].content = v;
				}
			}
		};

		// ---- Editable cell ----
		const mkCell = (text: string, r: number, c: number, isHdr: boolean) => {
			const el = doc.createElement(isHdr ? 'th' : 'td');
			el.classList.add(CELL);
			if (isHdr) el.classList.add(HDR);

			// Editable text lives in its own div — cell itself is NOT editable
			const textDiv = doc.createElement('div');
			textDiv.classList.add('cm-tw-text');
			textDiv.contentEditable = 'true';
			textDiv.spellcheck = false;
			// When not focused, show rendered inline markdown. On focus we
			// swap to the raw source so the user edits the markdown text.
			renderInlineMarkdown(textDiv, text);

			// Push this cell's current edit-mode text into the table model.
			// Called on every input so the model stays in sync even if a
			// rebuild is triggered by an external event (image paste, toolbar
			// command, etc.) before the deferred blur handler runs.
			// Not trimmed: an edge space the user just typed is real content
			// and must stay visible while editing (see #15918).
			const pushToModel = () => {
				const v = (textDiv.textContent || '')
					.replace(/\n/g, '<br>').replace(/\|/g, '\\|');
				if (isHdr) table.header.cells[c].content = v;
				else if (r - 1 < table.body.length) table.body[r - 1].cells[c].content = v;
			};

			// Caret position within the focused cell, as a plain offset into
			// textContent — robust across the rebuild that follows a dispatch.
			const caretOffset = (): number => {
				const sel = win.getSelection();
				if (!sel || sel.rangeCount === 0) return 0;
				const range = sel.getRangeAt(0);
				if (!textDiv.contains(range.endContainer)) return 0;
				const pre = range.cloneRange();
				pre.selectNodeContents(textDiv);
				pre.setEnd(range.endContainer, range.endOffset);
				return pre.toString().length;
			};

			const scheduleLiveSync = () => {
				pushToModel();
				cancelLiveSync();
				const offset = caretOffset();
				liveSyncTimer = win.setTimeout(() => {
					liveSyncTimer = null;
					if (!container.isConnected) return;
					const newText = serializeTable(table);
					if (newText === this.tableText) return;
					// The serialize/parse round-trip strips edge whitespace, so
					// keep the raw value to re-inject after the rebuild (#15918).
					const rawValue = textDiv.textContent || '';
					this.apply(view, table, 'input.type');
					// Rebuild discards this DOM — locate the same cell in the
					// new widget and restore focus + caret.
					requestAnimationFrame(() => {
						const newC = this.findContainer(view);
						const cells = newC?.querySelectorAll('.cm-tw-text');
						const idx = r * numCols + c;
						const target = cells && idx < cells.length ? cells[idx] as HTMLElement : null;
						if (!target) return;
						focus('TableWidget', target);
						// Restore the raw value onfocus trimmed.
						if (target.textContent !== rawValue) target.textContent = rawValue;
						// Caret restoration: put it `offset` characters into
						// the cell's text content.
						const sel = win.getSelection();
						if (!sel) return;
						const range = doc.createRange();
						let remaining = offset;
						const walker = doc.createTreeWalker(target, 4 /* SHOW_TEXT */);
						let placed = false;
						let node = walker.nextNode();
						while (node) {
							const len = node.nodeValue?.length ?? 0;
							if (remaining <= len) {
								range.setStart(node, remaining);
								range.collapse(true);
								placed = true;
								break;
							}
							remaining -= len;
							node = walker.nextNode();
						}
						if (!placed) {
							range.selectNodeContents(target);
							range.collapse(false);
						}
						sel.removeAllRanges();
						sel.addRange(range);
					});
				}, 500);
			};

			// Track IME composition so we don't rebuild the cell DOM
			// mid-composition — rebuilding would cancel the IME and drop
			// any in-progress candidates.
			let isComposing = false;
			textDiv.addEventListener('compositionstart', () => {
				isComposing = true;
				cancelLiveSync();
			});
			textDiv.addEventListener('compositionend', () => {
				isComposing = false;
				scheduleLiveSync();
			});

			textDiv.oninput = () => {
				if (isComposing) return;
				scheduleLiveSync();
			};
			// Some browsers do not fire `input` reliably when non-text nodes
			// (e.g. <img>) are removed via Backspace inside contentEditable.
			// A MutationObserver catches DOM-level changes that `input` misses.
			const mo = new win.MutationObserver(() => {
				if (isComposing) return;
				if (doc.activeElement === textDiv) scheduleLiveSync();
			});
			mo.observe(textDiv, { childList: true, characterData: true, subtree: true });

			// Sync CM cursor to this cell so toolbar commands work, and
			// swap the rendered DOM for the raw markdown source for editing.
			textDiv.onfocus = () => {
				lastFocusedTextDiv = textDiv;
				lastFocusedCellByFrom.set(this.from, { r, c });
				// Replace formatted DOM with raw text. Use the current model
				// entry rather than the stale `text` closure so that edits
				// to other cells in this table are reflected.
				const src = isHdr
					? table.header.cells[c]?.content ?? ''
					: table.body[r - 1]?.cells[c]?.content ?? '';
				textDiv.textContent = src.replace(/\\\|/g, '|');
				// Place caret at end so typing appends (matches prior behaviour
				// where cells started empty of selection).
				const sel = doc.defaultView!.getSelection();
				if (sel) {
					const range = doc.createRange();
					range.selectNodeContents(textDiv);
					range.collapse(false);
					sel.removeAllRanges();
					sel.addRange(range);
				}
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
				cancelLiveSync();
				// Defer sync so that a click on another cell in the same
				// table can register before the widget rebuilds.
				setTimeout(() => {
					// If the widget was rebuilt (e.g. by a "+" button or
					// context menu action), the old container is detached.
					// Do nothing — the rebuild already has the latest data.
					if (!container.isConnected) return;
					const v = (textDiv.textContent || '').trim();
					const orig = isHdr
						? table.header.cells[c]?.content
						: table.body[r - 1]?.cells[c]?.content;
					const changed = v !== orig;
					if (changed) {
						// If focus moved to another cell in this table, just
						// update the in-memory model — no dispatch/rebuild.
						// The markdown will sync on next structural edit or
						// when focus leaves the table entirely.
						if (scrollbarDragging || container.contains(doc.activeElement)) {
							const sanitised = v.replace(/\n/g, '<br>').replace(/\|/g, '\\|');
							if (isHdr) table.header.cells[c].content = sanitised;
							else if (r - 1 < table.body.length) table.body[r - 1].cells[c].content = sanitised;
						} else {
							// Focus left the table — sync to markdown and rebuild.
							// The rebuild discards this DOM, so no swap-back needed.
							this.apply(view, table);
							return;
						}
					}
					// Swap raw text back to rendered markdown view.
					const src = isHdr
						? table.header.cells[c]?.content ?? ''
						: table.body[r - 1]?.cells[c]?.content ?? '';
					textDiv.textContent = '';
					renderInlineMarkdown(textDiv, src);
				}, 80);
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

					skipBlurSync = true;
					cancelLiveSync();

					// Sync all dirty cells into the table model first
					syncDirtyCells();

					// Check if any cell content actually changed
					const newText = serializeTable(table);
					const isDirty = newText !== this.tableText;

					// Compute target cell index
					const flat = allCells.flat();
					const i = flat.indexOf(el);
					const nextIdx = e.shiftKey ? i - 1 : i + 1;

					if (nextIdx >= 0 && nextIdx < flat.length) {
						if (isDirty) {
							// Content changed — apply and refocus after rebuild
							this.apply(view, table);
							requestAnimationFrame(() => {
								const newC = this.findContainer(view);
								const cells = newC?.querySelectorAll('.cm-tw-text');
								if (cells && nextIdx < cells.length) {
									focus('TableWidget', cells[nextIdx] as HTMLElement);
								}
							});
						} else {
							// No changes — just move focus, no rebuild needed
							const targetText = flat[nextIdx].querySelector('.cm-tw-text') as HTMLElement;
							if (targetText) focus('TableWidget', targetText);
						}
					} else if (!e.shiftKey) {
						// Past last cell — add new row and focus its first cell
						const newTable = addRow(table, numBodyRows - 1);
						this.apply(view, newTable);
						const newRowIdx = totalRows * numCols;
						requestAnimationFrame(() => {
							const newC = this.findContainer(view);
							const cells = newC?.querySelectorAll('.cm-tw-text');
							if (cells && newRowIdx < cells.length) {
								focus('TableWidget', cells[newRowIdx] as HTMLElement);
							}
						});
					}
				} else if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					skipBlurSync = true;
					cancelLiveSync();
					syncDirtyCells();
					if (r === totalRows - 1 && c === numCols - 1) {
						this.apply(view, addRow(table, numBodyRows - 1));
					} else {
						// Only apply if content actually changed
						const enterText = serializeTable(table);
						if (enterText !== this.tableText) {
							this.apply(view, table);
						}
					}
				} else if (e.key === 'Escape') {
					e.preventDefault();
					blur('TableWidget', textDiv);
				}
			};

			el.appendChild(textDiv);
			// Clicking anywhere in the cell (including empty space in tall rows)
			// should activate the text editor
			el.onmousedown = (e) => {
				if (e.target === el) {
					e.preventDefault();
					focus('TableWidget', textDiv);
				}
			};
			el.oncontextmenu = (e) => showCtx(e, r, c);

			return el;
		};

		// ---- Hover "+" buttons (absolute positioned) ----
		// These are tiny buttons that sit on the right/bottom edge of each cell
		// and appear only on hover. No extra columns needed.

		const mkAddColBtn = (afterCol: number, anchorCell: HTMLElement) => {
			const wrapper = doc.createElement('span');
			wrapper.contentEditable = 'false';
			wrapper.classList.add('cm-tw-ac-wrap');
			const btn = doc.createElement('button');
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
					const newC = this.findContainer(view);
					const cells = newC?.querySelectorAll('.cm-tw-text');
					const targetIdx = afterCol + 1;
					if (cells && targetIdx < cells.length) {
						focus('TableWidget', cells[targetIdx] as HTMLElement);
					}
				});
			};
			wrapper.appendChild(btn);
			anchorCell.appendChild(wrapper);
		};

		const mkAddRowBtn = (afterBodyIdx: number, anchorCell: HTMLElement) => {
			const wrapper = doc.createElement('span');
			wrapper.contentEditable = 'false';
			wrapper.classList.add('cm-tw-ar-wrap');
			const btn = doc.createElement('button');
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
					const newC = this.findContainer(view);
					const cells = newC?.querySelectorAll('.cm-tw-text');
					if (cells && targetIdx < cells.length) {
						focus('TableWidget', cells[targetIdx] as HTMLElement);
					}
				});
			};
			wrapper.appendChild(btn);
			anchorCell.appendChild(wrapper);
		};

		// ---- Build header ----
		const thead = doc.createElement('thead');
		const headerTr = doc.createElement('tr');
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
		const tbody = doc.createElement('tbody');
		for (let r = 0; r < numBodyRows; r++) {
			const tr = doc.createElement('tr');
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

		// If this widget mounts at a position where a cell was focused just
		// before a rebuild (e.g. undo triggered the rebuild from outside),
		// restore focus to that cell. The map is cleared when focus leaves
		// the container (see focusout below), so a stale entry can only
		// exist while the user is actively editing this table — there is no
		// risk of stealing focus from unrelated work.
		const remembered = lastFocusedCellByFrom.get(this.from);
		if (remembered) {
			const { r: rr, c: cc } = remembered;
			const targetRow = allCells[rr];
			const targetCell = targetRow ? targetRow[cc] : undefined;
			const targetText = targetCell?.querySelector('.cm-tw-text') as HTMLElement | null;
			if (targetText) {
				requestAnimationFrame(() => {
					// Re-check the map and DOM before stealing focus — the
					// user may have clicked elsewhere between mount and the
					// next frame, in which case the entry is gone.
					if (!lastFocusedCellByFrom.has(this.from)) return;
					if (!targetText.isConnected) return;
					focus('TableWidget', targetText);
				});
			} else {
				// Coordinates no longer fit (row/column was removed) — drop the
				// stale entry.
				lastFocusedCellByFrom.delete(this.from);
			}
		}

		// Clear the remembered cell when focus leaves the table container,
		// so a later rebuild (e.g. from an unrelated document edit) does
		// not steal focus back. The deletion is deferred so a widget
		// rebuild — which detaches the old cell DOM and fires focusout for
		// that reason alone — does not lose the entry before the new
		// widget can consume it (this is what makes Cmd+Z restore focus).
		container.addEventListener('focusout', (e: FocusEvent) => {
			const next = e.relatedTarget as Node | null;
			if (next && container.contains(next)) return;
			const fromAtBlur = this.from;
			// Defer two frames so any rebuild-driven refocus (which is
			// itself scheduled via requestAnimationFrame from the new
			// widget's toDOM) has a chance to land before we decide that
			// focus genuinely left the table.
			requestAnimationFrame(() => requestAnimationFrame(() => {
				const newActive = doc.activeElement as HTMLElement | null;
				if (newActive?.classList.contains('cm-tw-text')) return;
				lastFocusedCellByFrom.delete(fromAtBlur);
			}));
		});

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

			const menu = doc.createElement('div');
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
			// Delete row: only for body rows (header row cannot be removed)
			if (r > 0) {
				items.push({
					label: '✕ Delete row',
					action: () => {
						syncDirtyCells();
						this.apply(view, deleteRow(table, r - 1));
					},
					hlRow: r,
				});
			}
			// Delete column: last column → delete entire table, otherwise delete that column
			items.push({
				label: '✕ Delete column',
				action: () => {
					syncDirtyCells();
					if (numCols <= 1) {
						view.dispatch({ changes: { from: this.from, to: this.to, insert: '' } });
					} else {
						this.apply(view, deleteColumn(table, c));
					}
				},
				hlCol: c,
			});

			for (const item of items) {
				const div = doc.createElement('div');
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
			// Clamp menu position so it stays within the viewport
			const menuRect = menu.getBoundingClientRect();
			const vw = win.innerWidth;
			const vh = win.innerHeight;
			if (menuRect.right > vw) menu.style.left = `${vw - menuRect.width - 4}px`;
			if (menuRect.bottom > vh) menu.style.top = `${vh - menuRect.height - 4}px`;
			const close = () => {
				clearHighlight();
				menu.remove();
				doc.removeEventListener('mousedown', close);
				win.removeEventListener('scroll', close, true);
			};
			setTimeout(() => {
				doc.addEventListener('mousedown', close);
				// Close menu on any scroll (capture phase catches scrollable parents)
				win.addEventListener('scroll', close, true);
			}, 0);
		};

		// Measure and cache the rendered height so CodeMirror can correctly
		// calculate scroll positions and coordinate mapping.
		requestAnimationFrame(() => {
			if (container.isConnected) {
				tableHeightCache.set(this.cacheKey_, container.offsetHeight);
			}
		});

		// Detect scrollbar/container clicks — prevent cell blur so the
		// widget is not rebuilt mid-scroll and the cell editor stays open.
		container.addEventListener('mousedown', (e) => {
			if (e.target === container) {
				e.preventDefault();
				scrollbarDragging = true;
				const onUp = () => {
					scrollbarDragging = false;
					doc.removeEventListener('mouseup', onUp);
					// If blur fired despite preventDefault, re-focus the cell
					if (lastFocusedTextDiv && container.isConnected &&
						doc.activeElement !== lastFocusedTextDiv) {
						focus('TableWidget', lastFocusedTextDiv);
					}
				};
				doc.addEventListener('mouseup', onUp);
			}
		});

		return container;
	}

	public ignoreEvent() { return true; }
}

// ===================== THEME =====================
const tableTheme = EditorView.theme({
	// Root — no border, no background, just positioning context
	[`& .${W}`]: {
		position: 'relative',
		display: 'block',
		width: '100%',
		maxWidth: '100%',
		overflowX: 'auto',
		contain: 'inline-size',
		outline: 'none',
		padding: '18px 14px',
		boxSizing: 'border-box',
	},
	[`& .${W} table`]: {
		borderCollapse: 'collapse',
		tableLayout: 'auto',
	},
	// Selection halo when the document selection covers the whole table.
	[`& .${W}.cm-tw-selected`]: {
		backgroundColor: 'var(--joplin-selected-color, rgba(0,120,255,0.18))',
		borderRadius: '4px',
	},
	// Search match highlight on a cell whose text matches the active query.
	['& .cm-tw-text.cm-tw-match']: {
		backgroundColor: 'var(--joplin-search-marker-background-color, rgba(255, 220, 0, 0.45))',
		color: 'var(--joplin-search-marker-color, inherit)',
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
		height: '100%',
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

// View plugin that tags table widget containers with a class when the
// document selection fully covers their range, so they visually pick up
// the selection halo (drag-select, Ctrl+A, etc.) like other text would.
const selectionHighlight = ViewPlugin.fromClass(class {
	public constructor(view: EditorView) { this.update_(view); }
	public update(update: ViewUpdate) {
		if (update.selectionSet || update.docChanged || update.viewportChanged) {
			this.update_(update.view);
		}
	}
	private update_(view: EditorView) {
		const sel = view.state.selection.main;
		const containers = view.dom.querySelectorAll<HTMLElement>(`.${W}`);
		for (const c of containers) {
			const from = Number(c.dataset.from);
			const to = Number(c.dataset.to);
			if (Number.isNaN(from) || Number.isNaN(to)) continue;
			const covered = sel.from <= from && sel.to >= to && sel.from !== sel.to;
			c.classList.toggle('cm-tw-selected', covered);
		}
	}
});

// View plugin that highlights table cells whose text contains the active
// search query, and scrolls the table's internal horizontal overflow so
// the cell containing the current match (the document selection) is
// visible. Block-replaced widgets normally swallow CM6's match
// highlights, so this brings basic search feedback to tables.
const searchHighlight = ViewPlugin.fromClass(class {
	private lastQuerySig_ = '';
	public constructor(view: EditorView) { this.update_(view, true); }
	public update(update: ViewUpdate) {
		const q = getSearchQuery(update.state);
		const open = searchPanelOpen(update.state);
		const sig = `${open ? '1' : '0'}|${q.search}|${q.caseSensitive}|${q.regexp}|${q.wholeWord}|${q.valid}`;
		const queryChanged = sig !== this.lastQuerySig_;
		if (queryChanged) this.lastQuerySig_ = sig;
		if (queryChanged || update.selectionSet || update.docChanged || update.viewportChanged) {
			this.update_(update.view, queryChanged);
		}
	}
	private buildMatcher(q: SearchQuery): ((s: string)=> boolean) | null {
		if (!q.valid || !q.search) return null;
		const flags = q.caseSensitive ? 'g' : 'gi';
		try {
			const pattern = q.regexp ? q.search : q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const wrapped = q.wholeWord ? `\\b(?:${pattern})\\b` : pattern;
			const re = new RegExp(wrapped, flags);
			return (s: string) => { re.lastIndex = 0; return re.test(s); };
		} catch (_) {
			return null;
		}
	}
	private update_(view: EditorView, scrollIfActive = false) {
		const q = getSearchQuery(view.state);
		// Treat search as inactive when the panel is closed, so closing the
		// panel clears the cell highlights even if the query string is
		// retained in state.
		const matcher = searchPanelOpen(view.state) ? this.buildMatcher(q) : null;
		const sel = view.state.selection.main;
		const containers = view.dom.querySelectorAll<HTMLElement>(`.${W}`);
		for (const container of containers) {
			const from = Number(container.dataset.from);
			const to = Number(container.dataset.to);
			const selInTable = !Number.isNaN(from) && sel.from >= from && sel.to <= to;
			let firstMatch: HTMLElement | null = null;
			const cells = container.querySelectorAll<HTMLElement>('.cm-tw-text');
			for (const cell of cells) {
				const text = cell.textContent ?? '';
				const isMatch = matcher ? matcher(text) : false;
				cell.classList.toggle('cm-tw-match', isMatch);
				if (isMatch && !firstMatch) firstMatch = cell;
			}
			// When search lands the document selection inside this table,
			// nudge the table's internal horizontal overflow so a matching
			// cell is at least partially visible.
			if (scrollIfActive && selInTable && firstMatch) {
				firstMatch.scrollIntoView({ block: 'nearest', inline: 'nearest' });
			}
		}
	}
});

// ===================== EXTENSION =====================
const renderTables = [
	tableTheme,
	selectionHighlight,
	searchHighlight,
	EditorView.domEventHandlers({
		mousedown: (event) => {
			if ((event.target as Element).closest(`.${W}`)) return true;
			return false;
		},
	}),
	makeBlockReplaceExtension({
		hideWhenContainsSelection: false,
		atomic: true,
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
