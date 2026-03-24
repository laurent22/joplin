import * as React from 'react';
import { encryptionSearchKeywords, highlightText, matchesSearchQueryValue } from './searchUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ElementProps {
	children?: React.ReactNode;
	className?: string;
}

/** Recursively collect the text content of every <mark> element in a ReactNode. */
function markedSegments(node: React.ReactNode): string[] {
	if (!node) return [];
	if (typeof node === 'string' || typeof node === 'number') return [];

	if (React.isValidElement(node)) {
		const props = node.props as ElementProps;
		if (node.type === 'mark') return [props.children as string];
		if (Array.isArray(props.children)) return props.children.flatMap(markedSegments);
		return markedSegments(props.children);
	}

	if (Array.isArray(node)) return node.flatMap(markedSegments);
	return [];
}

function findFirstMark(node: React.ReactNode): React.ReactElement|null {
	if (!node) return null;
	if (React.isValidElement(node)) {
		if (node.type === 'mark') return node;
		const props = node.props as ElementProps;
		return findFirstMark(props.children);
	}
	if (Array.isArray(node)) {
		for (const c of node) {
			const found = findFirstMark(c);
			if (found) return found;
		}
	}
	return null;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ConfigScreen search helpers', () => {

	// matchesSearchQueryValue

	test('matches query by case-insensitive substring in label/description', () => {
		expect(matchesSearchQueryValue('enc', ['End-to-end encryption', 'Encryption: Enabled'])).toBe(true);
	});

	test('matches query against section title', () => {
		expect(matchesSearchQueryValue('sync', 'unrelated content', 'Synchronisation')).toBe(true);
	});

	test.each([
		['empty string', ''],
		['whitespace only', '   '],
	])('does not match when query is %s', (_label, query) => {
		expect(matchesSearchQueryValue(query, 'End-to-end encryption', 'Encryption')).toBe(false);
	});

	test('does not match when query is a superset of the section title', () => {
		// Regression: old bidirectional check matched "synchronize" against section "sync"
		// because "synchronize".includes("sync"). The current one-way check must not match.
		expect(matchesSearchQueryValue('synchronize', '', 'sync')).toBe(false);
	});

	test('does not match when both text and section are unrelated to query', () => {
		expect(matchesSearchQueryValue('appearance', 'Font size', 'Synchronisation')).toBe(false);
	});

	test('matches substring in the middle of a label', () => {
		expect(matchesSearchQueryValue('size', 'Font size', '')).toBe(true);
	});

	test('is case-insensitive for section title', () => {
		expect(matchesSearchQueryValue('SYNC', '', 'Synchronisation')).toBe(true);
	});

	// highlightText

	test('returns the original string unchanged when there is no match', () => {
		expect(highlightText('Hello World', 'xyz')).toBe('Hello World');
	});

	test.each([
		['empty string', ''],
		['whitespace only', '   '],
	])('returns the original string unchanged when query is %s', (_label, query) => {
		expect(highlightText('Hello', query)).toBe('Hello');
	});

	test('wraps the matched portion in a mark element', () => {
		const result = highlightText('Font size', 'font');
		expect(markedSegments(result)).toEqual(['Font']);
	});

	test('is case-insensitive and preserves original casing of the text', () => {
		const result = highlightText('Synchronisation', 'SYNC');
		// The mark content must use the text's own casing, not the query's.
		expect(markedSegments(result)).toEqual(['Sync']);
	});

	test('marks all non-overlapping occurrences', () => {
		const result = highlightText('test this test case test', 'test');
		expect(markedSegments(result)).toEqual(['test', 'test', 'test']);
	});

	test('mark element has the search-highlight class', () => {
		const result = highlightText('Font size', 'font');
		const markEl = findFirstMark(result);
		expect(markEl).not.toBeNull();
		expect((markEl!.props as ElementProps).className).toBe('search-highlight');
	});

	test('returns empty string unchanged when text is empty', () => {
		expect(highlightText('', 'font')).toBe('');
	});

	// encryptionSearchKeywords

	const identity = (input: string) => input;

	test.each([
		[
			'disabled',
			false,
			['End-to-end encryption', 'Enable encryption'],
		],
		[
			'enabled',
			true,
			['End-to-end encryption', 'Disable encryption'],
		],
	] as const)('returns expected keywords when encryption is %s', (_label, enabled, expected) => {
		expect(encryptionSearchKeywords(enabled, identity)).toEqual(expected);
	});
});
