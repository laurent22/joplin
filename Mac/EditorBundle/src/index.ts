/**
 * NotesTN Editor — ProseMirror entry point.
 *
 * Runs inside WKWebView. Communicates with Swift via:
 *   JS → Swift:  window.webkit.messageHandlers.editorMessage.postMessage(msg)
 *   Swift → JS:  window.NativeEditor.setContent(html) / execCommand(cmd, value) etc.
 */

import { EditorState, Plugin, Transaction } from 'prosemirror-state';
import { EditorView, DirectEditorProps, Decoration, DecorationSet } from 'prosemirror-view';
import { DOMParser as PMDOMParser, DOMSerializer, Fragment } from 'prosemirror-model';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, chainCommands, exitCode, newlineInCode } from 'prosemirror-commands';
import { splitListItem, liftListItem, sinkListItem } from 'prosemirror-schema-list';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { tableEditing, columnResizing } from 'prosemirror-tables';
import { inputRules, wrappingInputRule, textblockTypeInputRule, smartQuotes, emDash, ellipsis, InputRule } from 'prosemirror-inputrules';

import schema from './schema';
import { commands, toggleCheckbox } from './commands';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SelectionState {
  bold: boolean;
  italic: boolean;
  code: boolean;
  strikethrough: boolean;
  inCode: boolean;       // cursor is inside code_block
  inBlockquote: boolean;
  inBulletList: boolean;
  inOrderedList: boolean;
  inTaskList: boolean;
  inCheckedTask: boolean;
  headingLevel: number;  // 0 = not a heading
  hasLink: boolean;
  linkHref: string | null;
}

interface NativeMessage {
  type: 'contentChanged' | 'selectionChanged' | 'imageRequested' | 'ready' | 'log' | 'openUrl';
  html?: string;
  selectionState?: SelectionState;
  message?: string;
  url?: string;
}

// ── Swift bridge ──────────────────────────────────────────────────────────────

function postToNative(msg: NativeMessage) {
  try {
    window.webkit?.messageHandlers?.['editorMessage']?.postMessage(msg);
  } catch (_) {
    // Not running in WKWebView (dev mode) — ignore
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

// ── Build editor keymap ────────────────────────────────────────────────────────

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

    // Enter in list items
    'Enter': chainCommands(
      splitListItem(task_list_item),
      splitListItem(list_item),
      newlineInCode,
      exitCode,
    ),

    // Lift out with Backspace — only when cursor is at the very start of an empty list item.
    // Without the parentOffset guard, liftListItem fires mid-word and removes list formatting.
    'Backspace': chainCommands(
      (state, dispatch) => {
        if (state.selection.$from.parentOffset > 0) return false;
        return liftListItem(task_list_item)(state, dispatch);
      },
      (state, dispatch) => {
        if (state.selection.$from.parentOffset > 0) return false;
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
    inCode,
    inBlockquote,
    inBulletList,
    inOrderedList,
    inTaskList,
    inCheckedTask,
    headingLevel,
    hasLink,
    linkHref,
  };
}

// ── HTML serialization ────────────────────────────────────────────────────────

const serializer = DOMSerializer.fromSchema(schema);

function stateToHTML(state: EditorState): string {
  const fragment = serializer.serializeFragment(state.doc.content);
  const div = document.createElement('div');
  div.appendChild(fragment);
  return div.innerHTML;
}

// ── Editor setup ──────────────────────────────────────────────────────────────

function createEditor(): EditorView {
  const domEl = document.getElementById('editor');
  if (!domEl) throw new Error('#editor element not found');

  let lastHTML = '';
  let selectionDebounce: ReturnType<typeof setTimeout> | null = null;

  const notifyContent = (state: EditorState) => {
    const html = stateToHTML(state);
    if (html !== lastHTML) {
      lastHTML = html;
      postToNative({ type: 'contentChanged', html });
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
      columnResizing(),
      tableEditing(),

      // Open links in default browser on click
      new Plugin({
        props: {
          handleDOMEvents: {
            click(_view, event) {
              const anchor = (event.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
              if (!anchor) return false;
              event.preventDefault();
              postToNative({ type: 'openUrl', url: anchor.href });
              return true;
            },
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
              if (node.type !== schema.nodes.heading || !node.attrs.collapsed) continue;
              const level = node.attrs.level as number;
              for (let j = i + 1; j < topLevel.length; j++) {
                const next = topLevel[j];
                if (next.node.type === schema.nodes.heading && next.node.attrs.level <= level) break;
                decos.push(Decoration.node(next.offset, next.offset + next.node.nodeSize, {
                  class: 'pm-heading-section-hidden',
                }));
              }
            }
            return DecorationSet.create(state.doc, decos);
          },

          // Toggle collapsed state when the arrow span is clicked.
          handleDOMEvents: {
            mousedown(view, event) {
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
          handleDOMEvents: {
            mousedown(view, event) {
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

      // Handle checkbox clicks in task list items
      new Plugin({
        props: {
          handleDOMEvents: {
            mousedown(view, event) {
              const target = event.target as HTMLElement;
              if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
                event.preventDefault();
                toggleCheckbox(view);
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
                    const src = e.target?.result as string;
                    if (src) {
                      // Insert as data URI; Swift will replace with resource later
                      commands.image(view, { src });
                    }
                  };
                  reader.readAsDataURL(file);
                  // Image is already inserted as a data URI — no need to open the file picker.
                }
                return true;
              }
            }
            return false;
          },
        },
      }),
    ],
  });

  const view = new EditorView(domEl, {
    state,
    dispatchTransaction: (tr) => dispatchWithNotify(view)(tr),
  });

  // Initial selection state
  notifySelection(view.state);

  return view;
}

// ── Native API (called from Swift via evaluateJavaScript) ─────────────────────

interface NativeEditorBridge {
  setContent: (html: string) => void;
  execCommand: (command: string, value?: any) => void;
  focus: () => void;
  blur: () => void;
  getHTML: () => string;
}

declare global {
  interface Window {
    NativeEditor: NativeEditorBridge;
    webkit?: {
      messageHandlers?: {
        [key: string]: { postMessage: (msg: any) => void };
      };
    };
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

  const bridge: NativeEditorBridge = {
    setContent(html: string) {
      const parser = PMDOMParser.fromSchema(schema);
      const domParser = new DOMParser();
      const doc = domParser.parseFromString(html || '<p></p>', 'text/html');
      const parsed = parser.parse(doc.body, { preserveWhitespace: true });
      const newState = EditorState.create({
        doc: parsed,
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

    focus() {
      view.focus();
    },

    blur() {
      (view.dom as HTMLElement).blur();
    },

    getHTML() {
      return stateToHTML(view.state);
    },
  };

  window.NativeEditor = bridge;

  postToNative({ type: 'ready' });
});
