
// eslint-disable-next-line import/prefer-default-export -- FocusControl currently only has one shared type for external use
export enum ModalState {
	// When `Open`, a modal blocks focus for the main app content.
	Open,
	// When `Closing`, a modal doesn't block main app content focus, but focus
	// shouldn't be moved to the main app content yet.
	// This is useful for native Modals, which have their own focus handling logic.
	// If Joplin moves accessibility focus before the native Modal focus handling
	// has completed, the Joplin-specified accessibility focus may be ignored.
	Closing,
	Closed,
}
