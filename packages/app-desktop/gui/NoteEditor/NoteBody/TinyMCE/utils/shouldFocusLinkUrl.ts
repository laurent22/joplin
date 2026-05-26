// Fix for #15521: when the WYSIWYG editor opens its hyperlink dialog with
// pre-populated "Text to display" (because the user had text selected before
// invoking the command), TinyMCE's built-in `link` plugin leaves keyboard
// focus on the text field. The user then has to tab once before typing the
// URL, which is the field they actually wanted to fill.
//
// This predicate identifies the exact shape of dialog data where re-focusing
// the URL field is the correct action: the dialog has both `href` and `text`
// fields (so it is the link dialog, not e.g. the image dialog), `text` is a
// non-empty string (pre-populated from a prior selection), and `href` is
// either missing or an empty string (the user has not yet typed a URL).
//
// When the user is editing an existing link (both href and text populated)
// we leave the default focus alone so we do not steal it from whichever
// field the user clicked on to reach the dialog.

type LinkDialogData = {
	href?: unknown;
	text?: unknown;
	title?: unknown;
	target?: unknown;
	[key: string]: unknown;
};

// Decides whether the URL field of a TinyMCE link dialog should receive
// keyboard focus when the dialog opens.
//
// The link dialog is identified by the presence of a `text` field — no other
// TinyMCE plugin dialog uses that field, so its presence is sufficient as a
// discriminator (the image dialog uses `src`/`alt`, etc.).
//
// Returns `true` only when:
//    - `text` is a non-empty string (pre-populated from a prior selection), and
//    - `href` is missing or an empty string (user has not yet typed a URL).
//
// Returns `false` for:
//    - existing-link edits (both `text` and `href` populated — preserve the
//      user's natural click target),
//    - fresh inserts with no selection (both fields empty — default focus is
//      fine),
//    - non-link dialogs (`text` field absent),
//    - undefined / null data,
//    - defensive cases where `text` is not a string.
//
// @param data - The dialog data object as returned by `event.dialog.getData()`
//    on TinyMCE's `OpenWindow` event. May be `undefined` / `null` when the
//    dialog has no form fields.
// @returns `true` iff the URL field should receive focus.
export default function shouldFocusLinkUrl(data: LinkDialogData | undefined | null): boolean {
	if (!data) return false;
	// The `text` field is the unique discriminator for the link dialog. Image
	// and other plugin dialogs do not include it, so its presence is enough to
	// identify the link dialog without also requiring `href` to be present —
	// `href` may legitimately be missing on the initial open before TinyMCE
	// finishes populating the dialog state.
	if (!('text' in data)) return false;

	const text = data.text;
	const href = data.href;

	const hasText = typeof text === 'string' && text.length > 0;
	const hasHref = typeof href === 'string' && href.length > 0;

	return hasText && !hasHref;
}
