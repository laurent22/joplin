/**
 * Editor commands — maps command names (sent from Swift) to ProseMirror commands.
 * Each command takes the EditorView and optional value, returns boolean (applied or not).
 */

import { EditorView } from 'prosemirror-view';
import { EditorState, NodeSelection, Transaction } from 'prosemirror-state';
import {
  toggleMark,
  setBlockType,
  chainCommands,
  exitCode,
  selectAll as pmSelectAll,
  wrapIn,
  lift,
} from 'prosemirror-commands';
import {
  wrapInList,
  liftListItem,
  sinkListItem,
  splitListItem,
} from 'prosemirror-schema-list';
import { undo, redo } from 'prosemirror-history';
import schema from './schema';

export type CommandFn = (view: EditorView, value?: any) => boolean;

// ── Inline marks ──────────────────────────────────────────────────────────────

const toggleBold: CommandFn = (view) =>
  toggleMark(schema.marks.strong)(view.state, view.dispatch, view);

const toggleItalic: CommandFn = (view) =>
  toggleMark(schema.marks.em)(view.state, view.dispatch, view);

const toggleCode: CommandFn = (view) =>
  toggleMark(schema.marks.code)(view.state, view.dispatch, view);

const toggleStrikethrough: CommandFn = (view) =>
  toggleMark(schema.marks.strikethrough)(view.state, view.dispatch, view);

const toggleSub: CommandFn = (view) =>
  toggleMark(schema.marks.sub)(view.state, view.dispatch, view);

const toggleSup: CommandFn = (view) =>
  toggleMark(schema.marks.sup)(view.state, view.dispatch, view);

const toggleHighlight: CommandFn = (view) =>
  toggleMark(schema.marks.highlight)(view.state, view.dispatch, view);

const setLink: CommandFn = (view, value?: { href: string; title?: string }) => {
  if (!value?.href) {
    // Remove link
    return toggleMark(schema.marks.link)(view.state, view.dispatch, view);
  }
  const attrs = { href: value.href, title: value.title ?? null };
  return toggleMark(schema.marks.link, attrs)(view.state, view.dispatch, view);
};

// ── Block types ───────────────────────────────────────────────────────────────

const setParagraph: CommandFn = (view) =>
  setBlockType(schema.nodes.paragraph)(view.state, view.dispatch, view);

const setHeading: CommandFn = (view, level?: number) =>
  setBlockType(schema.nodes.heading, { level: level ?? 1 })(view.state, view.dispatch, view);

const setCodeBlock: CommandFn = (view) =>
  setBlockType(schema.nodes.code_block)(view.state, view.dispatch, view);

const toggleBlockquote: CommandFn = (view) => {
  const { state, dispatch } = view;
  const { $from } = state.selection;
  let inBlockquote = false;
  for (let d = $from.depth; d >= 0; d--) {
    if ($from.node(d).type === schema.nodes.blockquote) {
      inBlockquote = true;
      break;
    }
  }
  if (inBlockquote) {
    return lift(state, dispatch, view);
  }
  return wrapIn(schema.nodes.blockquote)(state, dispatch, view);
};

// ── Lists ─────────────────────────────────────────────────────────────────────

const toggleBulletList: CommandFn = (view) => {
  const { state, dispatch } = view;
  if (isInListType(state, schema.nodes.bullet_list)) {
    return liftListItem(schema.nodes.list_item)(state, dispatch);
  }
  return wrapInList(schema.nodes.bullet_list)(state, dispatch, view);
};

const toggleOrderedList: CommandFn = (view) => {
  const { state, dispatch } = view;
  if (isInListType(state, schema.nodes.ordered_list)) {
    return liftListItem(schema.nodes.list_item)(state, dispatch);
  }
  return wrapInList(schema.nodes.ordered_list)(state, dispatch, view);
};

const toggleTaskList: CommandFn = (view) => {
  const { state, dispatch } = view;
  if (isInListType(state, schema.nodes.task_list)) {
    return liftListItem(schema.nodes.task_list_item)(state, dispatch);
  }
  return wrapInList(schema.nodes.task_list)(state, dispatch, view);
};

function isInListType(state: EditorState, listType: any): boolean {
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    if ($from.node(d).type === listType) return true;
  }
  return false;
}

// ── Insert ────────────────────────────────────────────────────────────────────

const insertHorizontalRule: CommandFn = (view) => {
  const { state, dispatch } = view;
  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(schema.nodes.horizontal_rule.create()));
  }
  return true;
};

const insertImage: CommandFn = (view, value?: { src: string; alt?: string; resourceId?: string }) => {
  if (!value?.src) return false;
  const { state, dispatch } = view;
  const attrs: Record<string, any> = { src: value.src };
  if (value.alt) attrs.alt = value.alt;
  if (value.resourceId) attrs['data-resource-id'] = value.resourceId;
  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(schema.nodes.image.create(attrs)));
  }
  return true;
};

const insertTable: CommandFn = (view, value?: { rows: number; cols: number }) => {
  const rows = value?.rows ?? 3;
  const cols = value?.cols ?? 3;
  const { state, dispatch } = view;

  const cells = Array(cols).fill(null).map(() =>
    schema.nodes.table_cell.create(null, schema.nodes.paragraph.create())
  );
  const headerCells = Array(cols).fill(null).map(() =>
    schema.nodes.table_header.create(null, schema.nodes.paragraph.create())
  );
  const tableRows = [
    schema.nodes.table_row.create(null, headerCells),
    ...Array(rows - 1).fill(null).map(() =>
      schema.nodes.table_row.create(null, cells.map(c => c.copy(c.content)))
    ),
  ];
  const table = schema.nodes.table.create(null, tableRows);

  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(table).scrollIntoView());
  }
  return true;
};

// ── Toggle / collapsible block ────────────────────────────────────────────────

const insertToggle: CommandFn = (view) => {
  const { state, dispatch } = view;
  const summary = schema.nodes.details_summary.create(null, schema.text('Toggle'));
  const body = schema.nodes.paragraph.create();
  const toggle = schema.nodes.details.create({ open: true }, [summary, body]);
  if (dispatch) {
    dispatch(state.tr.replaceSelectionWith(toggle).scrollIntoView());
  }
  return true;
};

// ── Toggle checkbox ───────────────────────────────────────────────────────────

export const toggleCheckbox: CommandFn = (view) => {
  const { state, dispatch } = view;
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const node = $from.node(d);
    if (node.type === schema.nodes.task_list_item) {
      if (dispatch) {
        const pos = $from.before(d);
        const checked = !node.attrs.checked;
        dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, checked }));
      }
      return true;
    }
  }
  return false;
};

// ── Indent / outdent ──────────────────────────────────────────────────────────

const indentList: CommandFn = (view) => {
  const { state, dispatch } = view;
  // Try task_list_item first, then list_item
  return sinkListItem(schema.nodes.task_list_item)(state, dispatch) ||
    sinkListItem(schema.nodes.list_item)(state, dispatch);
};

const outdentList: CommandFn = (view) => {
  const { state, dispatch } = view;
  return liftListItem(schema.nodes.task_list_item)(state, dispatch) ||
    liftListItem(schema.nodes.list_item)(state, dispatch);
};

// ── History ───────────────────────────────────────────────────────────────────

const undoCmd: CommandFn = (view) => undo(view.state, view.dispatch);
const redoCmd: CommandFn = (view) => redo(view.state, view.dispatch);
const selectAllCmd: CommandFn = (view) => pmSelectAll(view.state, view.dispatch, view);

// ── Command registry ──────────────────────────────────────────────────────────

export const commands: Record<string, CommandFn> = {
  // Inline marks
  bold: toggleBold,
  italic: toggleItalic,
  code: toggleCode,
  strikethrough: toggleStrikethrough,
  subscript: toggleSub,
  superscript: toggleSup,
  highlight: toggleHighlight,
  link: setLink,

  // Block types
  paragraph: setParagraph,
  heading1: (v) => setHeading(v, 1),
  heading2: (v) => setHeading(v, 2),
  heading3: (v) => setHeading(v, 3),
  heading4: (v) => setHeading(v, 4),
  heading5: (v) => setHeading(v, 5),
  heading6: (v) => setHeading(v, 6),
  codeBlock: setCodeBlock,
  blockquote: toggleBlockquote,

  // Lists
  bulletList: toggleBulletList,
  orderedList: toggleOrderedList,
  taskList: toggleTaskList,
  toggleCheckbox,
  indent: indentList,
  outdent: outdentList,

  // Insert
  horizontalRule: insertHorizontalRule,
  image: insertImage,
  table: insertTable,
  toggle: insertToggle,

  // History
  undo: undoCmd,
  redo: redoCmd,
  selectAll: selectAllCmd,
};
