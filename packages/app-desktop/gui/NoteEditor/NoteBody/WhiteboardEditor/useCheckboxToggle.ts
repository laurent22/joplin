import { useCallback, useEffect, useRef } from 'react';

// Joplin's renderer emits `<input type="checkbox">` elements and `<a>` link
// elements with inline onclick handlers that call `ipcProxySendToHost(...)` —
// that handler doesn't exist outside the note viewer iframe, so clicks are
// no-ops in our card context.
//
// This hook returns a callback ref. Attach it to the container that holds
// the rendered HTML (`<div ref={checkboxRef} dangerouslySetInnerHTML={...} />`).
// On every change to that container's children, the hook rewires interactive
// elements inside it:
// - Checkboxes: strips the broken inline onclick, makes them enabled, and
//   installs a click listener that flips the corresponding `[ ]` / `[x]` in
//   the source markdown by index.
// - Links: strips the broken inline onclick, adds the `nodrag` class, and
//   installs click and auxclick listeners that invoke `onOpenRef` (or scroll
//   to in-card anchors).

interface Options {
	body: string;
	onChange: (newBody: string)=> void;
	onOpenRef?: (ref: string)=> void;
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

// Exported for tests. Extracts the target reference / URL from an anchor element
// rendered by Joplin's markup renderer or raw HTML.
export const extractLinkUrl = (a: HTMLAnchorElement): string | null => {
	const onclick = a.getAttribute('onclick') || '';
	// Joplin's renderer generates:
	// ipcProxySendToHost("TARGET_URL", { resourceId: "..." }); return false;
	// or in some configurations:
	// postMessage("TARGET_URL", { resourceId: "..." }); return false;
	const match = onclick.match(/(?:ipcProxySendToHost|postMessage)\(\s*(".*?"|'.*?')/);
	if (match) {
		try {
			const parsed = JSON.parse(match[1]);
			if (typeof parsed === 'string' && parsed.trim().length > 0) {
				return parsed;
			}
		} catch {
			const unquoted = match[1].slice(1, -1);
			if (unquoted.trim().length > 0) return unquoted;
		}
	}

	const resourceId = a.getAttribute('data-resource-id');
	if (resourceId) {
		return `joplin://${resourceId}`;
	}

	const href = a.getAttribute('href');
	if (!href || href === '#') return null;

	return href;
};

const useCheckboxToggle = ({ body, onChange, onOpenRef }: Options) => {
	const bodyRef = useRef(body);
	bodyRef.current = body;
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	const onOpenRefRef = useRef(onOpenRef);
	onOpenRefRef.current = onOpenRef;

	const observerRef = useRef<MutationObserver | null>(null);
	// Track which elements have already been wired up. WeakSet so
	// removed elements can be GC'd without leaking entries.
	const wiredCheckboxesRef = useRef<WeakSet<HTMLInputElement>>(new WeakSet());
	const wiredLinksRef = useRef<WeakSet<HTMLAnchorElement>>(new WeakSet());

	const wireUp = useCallback((root: HTMLElement) => {
		// 1. Checkboxes
		const checkboxes = root.querySelectorAll<HTMLInputElement>('input[type=checkbox]');
		for (const cb of Array.from(checkboxes)) {
			if (wiredCheckboxesRef.current.has(cb)) continue;
			wiredCheckboxesRef.current.add(cb);
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

		// 2. Links
		const links = root.querySelectorAll<HTMLAnchorElement>('a');
		for (const a of Array.from(links)) {
			if (wiredLinksRef.current.has(a)) continue;
			wiredLinksRef.current.add(a);

			const url = extractLinkUrl(a);
			// Always strip the renderer's broken inline onclick
			a.removeAttribute('onclick');
			(a as HTMLAnchorElement & { onclick: unknown }).onclick = null;

			if (!url) continue;

			// Prevent React Flow from dragging the card when interacting with the link
			a.classList.add('nodrag');

			// If the anchor doesn't already have a title, display the target on hover
			if (!a.title && url !== '#') {
				a.title = url;
			}

			const handleFollow = (e: MouseEvent) => {
				e.preventDefault();
				e.stopPropagation();
				if (url.startsWith('#')) {
					// In-card anchor navigation
					const targetEl = root.querySelector(url);
					if (targetEl) {
						targetEl.scrollIntoView();
					}
				} else if (onOpenRefRef.current) {
					onOpenRefRef.current(url);
				}
			};

			a.addEventListener('click', handleFollow);
			a.addEventListener('auxclick', (e) => {
				if (e.button === 1) handleFollow(e);
			});
			a.addEventListener('mousedown', (e) => e.stopPropagation());
			a.addEventListener('dblclick', (e) => e.stopPropagation());
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
