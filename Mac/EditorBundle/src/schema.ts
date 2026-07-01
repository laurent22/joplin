/**
 * ProseMirror schema for NotesTN.
 * Adapted from Joplin's packages/editor/ProseMirror/schema.ts.
 * Nodes: doc, paragraph, text, hard_break, heading, code_block, blockquote,
 *        horizontal_rule, bullet_list, ordered_list, list_item,
 *        task_list, task_list_item, image, table nodes.
 * Marks: strong, em, code, strikethrough, link, sub, sup, highlight.
 */

import { Schema } from 'prosemirror-model';
import { tableNodes } from 'prosemirror-tables';

const nodes = {
  doc: {
    content: 'block+',
  },

  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM() { return ['p', 0] as const; },
  },

  text: {
    group: 'inline',
  },

  hard_break: {
    inline: true,
    group: 'inline',
    selectable: false,
    parseDOM: [{ tag: 'br' }],
    toDOM() { return ['br'] as const; },
  },

  heading: {
    attrs: { level: { default: 1 }, collapsed: { default: false } },
    content: 'inline*',
    group: 'block',
    defining: true,
    parseDOM: [1, 2, 3, 4, 5, 6].map(i => ({
      tag: `h${i}`,
      getAttrs(dom: HTMLElement | string) {
        if (typeof dom === 'string') return { level: i };
        return {
          level: i,
          collapsed: (dom as HTMLElement).hasAttribute('data-collapsed'),
        };
      },
    })),
    toDOM(node: any) {
      const attrs: Record<string, string> = {};
      if (node.attrs.collapsed) attrs['data-collapsed'] = '';
      // Non-editable arrow span + content hole in a second span.
      // The arrow is purely visual (CSS ::after); the content hole carries the text.
      return [`h${node.attrs.level}`, attrs,
        ['span', { class: 'pm-heading-arrow', contenteditable: 'false' }],
        ['span', { class: 'pm-heading-content' }, 0],
      ] as any;
    },
  },

  code_block: {
    content: 'text*',
    marks: '',
    group: 'block',
    code: true,
    defining: true,
    parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' as const }],
    toDOM() { return ['pre', ['code', 0]] as const; },
  },

  blockquote: {
    content: 'block+',
    group: 'block',
    defining: true,
    parseDOM: [{ tag: 'blockquote' }],
    toDOM() { return ['blockquote', 0] as const; },
  },

  horizontal_rule: {
    group: 'block',
    parseDOM: [{ tag: 'hr' }],
    toDOM() { return ['hr'] as const; },
  },

  // Standard bullet list (ul without data-is-checklist)
  bullet_list: {
    group: 'block',
    content: 'list_item+',
    parseDOM: [{ tag: 'ul:not([data-is-checklist])' }],
    toDOM() { return ['ul', 0] as const; },
  },

  // Standard ordered list
  ordered_list: {
    group: 'block',
    content: 'list_item+',
    attrs: { order: { default: 1 } },
    parseDOM: [{
      tag: 'ol',
      getAttrs(dom: HTMLElement | string) {
        if (typeof dom === 'string') return {};
        return { order: dom.hasAttribute('start') ? +(dom.getAttribute('start') || 1) : 1 };
      },
    }],
    toDOM(node: any) {
      return node.attrs.order === 1
        ? ['ol', 0]
        : ['ol', { start: node.attrs.order }, 0];
    },
  },

  // Standard list item (for bullet/ordered lists)
  list_item: {
    content: 'paragraph block*',
    defining: true,
    parseDOM: [{ tag: 'li:not(.md-checkbox)' }],
    toDOM() { return ['li', 0] as const; },
  },

  // Task list container (ul with data-is-checklist)
  task_list: {
    group: 'block',
    content: 'task_list_item+',
    parseDOM: [{ tag: 'ul[data-is-checklist]' }],
    toDOM() { return ['ul', { 'data-is-checklist': 'true' }, 0] as const; },
  },

  // Task list item (checkbox + content)
  task_list_item: {
    attrs: { checked: { default: false } },
    content: 'paragraph block*',
    defining: true,
    parseDOM: [{
      tag: 'li.md-checkbox',
      getAttrs(dom: HTMLElement | string) {
        if (typeof dom === 'string') return {};
        const checkbox = dom.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
        return { checked: checkbox?.checked ?? false };
      },
    }],
    toDOM(node: any) {
      const li = ['li', { class: node.attrs.checked ? 'md-checkbox checked' : 'md-checkbox' }];
      const checkbox = ['input', {
        type: 'checkbox',
        ...(node.attrs.checked ? { checked: '' } : {}),
      }];
      return [...li, checkbox, ['div', 0]] as any;
    },
  },

  // Toggle / collapsible section
  details: {
    attrs: { open: { default: true } },
    group: 'block',
    content: 'details_summary block+',
    defining: true,
    parseDOM: [{
      tag: 'details',
      getAttrs(dom: HTMLElement | string) {
        if (typeof dom === 'string') return {};
        return { open: (dom as HTMLElement).hasAttribute('open') };
      },
    }],
    toDOM(node: any) {
      return ['details', node.attrs.open ? { open: '' } : {}, 0] as const;
    },
  },

  // Summary / title line inside a toggle block
  details_summary: {
    content: 'inline*',
    defining: true,
    parseDOM: [{ tag: 'summary' }],
    toDOM() {
      // The arrow span is non-editable (CSS ::after draws the triangle).
      // The content hole goes into the second span so ProseMirror manages it.
      return ['summary', {},
        ['span', { class: 'pm-toggle-arrow', contenteditable: 'false' }],
        ['span', { class: 'pm-toggle-content' }, 0],
      ] as any;
    },
  },

  // Image node
  image: {
    inline: true,
    attrs: {
      src: {},
      alt: { default: null },
      title: { default: null },
      width: { default: null },
      height: { default: null },
      'data-resource-id': { default: null },
    },
    group: 'inline',
    draggable: true,
    parseDOM: [{
      tag: 'img[src]',
      getAttrs(dom: HTMLElement | string) {
        if (typeof dom === 'string') return {};
        return {
          src: dom.getAttribute('src'),
          alt: dom.getAttribute('alt'),
          title: dom.getAttribute('title'),
          width: dom.getAttribute('width'),
          height: dom.getAttribute('height'),
          'data-resource-id': dom.getAttribute('data-resource-id'),
        };
      },
    }],
    toDOM(node: any) {
      const { src, alt, title, width, height } = node.attrs;
      const attrs: Record<string, string> = { src };
      if (alt) attrs.alt = alt;
      if (title) attrs.title = title;
      if (width) attrs.width = width;
      if (height) attrs.height = height;
      if (node.attrs['data-resource-id']) attrs['data-resource-id'] = node.attrs['data-resource-id'];
      return ['img', attrs];
    },
  },

  // Table nodes from prosemirror-tables
  ...tableNodes({
    tableGroup: 'block',
    cellContent: 'block+',
    cellAttributes: {},
  }),
};

const marks = {
  strong: {
    parseDOM: [
      { tag: 'strong' },
      { tag: 'b', getAttrs: (n: HTMLElement | string) => typeof n !== 'string' && n.style.fontWeight !== 'normal' && null },
      { style: 'font-weight=400', clearMark: (m: any) => m.type.name === 'strong' },
      { style: 'font-weight', getAttrs: (value: string | HTMLElement) => typeof value === 'string' && /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null },
    ],
    toDOM() { return ['strong', 0] as const; },
  },

  em: {
    parseDOM: [
      { tag: 'i' },
      { tag: 'em' },
      { style: 'font-style=italic' },
      { style: 'font-style=oblique' },
    ],
    toDOM() { return ['em', 0] as const; },
  },

  code: {
    parseDOM: [{ tag: 'code' }],
    toDOM() { return ['code', 0] as const; },
  },

  strikethrough: {
    parseDOM: [
      { tag: 's' },
      { tag: 'del' },
      { tag: 'strike' },
      { style: 'text-decoration=line-through' },
    ],
    toDOM() { return ['s', 0] as const; },
  },

  link: {
    attrs: {
      href: {},
      title: { default: null },
    },
    inclusive: false,
    parseDOM: [{
      tag: 'a[href]',
      getAttrs(dom: HTMLElement | string) {
        if (typeof dom === 'string') return {};
        return {
          href: dom.getAttribute('href'),
          title: dom.getAttribute('title'),
        };
      },
    }],
    toDOM(node: any) {
      const { href, title } = node.attrs;
      return ['a', { href, ...(title ? { title } : {}) }, 0] as const;
    },
  },

  sub: {
    parseDOM: [{ tag: 'sub' }],
    toDOM() { return ['sub', 0] as const; },
  },

  sup: {
    parseDOM: [{ tag: 'sup' }],
    toDOM() { return ['sup', 0] as const; },
  },

  highlight: {
    parseDOM: [{ tag: 'mark' }],
    toDOM() { return ['mark', 0] as const; },
  },
};

const schema = new Schema({ nodes, marks });

export default schema;
