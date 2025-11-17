
export interface EditorCursorLocations {
	readonly richText?: unknown; // Depends on the editor implementation
	readonly markdown?: number;
}

type NoteIdAndWindowKey = `note-window:${string}`;
type NoteIdKey = `note:${string}`;

export default class NotePositionService {
	private constructor() {}

	private static instance_: NotePositionService;
	public static instance() {
		this.instance_ ??= new NotePositionService();
		return this.instance_;
	}

	private toFallbackKey_(noteId: string): NoteIdKey {
		return `note:${noteId}`;
	}

	private toKey_(noteId: string, windowId?: string): NoteIdAndWindowKey {
		return `note-window:${windowId}--${noteId}`;
	}

	private cursorFallback_: Map<NoteIdKey, EditorCursorLocations> = new Map();
	private cursorLocations_: Map<NoteIdAndWindowKey, EditorCursorLocations> = new Map();

	public getCursorPosition(noteId: string, windowId: string) {
		// If available, use the cursor position for the current window
		return this.cursorLocations_.get(this.toKey_(noteId, windowId))
			// Fall back to the last-set cursor location for all windows
			?? this.cursorFallback_.get(this.toFallbackKey_(noteId))
			?? { };
	}

	public updateCursorPosition(noteId: string, windowId: string, position: EditorCursorLocations) {
		const key = this.toKey_(noteId, windowId);
		this.cursorLocations_.set(key, {
			...this.cursorLocations_.get(key),
			...position,
		});

		const fallbackKey = this.toFallbackKey_(noteId);
		this.cursorFallback_.set(fallbackKey, {
			...this.cursorFallback_.get(fallbackKey),
			...position,
		});
	}

	private scrollFallback_: Map<NoteIdKey, number> = new Map();
	private scrollLocations_: Map<NoteIdAndWindowKey, number> = new Map();

	public getScrollPercent(noteId: string, windowId: string) {
		return this.scrollLocations_.get(this.toKey_(noteId, windowId))
			?? this.scrollFallback_.get(this.toFallbackKey_(noteId))
			?? 0;
	}

	public updateScrollPosition(noteId: string, windowId: string, percent: number) {
		const key = this.toKey_(noteId, windowId);
		this.scrollLocations_.set(key, percent);
		this.scrollFallback_.set(this.toFallbackKey_(noteId), percent);
	}
}
