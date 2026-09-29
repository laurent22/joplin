/**
 * NotesTN Editor — ProseMirror entry point.
 *
 * Shared by the Mac (WKWebView) and Android (WebView) apps. Communicates with
 * native code via:
 *   JS → Swift:   window.webkit.messageHandlers.editorMessage.postMessage(msg)
 *   JS → Kotlin:  window.AndroidBridge.postMessage(JSON.stringify(msg))
 *   Native → JS:  window.NativeEditor.setContent(html) / execCommand(cmd, value) etc.
 */

import { EditorState, NodeSelection, Plugin, PluginKey, Selection, Transaction } from 'prosemirror-state';
import { EditorView, DirectEditorProps, Decoration, DecorationSet } from 'prosemirror-view';
import { DOMParser as PMDOMParser, DOMSerializer, Fragment } from 'prosemirror-model';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, chainCommands, exitCode, newlineInCode } from 'prosemirror-commands';
import { splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { tableEditing, TableMap, cellAround } from 'prosemirror-tables';
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis, InputRule } from 'prosemirror-inputrules';

import schema from './schema';
import { commands, toggleCheckboxAtPos } from './commands';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelectionState {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strikethrough: boolean;
  highlight: boolean;
  inCode: boolean;       // cursor is inside code_block
  inBlockquote: boolean;
  inBulletList: boolean;
  inOrderedList: boolean;
  inTaskList: boolean;
  inCheckedTask: boolean;
  inTable: boolean;      // cursor is in a table — drives the toolbar's table menu
  headingLevel: number;  // 0 = not a heading
  hasLink: boolean;
  linkHref: string | null;
}

interface NativeMessage {
  // openMaps carries a plain address string in `url`; native shows a Google Maps /
  // Waze chooser and opens the chosen app. Everything else routes through openUrl
  // with a fully-formed scheme URL (https:, mailto:, tel:).
  // findResult reports in-note find progress to the native find bar: `count` total
  // matches and `index` the 1-based current match (0 when there are none).
  // openAttachment carries a resource id in `resourceId`; native resolves it to the
  // local file and opens it in the platform's own previewer.
  type: 'contentChanged' | 'selectionChanged' | 'imageRequested' | 'ready' | 'log' | 'openUrl' | 'openMaps' | 'focusChanged' | 'findResult' | 'openAttachment' | 'editAttachment';
  title?: string;
  html?: string;
  selectionState?: SelectionState;
  message?: string;
  url?: string;
  focused?: boolean;
  count?: number;
  index?: number;
  resourceId?: string;
}

// ── Swift bridge ──────────────────────────────────────────────────────────────

function postToNative(msg: NativeMessage) {
  try {
    window.webkit?.messageHandlers?.['editorMessage']?.postMessage(msg);
  } catch (_) {
    // Not running in WKWebView — ignore
  }
  try {
    // Android's addJavascriptInterface only accepts primitive/String args, so
    // the message is JSON-encoded here and decoded on the Kotlin side.
    window.AndroidBridge?.postMessage(JSON.stringify(msg));
  } catch (_) {
    // Not running in Android WebView — ignore
  }
}

function log(message: string) {
  postToNative({ type: 'log', message });
}

// ── Input rules (Markdown shortcuts) ─────────────────────────────────────────

function buildInputRules() {
  const {
    paragraph, heading, code_block, blockquote,
    bullet_list, ordered_list, list_item, task_list, task_list_item,
  } = schema.nodes;

  return inputRules({
    rules: [
      // # → Heading
      textblockTypeInputRule(/^(#{1,6})\s$/, heading, match => ({
        level: match[1].length,
      })),
      // ``` → code block
      textblockTypeInputRule(/^```$/, code_block),
      // > → blockquote
      wrappingInputRule(/^\s*>\s$/, blockquote),
      // - or * → bullet list
      wrappingInputRule(/^\s*([-*])\s$/, bullet_list),
      // 1. → ordered list
      wrappingInputRule(/^(\d+)\.\s$/, ordered_list, match => ({
        order: +match[1],
      })),
      // - [ ] → task list
      new InputRule(/^\s*-\s\[\s?\]\s$/, (state, _match, start, end) => {
        const tr = state.tr.delete(start, end);
        const taskItem = task_list_item.create(
          { checked: false },
          schema.nodes.paragraph.create()
        );
        const taskListNode = task_list.create(null, taskItem);
        return tr.replaceSelectionWith(taskListNode);
      }),
      // Smart typography
      ...smartQuotes,
      ellipsis,
      emDash,
    ],
  });
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Data detectors (auto-link URLs / emails / phones / addresses) ──────────────
//
// Detects link-like spans in plain text and renders them as yellow-underlined
// "active links" via ProseMirror decorations (see the auto-link plugin in
// createEditor). Detection is presentational only — it never alters the stored
// document/Markdown. On tap, native opens the right app (browser / mail / phone /
// maps). Address detection is a best-effort heuristic (street-type keywords near a
// number); phone detection is deliberately strict, see isPhoneNumber.

type DetectedLinkType = 'url' | 'email' | 'phone' | 'address';
interface DetectedLink {
  start: number;   // offset within the text
  end: number;
  type: DetectedLinkType;
  href: string;    // scheme URL for url/email/phone; raw address string for address
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>()]+/gi;
// Candidate phone runs. This only finds digit-ish spans; whether one is really a
// phone number is decided by phoneHref below.
const PHONE_RE = /(?:\+|00)?\d[\d\s().-]{5,}\d/g;
// Street-type keywords (Portuguese + English), used by the address heuristic.
const STREET = "(?:Rua|R\\.|Avenida|Av\\.?|Travessa|Tv\\.?|Largo|Pra[çc]a|Estrada|Alameda|Beco|Street|St\\.?|Avenue|Ave\\.?|Road|Rd\\.?|Boulevard|Blvd\\.?|Lane|Ln\\.?|Drive|Dr\\.?|Way|Court|Ct\\.?|Place|Pl\\.?)";
const ADDRESS_RE = new RegExp(
  // "123 Some Name Street" (number, up to 4 words, then a street type) ...
  `(?:\\b\\d{1,5}\\s+(?:[A-Za-zÀ-ÿ.'ºª]+\\s+){0,4}${STREET}\\b)` +
  // ... or "Rua da Prata 12" (street type, words, then a number)
  `|(?:\\b${STREET}\\s+[A-Za-zÀ-ÿ0-9.'ºª ]*?\\d{1,5}(?:\\s*[-–]\\s*\\d{1,4})?)`,
  'gi'
);

// Assigned country calling codes (ITU-T E.164). A "+" or "00" number is only linked
// if what follows is one of these, so "+999 123 456" stays plain text. Matched
// longest-first, since codes are 1 to 3 digits and every 1- and 2-digit code is a
// prefix of longer ones.
const COUNTRY_CODES = new Set([
  '1', '7',
  '20', '27', '30', '31', '32', '33', '34', '36', '39',
  '40', '41', '43', '44', '45', '46', '47', '48', '49',
  '51', '52', '53', '54', '55', '56', '57', '58',
  '60', '61', '62', '63', '64', '65', '66',
  '81', '82', '84', '86',
  '90', '91', '92', '93', '94', '95', '98',
  '211', '212', '213', '216', '218',
  '220', '221', '222', '223', '224', '225', '226', '227', '228', '229',
  '230', '231', '232', '233', '234', '235', '236', '237', '238', '239',
  '240', '241', '242', '243', '244', '245', '246', '247', '248', '249',
  '250', '251', '252', '253', '254', '255', '256', '257', '258',
  '260', '261', '262', '263', '264', '265', '266', '267', '268', '269',
  '290', '291', '297', '298', '299',
  '350', '351', '352', '353', '354', '355', '356', '357', '358', '359',
  '370', '371', '372', '373', '374', '375', '376', '377', '378', '379',
  '380', '381', '382', '383', '385', '386', '387', '389',
  '420', '421', '423',
  '500', '501', '502', '503', '504', '505', '506', '507', '508', '509',
  '590', '591', '592', '593', '594', '595', '596', '597', '598', '599',
  '670', '672', '673', '674', '675', '676', '677', '678', '679',
  '680', '681', '682', '683', '685', '686', '687', '688', '689',
  '690', '691', '692',
  '800', '808', '850', '852', '853', '855', '856', '870', '878',
  '880', '881', '882', '883', '886', '888',
  '960', '961', '962', '963', '964', '965', '966', '967', '968',
  '970', '971', '972', '973', '974', '975', '976', '977', '979',
  '992', '993', '994', '995', '996', '998',
]);

// Portuguese dialling codes a bare (no country code) number may start with:
// geographic 21/22, and mobile 91/92/93/96.
const PT_PREFIXES_2 = new Set(['21', '22', '91', '92', '93', '96']);
// The three-digit geographic codes. Ranges Anacom hasn't assigned are absent on
// purpose — that's what stops a 9-digit NIF, order number or account number from
// being dialled.
const PT_PREFIXES_3 = new Set([
  '231', '232', '233', '234', '238', '239',
  '241', '242', '243', '244', '245', '249',
  '251', '252', '253', '254', '255', '258', '259',
  '261', '262', '263', '265', '266', '268', '269',
  '271', '272', '273', '274', '275', '276', '277', '278', '279',
  '281', '282', '283', '289',
  '291', '292', '295', '296',
]);

/** The tel: URL for a candidate run, or null if it isn't a phone number.
 *
 * Two ways to qualify. With a country code (a leading "+", or "00" as the rest of
 * Europe writes it) the code has to be a real one and the whole number 8 to 15
 * digits, E.164's own maximum. Without one it has to be a Portuguese number: exactly
 * nine digits, starting with an assigned dialling code.
 *
 * Bare digits used to be linked on length alone, which turned tax numbers, invoice
 * references and anything else nine digits long into phone numbers. */
function phoneHref(raw: string): string | null {
  const trimmed = raw.trim();
  const digits = (trimmed.match(/\d/g) || []).join('');

  const withCountryCode = trimmed.startsWith('+')
    ? digits
    : digits.startsWith('00')
      ? digits.slice(2)
      : null;

  if (withCountryCode !== null) {
    if (withCountryCode.length < 8 || withCountryCode.length > 15) return null;
    const known = [3, 2, 1].some((n) => COUNTRY_CODES.has(withCountryCode.slice(0, n)));
    return known ? `tel:+${withCountryCode}` : null;
  }

  if (digits.length !== 9) return null;
  if (!PT_PREFIXES_3.has(digits.slice(0, 3)) && !PT_PREFIXES_2.has(digits.slice(0, 2))) return null;
  return `tel:${digits}`;
}

function trimTrailingPunct(s: string): string {
  return s.replace(/[.,;:!?)\]}'"]+$/, '');
}

/** Non-overlapping detected links in [text], resolved by priority
 * (email > url > phone > address) then by earliest start / longest match. */
function detectLinks(text: string): DetectedLink[] {
  const all: DetectedLink[] = [];

  const scan = (
    re: RegExp,
    build: (raw: string) => { value: string; href: string } | null,
  ) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const built = build(m[0]);
      if (!built) continue;
      const start = m.index;
      all.push({ start, end: start + built.value.length, type: typeForRe(re), href: built.href });
    }
  };
  const typeForRe = (re: RegExp): DetectedLinkType =>
    re === EMAIL_RE ? 'email' : re === URL_RE ? 'url' : re === PHONE_RE ? 'phone' : 'address';

  scan(EMAIL_RE, (raw) => ({ value: raw, href: `mailto:${raw}` }));
  scan(URL_RE, (raw) => {
    const value = trimTrailingPunct(raw);
    const href = /^www\./i.test(value) ? `https://${value}` : value;
    return { value, href };
  });
  scan(PHONE_RE, (raw) => {
    const href = phoneHref(raw);
    return href ? { value: raw, href } : null;
  });
  scan(ADDRESS_RE, (raw) => {
    const value = raw.trim();
    if (value.length < 6) return null;
    return { value, href: value }; // raw address; native builds the maps URL
  });

  const priority: Record<DetectedLinkType, number> = { email: 0, url: 1, phone: 2, address: 3 };
  all.sort(
    (a, b) => a.start - b.start || priority[a.type] - priority[b.type] || (b.end - b.start) - (a.end - a.start),
  );
  const result: DetectedLink[] = [];
  let lastEnd = -1;
  for (const link of all) {
    if (link.start >= lastEnd) {
      result.push(link);
      lastEnd = link.end;
    }
  }
  return result;
}

// Plugin state holds the current auto-link DecorationSet; recomputed only when the
// document changes (not on every selection move).
const autoLinkKey = new PluginKey<DecorationSet>('autoLink');

function buildAutoLinkDecos(doc: any): DecorationSet {
  const decos: Decoration[] = [];
  doc.descendants((node: any, pos: number) => {
    // Never auto-link inside a code block — a snippet's URLs stay plain text.
    // Returning false skips descending into the block's text children entirely.
    if (node.type === schema.nodes.code_block) return false;
    if (!node.isText || !node.text) return;
    // Skip text that's already an explicit link (<a> via the link mark) — those are
    // handled by the existing link click handler and shouldn't be double-detected.
    if (node.marks.some((m: any) => m.type === schema.marks.link)) return;
    // Skip inline code (`...`) too — code spans should stay plain text, not links.
    if (node.marks.some((m: any) => m.type === schema.marks.code)) return;
    for (const link of detectLinks(node.text)) {
      decos.push(
        Decoration.inline(pos + link.start, pos + link.end, {
          class: `pm-autolink pm-autolink-${link.type}`,
          'data-al-type': link.type,
          'data-al-href': link.href,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decos);
}

// ── Column resizing (percentage-based, mouse + touch) ──────────────────────────
//
// Replaces prosemirror-tables' own columnResizing, which is pixel-based, mouse-only,
// and not zero-sum: it wrote an absolute width for the dragged column and an inline
// min-width on the table, so dragging a middle column pushed the table past the
// window (horizontal overflow), and touch drags did nothing at all.
//
// This version:
//   * stores widths as PERCENTAGES of the table (they always sum to 100), so a table
//     can never be wider than the note and the layout is resolution-independent;
//   * is zero-sum with the immediate next column — dragging a boundary trades width
//     between exactly those two columns, leaving the rest untouched;
//   * enforces a 10% minimum per column;
//   * handles mouse AND touch with the same math.

const COL_MIN_PERCENT = 10;      // a column can never be squeezed below this
// How close to a column border the pointer must be to grab it. Deliberately tight
// for the mouse: anything wider starts swallowing ordinary clicks meant to put the
// cursor in a cell. Touch gets more room because a fingertip is imprecise.
const EDGE_ZONE_MOUSE = 4;
const EDGE_ZONE_TOUCH = 14;
const TOUCH_DRAG_THRESHOLD = 4;  // px of movement before a touch counts as a drag

interface ColResizeState {
  activeCell: number;        // cell whose right edge is under the pointer (-1 = none)
  preview: number[] | null;  // in-flight drag widths, rendered instead of the stored ones
}

const colResizeKey = new PluginKey<ColResizeState>('percentColumnResizing');

/// Column widths of a table as percentages summing to 100. Missing values are filled
/// with the average and everything is normalized — which also transparently converts
/// tables saved earlier with pixel widths into percentages.
function columnPercents(table: any): number[] {
  const map = TableMap.get(table);
  const widths: number[] = new Array(map.width).fill(0);
  for (let col = 0; col < map.width; col++) {
    for (let row = 0; row < map.height; row++) {
      const pos = map.map[row * map.width + col];
      const cell = table.nodeAt(pos);
      if (!cell) continue;
      const cw = cell.attrs.colwidth;
      if (!cw) continue;
      const index = cell.attrs.colspan === 1 ? 0 : col - map.colCount(pos);
      if (cw[index]) { widths[col] = cw[index]; break; }
    }
  }
  const known = widths.filter((w) => w > 0);
  if (!known.length) return new Array(map.width).fill(100 / map.width);
  const average = known.reduce((a, b) => a + b, 0) / known.length;
  for (let i = 0; i < widths.length; i++) if (!widths[i]) widths[i] = average;
  const total = widths.reduce((a, b) => a + b, 0);
  return widths.map((w) => (w / total) * 100);
}

/// Walks up from an event target to the <td>/<th> containing it, or null.
function domCellAround(target: EventTarget | null): HTMLElement | null {
  let el = target as HTMLElement | null;
  while (el && el.nodeName !== 'TD' && el.nodeName !== 'TH') {
    el = el.classList?.contains('ProseMirror') ? null : (el.parentNode as HTMLElement | null);
  }
  return el;
}

/// The cell whose RIGHT edge is being grabbed, or -1 if the pointer isn't within
/// [zone] px of a column border.
///
/// The bounding-rect test is what keeps this from claiming ordinary clicks: without
/// it, a click anywhere inside a cell resolved to that cell and started a resize, so
/// the cursor could never be placed in a table. Only the few pixels either side of a
/// border count. A pointer near a cell's LEFT border is grabbing the previous
/// column's right edge, so that maps back one column. The last column is excluded —
/// the table is pinned to 100% width, so its right edge has nothing to trade against.
function edgeCellAt(
  view: EditorView,
  target: EventTarget | null,
  clientX: number,
  clientY: number,
  zone: number,
): number {
  const cellDom = domCellAround(target);
  if (!cellDom) return -1;
  const rect = cellDom.getBoundingClientRect();
  let side: 'left' | 'right';
  if (rect.right - clientX <= zone) side = 'right';
  else if (clientX - rect.left <= zone) side = 'left';
  else return -1;

  // Resolve a position safely inside the cell on the relevant side.
  const found = view.posAtCoords({
    left: side === 'right' ? clientX - zone : clientX + zone,
    top: clientY,
  });
  if (!found) return -1;
  const $cell = cellAround(view.state.doc.resolve(found.pos));
  if (!$cell) return -1;
  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const start = $cell.start(-1);

  let cellPos = $cell.pos;
  if (side === 'left') {
    // Step back to the cell before this one in the same row.
    const index = map.map.indexOf($cell.pos - start);
    if (index < 0 || index % map.width === 0) return -1; // first column: no border to drag
    cellPos = start + map.map[index - 1];
  }

  const col = columnIndexInTable(table, start, cellPos);
  if (col < 0 || col >= map.width - 1) return -1;
  return cellPos;
}

/// Column index (0-based) of the cell at [cellPos] within its table.
function columnIndexOf(view: EditorView, cellPos: number): number {
  const $cell = view.state.doc.resolve(cellPos);
  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  return map.colCount($cell.pos - start) + $cell.nodeAfter!.attrs.colspan - 1;
}

/// Column index of the cell at document position [cellDocPos] inside [table], or -1.
function columnIndexInTable(table: any, tableContentStart: number, cellDocPos: number): number {
  const map = TableMap.get(table);
  const index = map.map.indexOf(cellDocPos - tableContentStart);
  return index < 0 ? -1 : index % map.width;
}

/// Commits column percentages to every cell, in one transaction.
function commitPercents(view: EditorView, cellPos: number, percents: number[]) {
  const $cell = view.state.doc.resolve(cellPos);
  const table = $cell.node(-1);
  const map = TableMap.get(table);
  const start = $cell.start(-1);
  const tr = view.state.tr;
  for (let col = 0; col < map.width; col++) {
    // Integers only: prosemirror-tables' cell parser accepts data-colwidth values
    // matching /^\d+(,\d+)*$/, so a decimal like "33.33" would be silently dropped
    // when the note is re-parsed. Rounding costs nothing here because columnPercents
    // re-normalizes on read (33/33/33 renders as 33.33% each).
    const value = Math.max(1, Math.round(percents[col]));
    for (let row = 0; row < map.height; row++) {
      const mapIndex = row * map.width + col;
      // Skip a cell already handled by the row above (rowspan).
      if (row && map.map[mapIndex] === map.map[mapIndex - map.width]) continue;
      const pos = map.map[mapIndex];
      const attrs = table.nodeAt(pos)!.attrs;
      const index = attrs.colspan === 1 ? 0 : col - map.colCount(pos);
      const colwidth = attrs.colwidth ? attrs.colwidth.slice() : Array(attrs.colspan).fill(0);
      if (colwidth[index] === value) continue;
      colwidth[index] = value;
      tr.setNodeMarkup(start + pos, null, { ...attrs, colwidth });
    }
  }
  if (tr.docChanged) view.dispatch(tr);
}

/// Applies a drag: trades width between the dragged column and the next one only.
function percentsAfterDrag(startPercents: number[], col: number, deltaPercent: number): number[] {
  const next = col + 1;
  const pair = startPercents[col] + startPercents[next];
  const lower = COL_MIN_PERCENT;
  const upper = pair - COL_MIN_PERCENT;
  const dragged = Math.min(Math.max(startPercents[col] + deltaPercent, lower), upper);
  const result = startPercents.slice();
  result[col] = dragged;
  result[next] = pair - dragged;
  return result;
}

/// Renders column widths and the resize handle.
///
/// Widths come from [preview] while a drag is in flight and from the document
/// otherwise — driving the live preview through plugin state (rather than poking the
/// DOM directly) is what keeps the columns moving smoothly under the pointer: any
/// transaction re-runs decorations, which would immediately overwrite direct DOM
/// edits with the stored widths.
///
/// The handle class goes on EVERY cell of the active column, so the highlight is one
/// continuous line down the full height of the table, not just the hovered row.
function columnWidthDecorations(state: EditorState, st: ColResizeState): DecorationSet {
  const decos: Decoration[] = [];
  state.doc.descendants((node: any, pos: number) => {
    if (node.type !== schema.nodes.table) return true;
    const map = TableMap.get(node);
    const start = pos + 1;
    const isActiveTable = st.activeCell > pos && st.activeCell < pos + node.nodeSize;
    const percents = isActiveTable && st.preview ? st.preview : columnPercents(node);

    // Widths: the first row governs each column under table-layout: fixed.
    for (let col = 0; col < map.width; col++) {
      const cellPos = map.map[col];
      const cell = node.nodeAt(cellPos);
      if (!cell || cell.attrs.colspan !== 1) continue;
      decos.push(
        Decoration.node(start + cellPos, start + cellPos + cell.nodeSize, {
          style: `width: ${(percents[col] ?? 100 / map.width).toFixed(2)}%`,
        }),
      );
    }

    // Handle: highlight the whole active column.
    if (isActiveTable) {
      const activeCol = columnIndexInTable(node, start, st.activeCell);
      if (activeCol >= 0) {
        for (let row = 0; row < map.height; row++) {
          const cellPos = map.map[row * map.width + activeCol];
          const cell = node.nodeAt(cellPos);
          if (!cell) continue;
          decos.push(
            Decoration.node(start + cellPos, start + cellPos + cell.nodeSize, {
              class: 'pm-col-resize-active',
            }),
          );
        }
      }
    }
    return false;
  });
  return DecorationSet.create(state.doc, decos);
}

function percentColumnResizing() {
  // Transient drag bookkeeping — one document transaction, committed on release.
  let dragCell = -1;
  let dragCol = 0;
  let dragging = false;
  let startX = 0;
  let startPercents: number[] = [];
  let tableWidthPx = 1;

  const reset = () => { dragCell = -1; dragging = false; };

  /// Shared by mouse and touch: begins tracking a potential drag at the cell edge.
  const beginDrag = (view: EditorView, cellPos: number, clientX: number): boolean => {
    const $cell = view.state.doc.resolve(cellPos);
    const table = $cell.node(-1);
    if (!table || TableMap.get(table).width < 2) return false;
    let dom: any = view.nodeDOM($cell.start(-1) + TableMap.get(table).map[0]);
    while (dom && dom.nodeName !== 'TABLE') dom = dom.parentNode;
    tableWidthPx = dom?.offsetWidth || view.dom.clientWidth || 1;
    dragCell = cellPos;
    dragCol = columnIndexOf(view, cellPos);
    startPercents = columnPercents(table);
    startX = clientX;
    return true;
  };

  const applyDrag = (view: EditorView, clientX: number): number[] => {
    const deltaPercent = ((clientX - startX) / tableWidthPx) * 100;
    return percentsAfterDrag(startPercents, dragCol, deltaPercent);
  };

  const setActive = (view: EditorView, cellPos: number) => {
    const current = colResizeKey.getState(view.state)?.activeCell ?? -1;
    if (current !== cellPos) {
      view.dispatch(view.state.tr.setMeta(colResizeKey, { activeCell: cellPos }));
    }
  };

  /// Pushes in-flight drag widths into plugin state so the decorations redraw the
  /// columns under the pointer. Meta-only, so it never touches the document (no
  /// save, no undo entry) — the real widths are written once, on release.
  const setPreview = (view: EditorView, percents: number[] | null) => {
    view.dispatch(view.state.tr.setMeta(colResizeKey, { preview: percents }));
  };

  return new Plugin<ColResizeState>({
    key: colResizeKey,
    state: {
      init: () => ({ activeCell: -1, preview: null }),
      apply: (tr, prev) => {
        const meta = tr.getMeta(colResizeKey) as Partial<ColResizeState> | undefined;
        let next = prev;
        if (meta) {
          next = {
            activeCell: meta.activeCell !== undefined ? meta.activeCell : prev.activeCell,
            preview: meta.preview !== undefined ? meta.preview : prev.preview,
          };
        }
        // Keep the highlighted cell's position valid across edits.
        if (tr.docChanged && next.activeCell > -1) {
          next = { ...next, activeCell: tr.mapping.map(next.activeCell) };
        }
        return next;
      },
    },
    props: {
      // The resize cursor goes on the editor ROOT, not on the highlighted cells.
      // Approaching a border from the right, the pointer sits in the NEXT cell while
      // the column being resized (and so the highlight) is the previous one — a
      // cursor set on those cells would never appear under the pointer, which is why
      // the cursor only changed when approaching left-to-right. Setting it on the
      // root makes it correct from either direction, and is what prosemirror-tables
      // does with its own `resize-cursor` class.
      //
      // While actually dragging, a second class suppresses text selection — that's
      // what stops Android's text magnifier (loupe) popping up over the drag.
      attributes: (state): { [name: string]: string } => {
        const st = colResizeKey.getState(state);
        if (!st || st.activeCell < 0) return {};
        return {
          class: st.preview ? 'pm-col-resize-cursor pm-col-resizing' : 'pm-col-resize-cursor',
        };
      },
      decorations(state) {
        const pluginState = colResizeKey.getState(state) ?? { activeCell: -1, preview: null };
        return columnWidthDecorations(state, pluginState);
      },
      handleDOMEvents: {
        // ── Mouse ──
        mousemove(view, event) {
          if (dragging) return false;
          const mouse = event as MouseEvent;
          const cellPos = view.editable
            ? edgeCellAt(view, mouse.target, mouse.clientX, mouse.clientY, EDGE_ZONE_MOUSE)
            : -1;
          setActive(view, cellPos);
          return false;
        },
        mouseleave(view) {
          if (!dragging) setActive(view, -1);
          return false;
        },
        mousedown(view, event) {
          if (!view.editable) return false;
          const mouse = event as MouseEvent;
          const cellPos = edgeCellAt(view, mouse.target, mouse.clientX, mouse.clientY, EDGE_ZONE_MOUSE);
          if (cellPos < 0) return false;
          if (!beginDrag(view, cellPos, mouse.clientX)) return false;
          dragging = true;

          const win = view.dom.ownerDocument.defaultView ?? window;
          const move = (e: MouseEvent) => {
            if (!dragging) return;
            setPreview(view, applyDrag(view, e.clientX));
          };
          const finish = (e: MouseEvent) => {
            win.removeEventListener('mousemove', move);
            win.removeEventListener('mouseup', finish);
            if (dragging) {
              const final = applyDrag(view, e.clientX);
              setPreview(view, null);   // hand rendering back to the document
              commitPercents(view, dragCell, final);
              setActive(view, -1);
              reset();
            }
          };
          win.addEventListener('mousemove', move);
          win.addEventListener('mouseup', finish);
          event.preventDefault();
          return true;
        },

        // ── Touch ──
        touchstart(view, event) {
          if (!view.editable) return false;
          const touch = (event as TouchEvent).touches[0];
          if (!touch) return false;
          const cellPos = edgeCellAt(view, event.target, touch.clientX, touch.clientY, EDGE_ZONE_TOUCH);
          if (cellPos < 0) return false;
          // Only a candidate for now — a plain tap must still place the cursor, so
          // nothing is claimed or committed until the finger actually moves. The
          // column does highlight immediately, as touch feedback that the edge was hit.
          beginDrag(view, cellPos, touch.clientX);
          dragging = false;
          setActive(view, cellPos);
          return false;
        },
        touchmove(view, event) {
          if (dragCell < 0) return false;
          const touch = (event as TouchEvent).touches[0];
          if (!touch) return false;
          if (!dragging) {
            if (Math.abs(touch.clientX - startX) < TOUCH_DRAG_THRESHOLD) return false;
            dragging = true;
          }
          setPreview(view, applyDrag(view, touch.clientX));
          // Stops the WebView scrolling / selecting text mid-drag.
          event.preventDefault();
          return true;
        },
        touchend(view, event) {
          if (dragCell < 0) return false;
          if (!dragging) {
            // A tap, not a drag — drop the highlight and let it act normally.
            setActive(view, -1);
            reset();
            return false;
          }
          const touch = (event as TouchEvent).changedTouches[0];
          const final = applyDrag(view, touch ? touch.clientX : startX);
          setPreview(view, null);   // hand rendering back to the document
          commitPercents(view, dragCell, final);
          setActive(view, -1);
          reset();
          return true;
        },
        touchcancel(view) {
          if (dragCell < 0) return false;
          const wasDragging = dragging;
          // Abandon the drag: discard the preview and revert to the stored widths.
          if (wasDragging) setPreview(view, null);
          setActive(view, -1);
          reset();
          return wasDragging;
        },
      },
    },
  });
}

// ── Find in note (in-editor search + highlight) ────────────────────────────────
//
// A find plugin holds the current query, the matched ranges, and the "current"
// match index, and renders them as decorations (light-yellow for all matches, a
// stronger yellow for the current one). Driven imperatively by the native find bar
// through the setContent-style bridge methods (find / findNext / findPrevious /
// endFind); it never mutates the document.

const findKey = new PluginKey<FindState>('find');

interface FindMatch { from: number; to: number; }
interface FindState {
  query: string;
  // Find on its own is case-insensitive (typing "lq" should turn up "Lq"). Turning
  // on Replace switches matching to exact case, so what's highlighted is exactly
  // what a replace would rewrite — "Lq" never clobbers "lq".
  caseSensitive: boolean;
  matches: FindMatch[];
  current: number;
}

/** Flattens the doc into a single lowercased string plus a per-character map back to
 * document positions, inserting a newline (mapped to the block boundary) between
 * blocks so a match can't span across block nodes. */
function collectDocText(doc: any): { text: string; map: number[] } {
  let text = '';
  const map: number[] = [];
  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        text += node.text[i];
        map.push(pos + i);
      }
    } else if (node.isBlock) {
      if (text.length && text[text.length - 1] !== '\n') {
        text += '\n';
        map.push(pos);
      }
    }
    return true;
  });
  return { text, map };
}

function computeFindMatches(doc: any, query: string, caseSensitive: boolean): FindMatch[] {
  if (!query) return [];
  const { text, map } = collectDocText(doc);
  const haystack = caseSensitive ? text : text.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: FindMatch[] = [];
  let from = 0;
  while (from <= haystack.length) {
    const idx = haystack.indexOf(needle, from);
    if (idx < 0) break;
    const startPos = map[idx];
    const endPos = map[idx + needle.length - 1] + 1;
    if (startPos !== undefined && endPos !== undefined) {
      matches.push({ from: startPos, to: endPos });
    }
    from = idx + needle.length;
  }
  return matches;
}

/** Decorations for the current find state: every match gets pm-find-match, the
 * current one additionally gets pm-find-current. */
function findDecorations(doc: any, state: FindState): DecorationSet {
  if (!state.matches.length) return DecorationSet.empty;
  const decos = state.matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === state.current ? 'pm-find-match pm-find-current' : 'pm-find-match',
    }),
  );
  return DecorationSet.create(doc, decos);
}

// Pasted rich HTML from webpages sometimes carries structural layout markup —
// most commonly nested <table>s used for old-school box/grid layouts (e.g. a
// shipment tracker widget) — that this schema can technically parse (tables
// are a real node type, see schema.ts's tableNodes) but that some WebViews
// (WKWebView on Mac/iOS) fail to lay out/render at all, leaving the rest of
// the note blank. This flattens table structure into plain paragraphs (one
// per cell) before the schema parses the paste, while leaving inline
// formatting (bold/italic/links/lists/etc.) inside those cells untouched —
// see transformPastedHTML below for where this hooks in.
function stripPastedTables(html: string): string {
  const dom = new DOMParser().parseFromString(html, 'text/html');

  // Repeatedly unwrap the innermost tables (no <table> descendant of their
  // own) so nested tables-within-tables are fully flattened, not just their
  // outermost shell. The guard caps iterations against runaway/malformed
  // input; real-world nesting is never anywhere near this deep.
  let tables = Array.from(dom.body.querySelectorAll('table'));
  let guard = 0;
  while (tables.length > 0 && guard < 20) {
    for (const table of tables) {
      if (table.querySelector('table')) continue; // handle innermost first
      const frag = dom.createDocumentFragment();
      for (const cell of Array.from(table.querySelectorAll('td, th'))) {
        const p = dom.createElement('p');
        while (cell.firstChild) p.appendChild(cell.firstChild);
        frag.appendChild(p);
      }
      table.replaceWith(frag);
    }
    tables = Array.from(dom.body.querySelectorAll('table'));
    guard++;
  }

  return dom.body.innerHTML;
}

// ── Build editor keymap ────────────────────────────────────────────────────────

// Enter inside the title moves the cursor into the body instead of splitting
// the title node (there's nowhere else for a "second title" to go).
const moveFromTitleToBody = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const { $from } = state.selection;
  if ($from.parent.type !== schema.nodes.title) return false;
  if (dispatch) {
    const afterTitle = state.doc.firstChild!.nodeSize;
    const sel = Selection.near(state.doc.resolve(afterTitle), 1);
    dispatch(state.tr.setSelection(sel).scrollIntoView());
  }
  return true;
};

// Backspace at the very start of the first body block would otherwise try to
// join/lift into the title node above (different schema, no marks) — swallow
// it instead of letting that merge happen.
const guardBackspaceIntoTitle = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const { $from, empty } = state.selection;
  if (!empty) return false;
  const afterTitle = state.doc.firstChild!.nodeSize;
  if ($from.pos === afterTitle + 1 && $from.parentOffset === 0) return true;
  return false;
};

// True when the cursor's list item is the FIRST item of its list. Backspace only
// lifts an empty item out to a paragraph in that case; for a non-first empty item we
// let the base keymap's joinBackward merge it into the previous item instead (cursor
// moves to the end of the previous line, so you keep deleting there). Lifting a
// non-first item used to drop it below the list as a paragraph, which the next
// Backspace re-absorbed into the list — the "delete the bullet, then it comes back"
// bug.
function isFirstListItem(state: EditorState): boolean {
  const { list_item, task_list_item } = schema.nodes;
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d);
    if (node.type === list_item || node.type === task_list_item) {
      return $from.index(d - 1) === 0;
    }
  }
  return false;
}

// ArrowDown at the end of a code block that has nothing after it creates a paragraph
// below and moves the cursor there — otherwise a code block at the end of a note
// traps the cursor with no way to write normal text again. (The trailingParagraph
// plugin below usually keeps such a paragraph around already; this covers the moment
// before it lands and matches what people expect from the arrow key.)
const arrowDownOutOfCodeBlock = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const { $head, empty } = state.selection;
  if (!empty || $head.parent.type !== schema.nodes.code_block) return false;
  if ($head.parentOffset !== $head.parent.content.size) return false; // not at the end
  const after = $head.after($head.depth);
  if (state.doc.nodeAt(after)) return false; // something follows — let the arrow move there
  if (dispatch) {
    const tr = state.tr.insert(after, schema.nodes.paragraph.create());
    tr.setSelection(Selection.near(tr.doc.resolve(after + 1)));
    dispatch(tr.scrollIntoView());
  }
  return true;
};

/** One dropped file as a data URI, the shape native expects for an image. */
function readAsDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Hands dropped images to native one at a time, so several dropped together land in
 * the order they were picked up rather than in whichever order they finish reading. */
async function sendDroppedImages(files: File[]) {
  for (const file of files) {
    try {
      postToNative({ type: 'imageRequested', html: await readAsDataUri(file) });
    } catch {
      // Unreadable file (permissions, or it vanished mid-drag) — skip it and carry on.
    }
  }
}

// Selects an attachment card's node from its DOM element. posAtDOM lands either on the
// node itself or just inside it depending on where in the card the click was, so both
// are checked before giving up.
function selectAttachmentCard(view: EditorView, card: HTMLElement) {
  const at = view.posAtDOM(card, 0);
  for (const pos of [at, at - 1]) {
    if (pos >= 0 && view.state.doc.nodeAt(pos)?.type === schema.nodes.attachment) {
      view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
      return;
    }
  }
}

// Space with an attachment card selected previews the file, the way Space does in
// Finder, instead of replacing the card with a space character. Nothing is dispatched:
// returning true is what keeps the space out of the document.
const previewSelectedAttachment = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const sel = state.selection;
  if (!(sel instanceof NodeSelection) || sel.node.type !== schema.nodes.attachment) return false;
  const resourceId = sel.node.attrs.resourceId as string;
  if (!resourceId) return false;
  if (dispatch) postToNative({ type: 'openAttachment', resourceId });
  return true;
};

// Backspace with the cursor just after an attachment card deletes the card. The base
// keymap would select it on the first press and delete it on the second, which reads
// as nothing having happened.
const deleteAttachmentBefore = (state: EditorState, dispatch?: (tr: Transaction) => void) => {
  const { $from, empty } = state.selection;
  if (!empty || $from.parentOffset > 0 || $from.depth < 1) return false;
  const blockStart = $from.before($from.depth);
  const previous = state.doc.resolve(blockStart).nodeBefore;
  if (!previous || previous.type !== schema.nodes.attachment) return false;
  if (dispatch) dispatch(state.tr.delete(blockStart - previous.nodeSize, blockStart).scrollIntoView());
  return true;
};

/// Clicking (or tapping) in the empty space below a note that ends in a "box" —
/// a code block or a table — adds a paragraph after it and puts the cursor there.
/// Without this the cursor is stuck inside the box with no way to write normal text
/// again. Done on demand rather than by always keeping a trailing paragraph around,
/// so simply opening a note never edits it.
function clickBelowToEscape() {
  const trapping = [schema.nodes.code_block, schema.nodes.table];

  const escapeBelow = (view: EditorView, clientY: number): boolean => {
    if (!view.editable) return false;
    const last = view.state.doc.lastChild;
    if (!last || !trapping.includes(last.type)) return false;
    const lastPos = view.state.doc.content.size - last.nodeSize;
    const dom = view.nodeDOM(lastPos) as HTMLElement | null;
    const rect = dom?.getBoundingClientRect?.();
    if (!rect || clientY <= rect.bottom) return false; // not below the box
    const tr = view.state.tr.insert(view.state.doc.content.size, schema.nodes.paragraph.create());
    tr.setSelection(Selection.near(tr.doc.resolve(tr.doc.content.size - 1)));
    view.dispatch(tr.scrollIntoView());
    return true;
  };

  return new Plugin({
    props: {
      handleDOMEvents: {
        mousedown: (view, event) => escapeBelow(view, (event as MouseEvent).clientY),
        touchend: (view, event) => {
          const touch = (event as TouchEvent).changedTouches[0];
          return touch ? escapeBelow(view, touch.clientY) : false;
        },
      },
    },
  });
}

function buildKeymap() {
  const { list_item, task_list_item } = schema.nodes;
  const listItemTypes = [list_item, task_list_item];

  return keymap({
    'Mod-b': (state, dispatch, view) => commands.bold(view!),
    'Mod-i': (state, dispatch, view) => commands.italic(view!),
    'Mod-`': (state, dispatch, view) => commands.code(view!),
    'Mod-z': (state, dispatch, view) => commands.undo(view!),
    'Mod-Shift-z': (state, dispatch, view) => commands.redo(view!),
    'Mod-a': (state, dispatch, view) => commands.selectAll(view!),

    // List indentation
    'Tab': (state, dispatch, view) => commands.indent(view!),
    'Shift-Tab': (state, dispatch, view) => commands.outdent(view!),

    // Escape a code block that ends the note (see arrowDownOutOfCodeBlock).
    'ArrowDown': arrowDownOutOfCodeBlock,

    // Preview a selected attachment (see previewSelectedAttachment). Falls through to
    // the normal space everywhere else.
    'Space': previewSelectedAttachment,

    // Enter in list items (title-to-body handoff checked first)
    'Enter': chainCommands(
      moveFromTitleToBody,
      splitListItem(task_list_item),
      splitListItem(list_item),
      newlineInCode,
      exitCode,
    ),

    // Lift out with Backspace — only when the cursor is at the very start of an empty
    // list item AND it's the first item of its list (see isFirstListItem). The
    // parentOffset guard stops liftListItem firing mid-word; the first-item guard
    // stops it firing on a later empty item, where the cursor should instead join
    // back into the previous item (handled by the base keymap's joinBackward when
    // these commands return false).
    'Backspace': chainCommands(
      guardBackspaceIntoTitle,
      deleteAttachmentBefore,
      (state, dispatch) => {
        if (state.selection.$from.parentOffset > 0) return false;
        if (!isFirstListItem(state)) return false;
        return liftListItem(task_list_item)(state, dispatch);
      },
      (state, dispatch) => {
        if (state.selection.$from.parentOffset > 0) return false;
        if (!isFirstListItem(state)) return false;
        return liftListItem(list_item)(state, dispatch);
      },
    ),
  });
}

// ── Selection state ────────────────────────────────────────────────────────────

function getSelectionState(state: EditorState): SelectionState {
  const { $from, empty } = state.selection;

  const hasMark = (markType: any) => {
    if (empty) return !!markType.isInSet(state.storedMarks || $from.marks());
    return state.doc.rangeHasMark($from.pos, state.selection.to, markType);
  };

  let headingLevel = 0;
  let inCode = false;
  let inBlockquote = false;
  let inBulletList = false;
  let inOrderedList = false;
  let inTaskList = false;
  let inCheckedTask = false;
  let inTable = false;
  let hasLink = false;
  let linkHref: string | null = null;

  const { nodes: n, marks: m } = schema;

  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    switch (node.type) {
      case n.heading: headingLevel = node.attrs.level; break;
      case n.code_block: inCode = true; break;
      case n.blockquote: inBlockquote = true; break;
      case n.bullet_list: inBulletList = true; break;
      case n.ordered_list: inOrderedList = true; break;
      case n.task_list: inTaskList = true; break;
      case n.task_list_item:
        inTaskList = true;
        inCheckedTask = !!node.attrs.checked;
        break;
      case n.table: inTable = true; break;
    }
  }

  const linkMark = m.link.isInSet(state.storedMarks || $from.marks());
  if (linkMark) {
    hasLink = true;
    linkHref = linkMark.attrs.href;
  }

  return {
    bold: hasMark(m.strong),
    italic: hasMark(m.em),
    code: hasMark(m.code),
    strikethrough: hasMark(m.strikethrough),
    highlight: hasMark(m.highlight),
    inCode,
    inBlockquote,
    inBulletList,
    inOrderedList,
    inTaskList,
    inCheckedTask,
    inTable,
    headingLevel,
    hasLink,
    linkHref,
  };
}

// ── HTML serialization ────────────────────────────────────────────────────────

const serializer = DOMSerializer.fromSchema(schema);

/** Splits the doc's mandatory first (title) node from the rest (body) — the
 * doc-level HTML the native side ever needs to know about, in the shape it
 * already stores Note.title/Note.body separately. */
function stateToParts(state: EditorState): { title: string; body: string } {
  const titleNode = state.doc.firstChild!;
  const bodyFragment = state.doc.content.cut(titleNode.nodeSize);
  const div = document.createElement('div');
  div.appendChild(serializer.serializeFragment(bodyFragment));
  return { title: titleNode.textContent, body: div.innerHTML };
}

// ── Android tap highlight ─────────────────────────────────────────────────────

/** Android's round tap highlight for the controls inside a note — a task checkbox,
 * a heading's collapse chevron. Its WebView draws the default one as the element's
 * rectangle, which flashes a square around a round or oddly shaped control, so that
 * one is suppressed in CSS and this marks the tapped node instead. The pm-tapped
 * rules in build.mjs draw what's actually seen.
 *
 * A decoration, not a class written straight onto the element: tapping either
 * control changes its node's attrs, which re-renders it from toDOM and would drop
 * any class we'd set by hand. Decorations are re-applied after every render, so the
 * highlight survives the very transaction that triggers it. */
const tapFlashKey = new PluginKey<DecorationSet>('tapFlash');

/** How long the highlight stays up. Roughly Material's own state-layer fade. */
const TAP_FLASH_MS = 200;

let tapFlashTimer: ReturnType<typeof setTimeout> | null = null;

/** Flashes the node starting at [pos]. */
function flashNodeAt(view: EditorView, pos: number) {
  if (!view.state.doc.nodeAt(pos)) return;
  if (tapFlashTimer) clearTimeout(tapFlashTimer);
  view.dispatch(view.state.tr.setMeta(tapFlashKey, pos));
  tapFlashTimer = setTimeout(() => {
    tapFlashTimer = null;
    view.dispatch(view.state.tr.setMeta(tapFlashKey, null));
  }, TAP_FLASH_MS);
}

/** Flashes the task item around [pos] — the checkbox itself is inside it, so the
 * whole item carries the class and the CSS picks the checkbox back out. */
function flashCheckboxAt(view: EditorView, pos: number) {
  const $pos = view.state.doc.resolve(pos);
  for (let d = $pos.depth; d >= 0; d--) {
    if ($pos.node(d).type === schema.nodes.task_list_item) {
      flashNodeAt(view, $pos.before(d));
      return;
    }
  }
}

const tapFlashPlugin = new Plugin<DecorationSet>({
  key: tapFlashKey,
  state: {
    init: () => DecorationSet.empty,
    apply(tr, old) {
      const meta = tr.getMeta(tapFlashKey) as number | null | undefined;
      if (meta === undefined) return old.map(tr.mapping, tr.doc);
      if (meta === null) return DecorationSet.empty;
      const node = tr.doc.nodeAt(meta);
      if (!node) return DecorationSet.empty;
      return DecorationSet.create(tr.doc, [
        Decoration.node(meta, meta + node.nodeSize, { class: 'pm-tapped' }),
      ]);
    },
  },
  props: {
    decorations(state) {
      return tapFlashKey.getState(state) ?? DecorationSet.empty;
    },
  },
});

// ── Editor setup ──────────────────────────────────────────────────────────────

function createEditor(): EditorView {
  const domEl = document.getElementById('editor');
  if (!domEl) throw new Error('#editor element not found');

  // Set by native for a trashed note opened in Trash — matches the ?theme= query
  // param pattern below. Read once at load time; a trashed note is always reopened
  // as a fresh WebView load (never toggled live), so this doesn't need to be reactive.
  const isReadOnly = /[?&]readonly=1(&|$)/.test(location.search);

  // Runtime-toggleable editability. Starts from ?readonly=1 (a trashed note stays
  // permanently read-only). Android flips this at runtime via the setEditable native
  // bridge to implement its read-mode / edit-mode split: read mode (editable=false)
  // means a tap interacts with content (open a link, toggle a task, select text) and
  // never pops the keyboard; edit mode (editable=true) is normal editing. Mac and iOS
  // never call setEditable, so for them this stays === !isReadOnly and their behavior
  // is unchanged.
  let editable = !isReadOnly;

  // Android only — the on-screen keyboard's floating formatting toolbar sits
  // right above the keyboard, close enough to the last line that the text
  // selection handles are hard to grab. Extra bottom padding gives room to
  // scroll the last line clear of both. See EditorWebView.kt's ?platform=
  // query param and the body.pm-android rule in build.mjs.
  const isAndroid = /[?&]platform=android(&|$)/.test(location.search);
  if (isAndroid) document.body.classList.add('pm-android');

  // iPhone only — the body's 24/30px left/right padding (below) was sized for Mac's
  // much wider window and left too large a gap on iPhone's narrow screen. See
  // EditorView.swift's (iOS target) ?platform= query param and the body.pm-ios-phone
  // rule in build.mjs. iPad keeps the default padding (its screen is wide enough).
  const isIOSPhone = /[?&]platform=ios-phone(&|$)/.test(location.search);
  if (isIOSPhone) document.body.classList.add('pm-ios-phone');

  if (/[?&]platform=mac(&|$)/.test(location.search)) document.body.classList.add('pm-mac');

  let lastTitle = '';
  let lastHTML = '';
  let selectionDebounce: ReturnType<typeof setTimeout> | null = null;
  // Pending single-click preview of an attachment, cancelled if a double click
  // follows (see the attachment plugin below).
  let attachmentClickTimer: ReturnType<typeof setTimeout> | null = null;

  const notifyContent = (state: EditorState) => {
    const { title, body } = stateToParts(state);
    if (title !== lastTitle || body !== lastHTML) {
      lastTitle = title;
      lastHTML = body;
      postToNative({ type: 'contentChanged', title, html: body });
    }
  };

  const notifySelection = (state: EditorState) => {
    if (selectionDebounce) clearTimeout(selectionDebounce);
    selectionDebounce = setTimeout(() => {
      postToNative({ type: 'selectionChanged', selectionState: getSelectionState(state) });
    }, 30);
  };

  const dispatchWithNotify = (view: EditorView) => (tr: Transaction) => {
    view.updateState(view.state.apply(tr));
    if (tr.docChanged) notifyContent(view.state);
    notifySelection(view.state);
  };

  // Build initial empty state
  const state = EditorState.create({
    schema,
    plugins: [
      history(),
      buildKeymap(),
      keymap(baseKeymap),
      buildInputRules(),
      dropCursor(),
      gapCursor(),
      // handleWidth 8 (default 5) gives a wider grab zone for the column resize
      // handles so they're usable with a finger on Android/iPad, not just a mouse.
      // lastColumnResizable: false — the table is pinned to 100% width (see the CSS),
      // so dragging its right edge has nothing to give.
      // Our own percentage-based, zero-sum resizing (mouse + touch) in place of
      // prosemirror-tables' pixel-based columnResizing — see the section above.
      // Must come BEFORE tableEditing, whose selection handling would otherwise
      // claim the drag gesture.
      percentColumnResizing(),
      tableEditing(),

      // Lets a click/tap below a trailing code block or table escape it.
      clickBelowToEscape(),

      // Open links in default browser on click
      new Plugin({
        props: {
          handleDOMEvents: {
            click(_view, event) {
              const anchor = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
              if (!anchor) return false;
              // On Android in edit mode, a link tap should place the cursor so the
              // link text can be edited — not launch the browser. In Android read
              // mode (and on every other platform, where `editable` is never toggled)
              // this opens the link as before.
              if (isAndroid && editable) return false;
              event.preventDefault();
              postToNative({ type: 'openUrl', url: anchor.href });
              return true;
            },
          },
        },
      }),

      // Attachment cards:
      //   single click  → preview the file (QuickLook on Mac/iOS, the default app on
      //                   Android), which is all mobile does with attachments;
      //   double click  → open it in its default app to edit (desktop only — the Mac
      //                   client then watches the file and syncs any changes back).
      // The single-click preview waits briefly so a double click doesn't also fire it.
      // Two things keep that from being a race: the second click of a double click
      // carries detail > 1, so it cancels the pending preview however late it lands,
      // and the Mac side closes the preview panel when the edit message arrives. Same
      // edit-mode rule as links on Android: while editing, a tap selects the card
      // instead of opening it.
      new Plugin({
        props: {
          handleDOMEvents: {
            click(view, event) {
              const card = (event.target as HTMLElement).closest('.pm-attachment') as HTMLElement | null;
              if (!card) return false;
              if (isAndroid && editable) return false;
              const resourceId = card.getAttribute('data-resource-id') || '';
              if (!resourceId) return false;
              event.preventDefault();
              // preventDefault stops the browser placing the selection, so put it on
              // the card ourselves. That's what makes Space (preview) and Backspace
              // (delete) work on it afterwards, the way a selected file behaves in
              // Finder. Not on Android: a tap there is read mode's "open it", and a
              // selection outline left behind would just look like a stuck state (in
              // Android edit mode this handler bails out above and the tap selects the
              // card by itself).
              if (!isAndroid) selectAttachmentCard(view, card);
              if (attachmentClickTimer !== null) {
                clearTimeout(attachmentClickTimer);
                attachmentClickTimer = null;
              }
              // Part of a double click (the browser counts clicks within the system's
              // double-click interval, however long the user has set that to) — leave
              // it to the dblclick handler.
              if (event.detail > 1) return true;
              attachmentClickTimer = setTimeout(() => {
                attachmentClickTimer = null;
                postToNative({ type: 'openAttachment', resourceId });
              }, 250);
              return true;
            },
            dblclick(view, event) {
              const card = (event.target as HTMLElement).closest('.pm-attachment') as HTMLElement | null;
              if (!card) return false;
              if (isAndroid && editable) return false;
              const resourceId = card.getAttribute('data-resource-id') || '';
              if (!resourceId) return false;
              // Cancel the pending preview from the first click of this double click.
              if (attachmentClickTimer !== null) {
                clearTimeout(attachmentClickTimer);
                attachmentClickTimer = null;
              }
              event.preventDefault();
              postToNative({ type: 'editAttachment', resourceId });
              return true;
            },
          },
        },
      }),

      // Data detectors: underline detected URLs / emails / phones / addresses in
      // plain text (see detectLinks) as yellow "active links", via decorations that
      // don't touch the stored document. A tap opens the right app; on Android in
      // edit mode a tap places the cursor instead (same rule as explicit links).
      new Plugin({
        key: autoLinkKey,
        state: {
          init: (_config, editorState) => buildAutoLinkDecos(editorState.doc),
          apply: (tr, old, _oldState, newState) =>
            tr.docChanged ? buildAutoLinkDecos(newState.doc) : old,
        },
        props: {
          decorations(editorState) {
            return autoLinkKey.getState(editorState);
          },
          handleDOMEvents: {
            click(_view, event) {
              const el = (event.target as HTMLElement).closest('[data-al-href]') as HTMLElement | null;
              if (!el) return false;
              if (isAndroid && editable) return false;
              event.preventDefault();
              const type = el.getAttribute('data-al-type');
              const href = el.getAttribute('data-al-href') || '';
              // Addresses go through openMaps (native shows a Google Maps / Waze
              // chooser); url/email/phone are already fully-formed scheme URLs.
              postToNative(type === 'address' ? { type: 'openMaps', url: href } : { type: 'openUrl', url: href });
              return true;
            },
          },
        },
      }),

      // Find in note — holds query/matches/current and renders them as decorations.
      // Driven by the find/findNext/findPrevious/endFind bridge methods, which
      // dispatch meta-only transactions (no doc change) picked up in apply below.
      new Plugin({
        key: findKey,
        state: {
          init: (): FindState => ({ query: '', caseSensitive: false, matches: [], current: -1 }),
          apply: (tr, prev: FindState, _old, newState): FindState => {
            const meta = tr.getMeta(findKey) as
              | { type: string; query?: string; caseSensitive?: boolean }
              | undefined;
            if (meta) {
              if (meta.type === 'clear') {
                return { query: '', caseSensitive: false, matches: [], current: -1 };
              }
              if (meta.type === 'set') {
                const query = meta.query ?? '';
                const caseSensitive = meta.caseSensitive ?? prev.caseSensitive;
                const matches = computeFindMatches(newState.doc, query, caseSensitive);
                // Start at the first match at/after the caret, else the first match.
                const head = newState.selection.head;
                let current = matches.findIndex((m) => m.from >= head);
                if (current < 0) current = matches.length ? 0 : -1;
                return { query, caseSensitive, matches, current };
              }
              if ((meta.type === 'next' || meta.type === 'prev') && prev.matches.length) {
                const step = meta.type === 'next' ? 1 : -1;
                const current = (prev.current + step + prev.matches.length) % prev.matches.length;
                return { ...prev, current };
              }
              return prev;
            }
            // Keep matches in sync as the document changes while find is open.
            if (tr.docChanged && prev.query) {
              const matches = computeFindMatches(newState.doc, prev.query, prev.caseSensitive);
              const current = matches.length ? Math.min(Math.max(prev.current, 0), matches.length - 1) : -1;
              return { ...prev, matches, current };
            }
            return prev;
          },
        },
        props: {
          decorations(editorState) {
            const st = findKey.getState(editorState);
            return st ? findDecorations(editorState.doc, st) : null;
          },
        },
      }),

      // Auto-linkify pasted URLs
      new Plugin({
        props: {
          handlePaste(view, event) {
            const text = event.clipboardData?.getData('text/plain')?.trim() ?? '';
            if (!text || !isUrl(text)) return false;

            const { state, dispatch } = view;
            const { selection } = state;
            const linkMark = schema.marks.link.create({ href: text });

            if (!selection.empty) {
              // Paste URL as link mark over selected text
              if (dispatch) dispatch(state.tr.addMark(selection.from, selection.to, linkMark));
              return true;
            }

            // No selection: insert URL as linked text
            const textNode = schema.text(text, [linkMark]);
            if (dispatch) dispatch(state.tr.replaceSelectionWith(textNode, false).scrollIntoView());
            return true;
          },
        },
      }),

      // Placeholder text ("Title") shown when the title node is empty.
      new Plugin({
        props: {
          decorations(state) {
            const titleNode = state.doc.firstChild;
            if (titleNode && titleNode.type === schema.nodes.title && titleNode.content.size === 0) {
              return DecorationSet.create(state.doc, [
                Decoration.node(0, titleNode.nodeSize, { class: 'pm-title-empty' }),
              ]);
            }
            return DecorationSet.empty;
          },
        },
      }),

      // Collapse/expand sections under headings
      new Plugin({
        props: {
          // Hide all blocks that follow a collapsed heading until the next
          // heading of the same or higher level.
          decorations(state) {
            const topLevel: { node: any; offset: number }[] = [];
            state.doc.forEach((node, offset) => topLevel.push({ node, offset }));

            const decos: Decoration[] = [];
            for (let i = 0; i < topLevel.length; i++) {
              const { node, offset } = topLevel[i];
              // Level 1 ("Title") has no arrow/collapse UI — see schema.ts's heading
              // toDOM — so guard against stale collapsed=true data too (e.g. a
              // heading collapsed at level 3, then restyled to Title).
              if (node.type !== schema.nodes.heading || node.attrs.level === 1 || !node.attrs.collapsed) continue;
              const level = node.attrs.level as number;
              for (let j = i + 1; j < topLevel.length; j++) {
                const next = topLevel[j];
                if (next.node.type === schema.nodes.heading && next.node.attrs.level <= level) break;
                decos.push(Decoration.node(next.offset, next.offset + next.node.nodeSize, {
                  class: 'pm-heading-section-hidden',
                }));
              }
            }

            // The arrow is hidden by default (see build.mjs) and only shown on the
            // heading (level 3/4, not "Title") the cursor is currently in, collapsed
            // or not — this marks that heading with a class the CSS keys off.
            const { $from } = state.selection;
            for (let d = $from.depth; d >= 0; d--) {
              const node = $from.node(d);
              if (node.type === schema.nodes.heading && node.attrs.level !== 1) {
                const pos = $from.before(d);
                decos.push(Decoration.node(pos, pos + node.nodeSize, { class: 'pm-heading-focused' }));
                break;
              }
            }

            return DecorationSet.create(state.doc, decos);
          },

          // Toggle collapsed state when the arrow span is tapped/clicked.
          // pointerdown (not mousedown) — mousedown on a contenteditable="false"
          // island inside a contenteditable region relies on the browser
          // synthesizing a mouse event from a touch, which Chromium/Android
          // WebView doesn't always do reliably (unlike WebKit/Mac). pointerdown
          // is fired natively for both touch and mouse on both engines.
          handleDOMEvents: {
            pointerdown(view, event) {
              const target = event.target as HTMLElement;
              if (!target.classList.contains('pm-heading-arrow')) return false;

              event.preventDefault();
              event.stopPropagation();

              const headingEl = target.closest('h1,h2,h3,h4,h5,h6') as HTMLElement | null;
              if (!headingEl) return false;

              let found: { pos: number; node: any } | null = null;
              view.state.doc.forEach((node, offset) => {
                if (found) return;
                if (node.type === schema.nodes.heading && view.nodeDOM(offset) === headingEl) {
                  found = { pos: offset, node };
                }
              });

              if (found) {
                const { pos, node } = found as any;
                view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  collapsed: !node.attrs.collapsed,
                }));
                // Android only: the round tap highlight that stands in for the square
                // one its WebView would draw around the chevron (see flashNodeAt).
                if (isAndroid) flashNodeAt(view, pos);
                return true;
              }
              return false;
            },
          },
        },
      }),

      // Handle arrow clicks in toggle/details blocks
      new Plugin({
        props: {
          // pointerdown — see the heading-arrow handler above for why.
          handleDOMEvents: {
            pointerdown(view, event) {
              const target = event.target as HTMLElement;
              if (!target.classList.contains('pm-toggle-arrow')) return false;

              event.preventDefault();
              event.stopPropagation();

              // Find the details node whose DOM subtree contains this arrow
              let found: { pos: number; node: any } | null = null;
              view.state.doc.descendants((node, pos) => {
                if (found) return false;
                if (node.type === schema.nodes.details) {
                  const dom = view.nodeDOM(pos) as HTMLElement | null;
                  if (dom?.contains(target)) {
                    found = { pos, node };
                    return false;
                  }
                }
              });

              if (found) {
                const { pos, node } = found as any;
                view.dispatch(
                  view.state.tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    open: !node.attrs.open,
                  })
                );
                return true;
              }
              return false;
            },
          },
        },
      }),

      // Android's round tap highlight for checkboxes and chevrons (see flashNodeAt).
      tapFlashPlugin,

      // Handle checkbox clicks in task list items
      new Plugin({
        props: {
          // pointerdown — see the heading-arrow handler above for why.
          handleDOMEvents: {
            pointerdown(view, event) {
              const target = event.target as HTMLElement;
              if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
                event.preventDefault();
                // Resolve the position from the actual clicked checkbox (not
                // view.state.selection, which is still wherever the cursor was left
                // from a previous click/edit at this point — preventDefault() above
                // stops the browser from moving it to here first). Fixes checking one
                // line toggling a different (or no) line.
                const pos = view.posAtDOM(target, 0);
                toggleCheckboxAtPos(view, pos);
                // Android only: the round tap highlight that stands in for the
                // square one its WebView would have drawn. Done here rather than
                // with :active, which the preventDefault above stops Chromium
                // from ever applying.
                if (isAndroid) flashCheckboxAt(view, pos);
                return true;
              }
              return false;
            },
          },
        },
      }),

      // Paste images from clipboard
      new Plugin({
        props: {
          handlePaste(view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;
            for (const item of Array.from(items)) {
              if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (e) => {
                    const dataUri = e.target?.result as string;
                    // Hand the raw data URI to native code instead of inserting it
                    // inline — only native has filesystem access to save it as a real
                    // Resource (with an id, a local file, and a row in the resources
                    // table) the way the toolbar's image picker already does. Native
                    // calls back into insertImage() once that's done.
                    if (dataUri) postToNative({ type: 'imageRequested', html: dataUri });
                  };
                  reader.readAsDataURL(file);
                }
                return true;
              }
            }
            return false;
          },

          // Images dragged into the note from Finder, Photos, another app or another
          // window. The cursor moves to where the file was dropped first, then the
          // file goes to native by the same route as a pasted image: only native can
          // save it as a real Resource, and it inserts at the selection we just set.
          // Android's WebView doesn't deliver file drops to the page at all, so it
          // has its own drag listener instead — see EditorWebView.kt.
          handleDrop(view, event) {
            const dropped = Array.from(event.dataTransfer?.files ?? []);
            const images = dropped.filter((file) => file.type.startsWith('image/'));
            if (images.length === 0) return false;
            event.preventDefault();
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (coords) {
              const selection = Selection.near(view.state.doc.resolve(coords.pos));
              view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
            }
            view.focus();
            sendDroppedImages(images);
            return true;
          },
        },
      }),

      // Flatten table-based layout structure out of pasted HTML — see
      // stripPastedTables above. Only runs for the normal (non-image,
      // non-bare-URL) rich-HTML paste path; the two handlePaste plugins above
      // already fully take over image/URL pastes before this would apply.
      new Plugin({
        props: {
          transformPastedHTML(html) {
            return stripPastedTables(html);
          },
        },
      }),
    ],
  });

  const view = new EditorView(domEl, {
    state,
    dispatchTransaction: (tr) => dispatchWithNotify(view)(tr),
    editable: () => editable,
  });

  // Exposed for the native setEditable bridge (Android's read/edit toggle). Flips the
  // `editable` flag the props closure above reads, then setProps() forces ProseMirror
  // to re-evaluate it and update the DOM's contentEditable (and blur if turning off).
  (view as EditorViewWithSetEditable).__setEditable = (value: boolean) => {
    if (editable === value) return;
    editable = value;
    view.setProps({ editable: () => editable });
  };

  // Android-only signal: lets the two-pane tablet layout (note list + editor
  // visible side by side, no persistent sidebar — see NotesNavHost.kt) switch
  // the selected note row between Dimmed Yellow (list has focus) and Gray
  // (editor has focus). Mac doesn't need this — its equivalent distinction is
  // driven by sidebar focus instead (see SidebarView.swift's isSidebarFocused).
  view.dom.addEventListener('focus', () => postToNative({ type: 'focusChanged', focused: true }));
  view.dom.addEventListener('blur', () => postToNative({ type: 'focusChanged', focused: false }));

  // Initial selection state
  notifySelection(view.state);

  return view;
}

// ── Native API (called from Swift via evaluateJavaScript) ─────────────────────

// The selection, or with an empty selection inside a link, that whole link, so the
// Add Link sheet edits it rather than nesting a new link in it.
function linkTargetRange(state: EditorState): { from: number; to: number } {
  const { from, to, empty, $from } = state.selection;
  const current = schema.marks.link.isInSet($from.marks());
  if (!empty || !current) return { from, to };
  // Children of the text block with their positions; a link split by other marks
  // (bold, italic) spans several of them.
  const children: { from: number; to: number; href: string | null }[] = [];
  let pos = $from.start();
  $from.parent.forEach((child) => {
    const mark = schema.marks.link.isInSet(child.marks);
    children.push({ from: pos, to: pos + child.nodeSize, href: mark ? mark.attrs.href : null });
    pos += child.nodeSize;
  });
  const href = current.attrs.href;
  let index = children.findIndex((c) => c.href === href && c.from <= from && from <= c.to);
  if (index < 0) return { from, to };
  let first = index;
  let last = index;
  while (first > 0 && children[first - 1].href === href) first--;
  while (last < children.length - 1 && children[last + 1].href === href) last++;
  return { from: children[first].from, to: children[last].to };
}

interface NativeEditorBridge {
  setContent: (title: string, body: string) => void;
  execCommand: (command: string, value?: any) => void;
  setEditable: (value: boolean) => void;
  find: (query: string, caseSensitive?: boolean) => void;
  findNext: () => void;
  findPrevious: () => void;
  replaceCurrent: (replacement: string) => void;
  replaceAll: (replacement: string) => void;
  endFind: () => void;
  highlightSearch: (query: string) => void;
  setDateLine: (text: string) => void;
  getSelectedText: () => string;
  insertLink: (href: string, name: string) => void;
  focus: () => void;
  blur: () => void;
  getHTML: () => string;
  collapseSelection: () => void;
}

// EditorView with the runtime editability setter attached in createEditor (see there).
type EditorViewWithSetEditable = EditorView & { __setEditable?: (value: boolean) => void };

declare global {
  interface Window {
    NativeEditor: NativeEditorBridge;
    webkit?: {
      messageHandlers?: {
        [key: string]: { postMessage: (msg: any) => void };
      };
    };
    // Injected by Android via WebView.addJavascriptInterface("AndroidBridge", ...)
    AndroidBridge?: { postMessage: (json: string) => void };
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  let view: EditorView;

  try {
    view = createEditor();
  } catch (err) {
    log(`Editor init error: ${err}`);
    return;
  }

  // Dropping a file anywhere on the page makes a web view navigate to it by default,
  // which would replace the note with the raw file. dragover has to be cancelled for
  // any drop to be delivered at all; the drop itself is cancelled only outside the
  // editor, where the editor's own handleDrop (images) and ProseMirror's built-in
  // handling (dragged text) don't apply.
  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target?.closest?.('.ProseMirror')) event.preventDefault();
  });

  // After a find/findNext/findPrevious dispatch: scroll the current match into view
  // (without moving the selection) and report count/index to the native find bar.
  const afterFindUpdate = () => {
    const st = findKey.getState(view.state);
    if (!st) return;
    const match = st.current >= 0 ? st.matches[st.current] : undefined;
    if (match) {
      try {
        const domAt = view.domAtPos(match.from);
        const el = domAt.node.nodeType === Node.TEXT_NODE ? domAt.node.parentElement : (domAt.node as HTMLElement);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      } catch (_) {
        // position not resolvable this frame — ignore
      }
    }
    postToNative({ type: 'findResult', count: st.matches.length, index: st.current >= 0 ? st.current + 1 : 0 });
  };

  const bridge: NativeEditorBridge = {
    setContent(title: string, body: string) {
      // Splice the title in as a real `div.pm-title` DOM node (title's own
      // parseDOM tag) ahead of the body, then run the *full* parser.parse()
      // over the combined DOM with `doc` as the top node. Unlike parseSlice +
      // doc.create() (previous approach — produced structurally invalid docs
      // that later crashed with "contentMatchAt on a node with invalid
      // content") or doc.createAndFill() (tried, reverted — it repairs
      // mismatches by deleting whatever doesn't fit, which silently wiped an
      // entire note body), parser.parse() builds the document incrementally
      // against doc's own content expression ('title block*'), auto-wrapping
      // stray content in the correct block type as it goes — the same
      // context-aware matching used while typing — so it can't produce an
      // invalid document and doesn't drop valid content to do it.
      const domParser = new DOMParser();
      const dom = domParser.parseFromString(body || '<p></p>', 'text/html');

      const titleDiv = dom.createElement('div');
      titleDiv.className = 'pm-title';
      if (title) titleDiv.textContent = title;
      dom.body.insertBefore(titleDiv, dom.body.firstChild);

      const parser = PMDOMParser.fromSchema(schema);
      const doc = parser.parse(dom.body, { preserveWhitespace: true });

      const newState = EditorState.create({
        doc,
        plugins: view.state.plugins,
      });
      view.updateState(newState);
    },

    execCommand(command: string, value?: any) {
      const cmd = commands[command];
      if (!cmd) {
        log(`Unknown command: ${command}`);
        return;
      }
      // Run the command first — ProseMirror dispatch works without DOM focus.
      // Do NOT call view.focus() before the command: on macOS, programmatic
      // focus() from evaluateJavaScript is not a user gesture and can silently
      // fail or trigger async browser focus-handling that races the dispatch.
      cmd(view, value);
      // After the command's DOM updates are committed, restore editor focus
      // so the cursor is visible and the user can keep typing.
      requestAnimationFrame(() => {
        (view.dom as HTMLElement).focus({ preventScroll: true });
      });
    },

    setEditable(value: boolean) {
      (view as EditorViewWithSetEditable).__setEditable?.(value);
    },

    // ── Find in note ──
    // caseSensitive is passed by native: false for plain find, true once Replace is
    // showing, so a replace only ever rewrites the exact-case text it highlighted.
    find(query: string, caseSensitive?: boolean) {
      document.body.classList.remove('pm-search-highlight');
      document.body.classList.toggle('pm-finding', query.length > 0);
      view.dispatch(view.state.tr.setMeta(findKey, { type: 'set', query, caseSensitive: !!caseSensitive }));
      afterFindUpdate();
    },
    findNext() {
      view.dispatch(view.state.tr.setMeta(findKey, { type: 'next' }));
      afterFindUpdate();
    },
    findPrevious() {
      view.dispatch(view.state.tr.setMeta(findKey, { type: 'prev' }));
      afterFindUpdate();
    },

    /// Replaces just the current match, then re-runs the search so the counter and
    /// highlights reflect the new text.
    replaceCurrent(replacement: string) {
      const st = findKey.getState(view.state);
      if (!st || st.current < 0) return;
      const match = st.matches[st.current];
      if (!match) return;
      const tr = view.state.tr.insertText(replacement, match.from, match.to);
      tr.setMeta(findKey, { type: 'set', query: st.query, caseSensitive: st.caseSensitive });
      view.dispatch(tr);
      afterFindUpdate();
    },

    /// Replaces every match in ONE transaction (so it's a single undo step). Applied
    /// back-to-front: rewriting the last match first leaves every earlier match's
    /// position untouched, so no position mapping is needed.
    replaceAll(replacement: string) {
      const st = findKey.getState(view.state);
      if (!st || !st.matches.length) return;
      const tr = view.state.tr;
      for (let i = st.matches.length - 1; i >= 0; i--) {
        const match = st.matches[i];
        tr.insertText(replacement, match.from, match.to);
      }
      tr.setMeta(findKey, { type: 'set', query: st.query, caseSensitive: st.caseSensitive });
      view.dispatch(tr);
      afterFindUpdate();
    },

    endFind() {
      document.body.classList.remove('pm-finding', 'pm-search-highlight');
      view.dispatch(view.state.tr.setMeta(findKey, { type: 'clear' }));
    },

    // Tints every match of the note-list search in the open note, without the find
    // bar's dimming or a current match (Notes does the same while a search is active).
    highlightSearch(query: string) {
      document.body.classList.remove('pm-finding');
      document.body.classList.toggle('pm-search-highlight', query.length > 0);
      view.dispatch(view.state.tr.setMeta(findKey, query ? { type: 'set', query, caseSensitive: false } : { type: 'clear' }));
    },

    // The non-editable "28 September 2026 at 12:21" line above the title.
    setDateLine(text: string) {
      let line = document.getElementById('pm-date');
      if (!line) {
        line = document.createElement('div');
        line.id = 'pm-date';
        document.body.insertBefore(line, document.getElementById('editor'));
      }
      line.textContent = text;
    },

    getSelectedText() {
      const { from, to } = linkTargetRange(view.state);
      return view.state.doc.textBetween(from, to, ' ');
    },

    // Add Link sheet: links the selection (or the link the caret is in), replacing
    // its text only when the Name field was changed; with nothing selected it inserts
    // the name, or the URL itself, at the caret.
    insertLink(href: string, name: string) {
      const { state } = view;
      const { from, to } = linkTargetRange(state);
      const current = state.doc.textBetween(from, to, ' ');
      const link = schema.marks.link.create({ href, title: null });
      let tr = state.tr;
      if (from !== to && (!name || name === current)) {
        tr = tr.removeMark(from, to, schema.marks.link).addMark(from, to, link);
      } else {
        const marks = link.addToSet(schema.marks.link.removeFromSet(state.doc.resolve(from).marks()));
        tr = tr.replaceWith(from, to, schema.text(name || href, marks));
      }
      view.dispatch(tr.removeStoredMark(schema.marks.link).scrollIntoView());
      view.focus();
    },

    focus() {
      view.focus();
    },

    blur() {
      (view.dom as HTMLElement).blur();
    },

    getHTML() {
      // Body only — matches what native code actually treats as Note.body;
      // the title lives in Note.title, not in this string.
      return stateToParts(view.state).body;
    },

    // Collapses the current selection to a caret at its head, staying in the
    // same block. Used by Android before opening the "Text Style" dropdown:
    // a real range selection triggers Android's native floating Cut/Copy/Paste
    // toolbar, which renders on top of that dropdown. The block-level commands
    // offered there (heading/paragraph/list/etc.) only need the caret inside
    // the target block, not a preserved range, so collapsing first is safe and
    // makes Android dismiss its native toolbar on its own.
    collapseSelection() {
      const { state, dispatch } = view;
      dispatch(state.tr.setSelection(Selection.near(state.doc.resolve(state.selection.head))));
    },
  };

  window.NativeEditor = bridge;

  postToNative({ type: 'ready' });
});
