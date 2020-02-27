export interface EditorState {
	// Used by NoteText2 to provide the editor with the initial Markdown text
	markdown?: string,
	// Used by the editor to provide its internal content (can be a string or a more complex object)
	content?: any,
}
