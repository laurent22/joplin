// This is a fork of CodeMirror's insertNewlineContinueMarkup, which is based on the
// version of the file before this commit: https://github.com/codemirror/lang-markdown/commit/fa289d542f65451957c562780d5dd846bee060d4
//
// Newer versions of the code handle non-tight lists in a way that many users find
// unexpected.
//
// The original source has the following license:
// !
// ! Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
// !
// ! Permission is hereby granted, free of charge, to any person obtaining a copy
// ! of this software and associated documentation files (the "Software"), to deal
// ! in the Software without restriction, including without limitation the rights
// ! to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// ! copies of the Software, and to permit persons to whom the Software is
// ! furnished to do so, subject to the following conditions:
// !
// ! The above copyright notice and this permission notice shall be included in
// ! all copies or substantial portions of the Software.

import { markdownLanguage } from '@codemirror/lang-markdown';
import { indentUnit, syntaxTree } from '@codemirror/language';
import { ChangeSpec, countColumn, EditorSelection, EditorState, StateCommand, Text } from '@codemirror/state';
import { SyntaxNode } from '@lezer/common';


class Context {
	public constructor(
		public readonly node: SyntaxNode,
		public readonly from: number,
		public readonly to: number,
		public readonly spaceBefore: string,
		public readonly spaceAfter: string,
		public readonly type: string,
		public readonly item: SyntaxNode | null,
	) { }

	public blank(maxWidth: number | null, trailing = true) {
		let result = this.spaceBefore + (this.node.name === 'Blockquote' ? '>' : '');
		if (maxWidth !== null) {
			while (result.length < maxWidth) result += ' ';
			return result;
		} else {
			for (let i = this.to - this.from - result.length - this.spaceAfter.length; i > 0; i--) result += ' ';
			return result + (trailing ? this.spaceAfter : '');
		}
	}

	public marker(doc: Text, add: number) {
		const number = this.node.name === 'OrderedList' ? String((+itemNumber(this.item!, doc)[2] + add)) : '';
		return this.spaceBefore + number + this.type + this.spaceAfter;
	}
}

function getContext(node: SyntaxNode, doc: Text) {
	const nodes = [];
	for (let cur: SyntaxNode | null = node; cur && cur.name !== 'Document'; cur = cur.parent) {
		if (cur.name === 'ListItem' || cur.name === 'Blockquote' || cur.name === 'FencedCode') { nodes.push(cur); }
	}
	const context = [];
	for (let i = nodes.length - 1; i >= 0; i--) {
		const node = nodes[i];
		let match;
		const line = doc.lineAt(node.from), startPos = node.from - line.from;
		if (node.name === 'FencedCode') {
			context.push(new Context(node, startPos, startPos, '', '', '', null));
		} else if (node.name === 'Blockquote' && (match = /^ *>( ?)/.exec(line.text.slice(startPos)))) {
			context.push(new Context(node, startPos, startPos + match[0].length, '', match[1], '>', null));
		} else if (node.name === 'ListItem' && node.parent!.name === 'OrderedList' &&
			(match = /^( *)\d+([.)])( *)/.exec(line.text.slice(startPos)))) {
			let after = match[3], len = match[0].length;
			if (after.length >= 4) { after = after.slice(0, after.length - 4); len -= 4; }
			context.push(new Context(node.parent!, startPos, startPos + len, match[1], after, match[2], node));
		} else if (node.name === 'ListItem' && node.parent!.name === 'BulletList' &&
			(match = /^( *)([-+*])( {1,4}\[[ xX]\])?( +)/.exec(line.text.slice(startPos)))) {
			let after = match[4], len = match[0].length;
			if (after.length > 4) { after = after.slice(0, after.length - 4); len -= 4; }
			let type = match[2];
			if (match[3]) type += match[3].replace(/[xX]/, ' ');
			context.push(new Context(node.parent!, startPos, startPos + len, match[1], after, type, node));
		}
	}
	return context;
}

function itemNumber(item: SyntaxNode, doc: Text) {
	return /^(\s*)(\d+)(?=[.)])/.exec(doc.sliceString(item.from, item.from + 10))!;
}

function normalizeIndent(content: string, state: EditorState) {
	const blank = /^[ \t]*/.exec(content)![0].length;
	if (!blank || state.facet(indentUnit) !== '\t') return content;
	const col = countColumn(content, 4, blank);
	let space = '';
	for (let i = col; i > 0;) {
		if (i >= 4) { space += '\t'; i -= 4; } else { space += ' '; i--; }
	}
	return space + content.slice(blank);
}

function renumberList(after: SyntaxNode, doc: Text, changes: ChangeSpec[], offset = 0) {
	for (let prev = -1, node = after; ;) {
		if (node.name === 'ListItem') {
			const m = itemNumber(node, doc);
			const number = +m[2];
			if (prev >= 0) {
				if (number !== prev + 1) return;
				changes.push({ from: node.from + m[1].length, to: node.from + m[0].length, insert: String(prev + 2 + offset) });
			}
			prev = number;
		}
		const next = node.nextSibling;
		if (!next) break;
		node = next;
	}
}

const insertNewlineContinueMarkup: StateCommand = ({ state, dispatch }) => {
	const tree = syntaxTree(state), { doc } = state;
	let dont = null;
	const changes = state.changeByRange(range => {
		if (!range.empty || !markdownLanguage.isActiveAt(state, range.from)) return dont = { range };
		const pos = range.from, line = doc.lineAt(pos);
		const context = getContext(tree.resolveInner(pos, -1), doc);
		while (context.length && context[context.length - 1].from > pos - line.from) context.pop();
		if (!context.length) return dont = { range };
		const inner = context[context.length - 1];
		if (inner.to - inner.spaceAfter.length > pos - line.from) return dont = { range };

		const emptyLine = pos >= (inner.to - inner.spaceAfter.length) && !/\S/.test(line.text.slice(inner.to));
		// Empty line in list
		if (inner.item && emptyLine) {
			// First list item or blank line before: delete a level of markup
			if (inner.node.firstChild!.to >= pos ||
				line.from > 0 && !/[^\s>]/.test(doc.lineAt(line.from - 1).text)) {
				const next = context.length > 1 ? context[context.length - 2] : null;
				let delTo, insert = '';
				if (next && next.item) { // Re-add marker for the list at the next level
					delTo = line.from + next.from;
					insert = next.marker(doc, 1);
				} else {
					delTo = line.from + (next ? next.to : 0);
				}
				const changes: ChangeSpec[] = [{ from: delTo, to: pos, insert }];
				if (inner.node.name === 'OrderedList') renumberList(inner.item!, doc, changes, -2);
				if (next && next.node.name === 'OrderedList') renumberList(next.item!, doc, changes);
				return { range: EditorSelection.cursor(delTo + insert.length), changes };
			} else { // Move this line down
				let insert = '';
				for (let i = 0, e = context.length - 2; i <= e; i++) {
					insert += context[i].blank(i < e ? countColumn(line.text, 4, context[i + 1].from) - insert.length : null, i < e);
				}
				insert = normalizeIndent(insert, state);
				return {
					range: EditorSelection.cursor(pos + insert.length + 1),
					changes: { from: line.from, insert: insert + state.lineBreak },
				};
			}
		}

		if (inner.node.name === 'Blockquote' && emptyLine && line.from) {
			const prevLine = doc.lineAt(line.from - 1), quoted = />\s*$/.exec(prevLine.text);
			// Two aligned empty quoted lines in a row
			if (quoted && quoted.index === inner.from) {
				const changes = state.changes([{ from: prevLine.from + quoted.index, to: prevLine.to },
					{ from: line.from + inner.from, to: line.to }]);
				return { range: range.map(changes), changes };
			}
		}

		const changes: ChangeSpec[] = [];
		if (inner.node.name === 'OrderedList') renumberList(inner.item!, doc, changes);
		const continued = inner.item && inner.item.from < line.from;
		let insert = '';
		// If not de-indented
		if (!continued || /^[\s\d.)\-+*>]*/.exec(line.text)![0].length >= inner.to) {
			for (let i = 0, e = context.length - 1; i <= e; i++) {
				insert += i === e && !continued ? context[i].marker(doc, 1)
					: context[i].blank(i < e ? countColumn(line.text, 4, context[i + 1].from) - insert.length : null);
			}
		}
		let from = pos;
		while (from > line.from && /\s/.test(line.text.charAt(from - line.from - 1))) from--;
		insert = normalizeIndent(insert, state);
		changes.push({ from, to: pos, insert: state.lineBreak + insert });
		return { range: EditorSelection.cursor(from + insert.length + 1), changes };
	});
	if (dont) return false;
	dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input' }));
	return true;
};

export default insertNewlineContinueMarkup;
