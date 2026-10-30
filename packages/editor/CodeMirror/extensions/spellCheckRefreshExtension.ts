import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { editorSettingsFacet } from './editorSettingsExtension';
import { setNoteIdEffect } from './selectedNoteIdExtension';

export const refreshSpellCheck = (view: EditorView) => {
	const contentDOM = view.contentDOM;
	if (!contentDOM) return;

	// Check if spellchecking is enabled in settings or on contentDOM
	const settings = view.state.facet(editorSettingsFacet);
	const isEnabled = settings ? settings.spellcheckEnabled : (contentDOM.spellcheck || contentDOM.getAttribute('spellcheck') === 'true');
	if (!isEnabled) return;

	// 1. Try native forceSpellCheck if supported by browser/engine
	const extendedElement = contentDOM as unknown as { forceSpellCheck?: () => void };
	if (typeof extendedElement.forceSpellCheck === 'function') {
		try {
			extendedElement.forceSpellCheck();
		} catch {
			// Ignore if not supported
		}
	}

	// 2. Toggling spellcheck attribute on contentDOM:
	// In Chromium / Blink (and Electron), programmatic DOM insertions and keystroke deletions
	// (such as backspacing intercepted by CodeMirror) destroy the native spelling markers
	// without scheduling a spellcheck pass. Toggling spellcheck to false, flushing layout,
	// and restoring to true invalidates the spellcheck state and forces Blink to re-scan
	// the text nodes within the contenteditable container.
	try {
		contentDOM.setAttribute('spellcheck', 'false');
		// Reading offsetHeight forces a synchronous style/layout recalculation in Blink
		// so that the attribute change is processed.
		void contentDOM.offsetHeight;
		contentDOM.setAttribute('spellcheck', 'true');
		contentDOM.spellcheck = true;
	} catch {
		// Ignore DOM manipulation errors if any
	}
};

export interface SpellCheckRefreshOptions {
	debounceMs?: number;
	quickDelayMs?: number;
}

const defaultOptions: Required<SpellCheckRefreshOptions> = {
	debounceMs: 500,
	quickDelayMs: 100,
};

export const createSpellCheckRefreshPlugin = (options?: SpellCheckRefreshOptions) => {
	const opts = { ...defaultOptions, ...options };

	return ViewPlugin.fromClass(class {
		private debounceTimer: ReturnType<typeof setTimeout> | null = null;
		private view: EditorView;

		public constructor(view: EditorView) {
			this.view = view;
			// Schedule initial refresh after editor is mounted and rendered
			this.scheduleQuickRefresh();
		}

		private scheduleQuickRefresh() {
			this.clearTimer();
			this.debounceTimer = setTimeout(() => {
				this.debounceTimer = null;
				refreshSpellCheck(this.view);
			}, opts.quickDelayMs);
		}

		private scheduleDebouncedRefresh() {
			this.clearTimer();
			this.debounceTimer = setTimeout(() => {
				this.debounceTimer = null;
				refreshSpellCheck(this.view);
			}, opts.debounceMs);
		}

		private clearTimer() {
			if (this.debounceTimer !== null) {
				clearTimeout(this.debounceTimer);
				this.debounceTimer = null;
			}
		}

		public update(viewUpdate: ViewUpdate) {
			if (viewUpdate.docChanged) {
				// Check if this was a note switch or a document edit
				const isNoteSwitch = viewUpdate.transactions.some(tr =>
					tr.effects.some(e => e.is(setNoteIdEffect)),
				);

				if (isNoteSwitch) {
					this.scheduleQuickRefresh();
				} else {
					this.scheduleDebouncedRefresh();
				}
			} else if (viewUpdate.focusChanged && viewUpdate.view.hasFocus) {
				// When the editor gains focus (e.g. user clicked in the note),
				// trigger a quick spellcheck refresh
				this.scheduleQuickRefresh();
			}
		}

		public destroy() {
			this.clearTimer();
		}
	});
};

const spellCheckRefreshExtension = createSpellCheckRefreshPlugin();

export default spellCheckRefreshExtension;
