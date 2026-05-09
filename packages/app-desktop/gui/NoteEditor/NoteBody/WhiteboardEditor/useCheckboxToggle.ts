import { useCallback, useEffect, useRef } from 'react';

// Joplin's renderer emits `<input type="checkbox">` elements for `- [ ]` /
// `- [x]` markdown syntax, with an inline onclick that calls
// `ipcProxySendToHost(...)` — that handler doesn't exist outside the note
// viewer iframe, so clicks are no-ops in our card context.
//
// This hook returns a callback ref. Attach it to the container that holds
// the rendered HTML (`<div ref={checkboxRef} dangerouslySetInnerHTML={...} />`).
// On every change to that container's children, the hook rewires checkboxes
// inside it: it strips the broken inline onclick, makes them enabled, and
// installs a click listener that flips the corresponding `[ ]` / `[x]` in
// the source markdown by index.

interface Options {
	body: string;
	onChange: (newBody: string)=> void;
}

// Matches a markdown task-list checkbox. The capture group is the inner
// character (' ' or 'x' / 'X'). Joplin's renderer only treats `- [ ]` /
// `- [x]` (dash-prefixed list items) as checkboxes — `*` and `+` markers and
// numbered lists are ignored — so we match exactly that subset, including
// Windows line endings.
const checkboxRegex = /(?<=(?:^|\r?\n)[ \t]*-[ \t]+)\[([ xX])\]/g;

// Exported for tests. Returns the body with the Nth `- [ ]` / `- [x]`
// flipped, or null if there's no Nth checkbox.
export const flipNthCheckbox = (body: string, index: number): string | null => {
	let count = 0;
	let result = '';
	let lastIndex = 0;
	let mutated = false;
	const regex = new RegExp(checkboxRegex.source, 'g');
	let match: RegExpExecArray | null;
	while ((match = regex.exec(body)) !== null) {
		if (count === index) {
			const newChar = match[1] === ' ' ? 'x' : ' ';
			result += `${body.slice(lastIndex, match.index)}[${newChar}]`;
			lastIndex = match.index + match[0].length;
			mutated = true;
			break;
		}
		count++;
	}
	if (!mutated) return null;
	return result + body.slice(lastIndex);
};

const useCheckboxToggle = ({ body, onChange }: Options) => {
	const bodyRef = useRef(body);
	bodyRef.current = body;
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const observerRef = useRef<MutationObserver | null>(null);
	// Track which checkbox elements have already been wired up. WeakSet so
	// removed elements can be GC'd without leaking entries.
	const wiredRef = useRef<WeakSet<HTMLInputElement>>(new WeakSet());

	const wireUp = useCallback((root: HTMLElement) => {
		const checkboxes = root.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
		for (const cb of Array.from(checkboxes)) {
			if (wiredRef.current.has(cb)) continue;
			wiredRef.current.add(cb);
			cb.disabled = false;
			cb.removeAttribute('disabled');
			// Strip the renderer's inline onclick — it tries to call
			// ipcProxySendToHost, which we don't expose in this context.
			cb.removeAttribute('onclick');
			(cb as HTMLInputElement & { onclick: unknown }).onclick = null;
			cb.addEventListener('click', (e) => {
				e.stopPropagation();
				// Recompute the checkbox's current position at click time —
				// the wire-time index goes stale after DOM insertions or
				// removals (e.g. an external edit added/removed a list item
				// before this one).
				const current = Array.from(root.querySelectorAll<HTMLInputElement>('input[type=checkbox]'));
				const currentIndex = current.indexOf(cb);
				if (currentIndex < 0) return;
				const next = flipNthCheckbox(bodyRef.current, currentIndex);
				if (next !== null) onChangeRef.current(next);
			});
			cb.addEventListener('mousedown', (e) => e.stopPropagation());
		}
	}, []);

	// Callback ref: fires whenever the underlying element changes (mount,
	// unmount, replacement). Using a useCallback identity-stable ref means
	// React only invokes it when the element actually changes.
	const refCallback = useCallback((el: HTMLDivElement | null) => {
		// Tear down previous observer.
		if (observerRef.current) {
			observerRef.current.disconnect();
			observerRef.current = null;
		}
		if (!el) return;
		wireUp(el);
		const observer = new MutationObserver(() => wireUp(el));
		observer.observe(el, { childList: true, subtree: true });
		observerRef.current = observer;
	}, [wireUp]);

	// Clean up on unmount.
	useEffect(() => {
		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
				observerRef.current = null;
			}
		};
	}, []);

	return refCallback;
};

export default useCheckboxToggle;
