import type { EditorState } from '@codemirror/state';
import type { Decoration, WidgetType } from '@codemirror/view';
import type { SyntaxNodeRef } from '@lezer/common';

export interface ReplacementExtension {
	// Should return the widget that replaces `node`. Returning `null` preserves `node` without replacement.
	createDecoration(node: SyntaxNodeRef, state: EditorState, parentTags: Readonly<Map<string, number>>): Decoration|WidgetType|null;

	// Returns a range ([from, to]) to which the decoration should be applied. Returning `null`
	// replaces the entire widget with the decoration.
	// Only a single number should be returned to create a point/full line range.
	getDecorationRange?(node: SyntaxNodeRef, state: EditorState): [number]|[number, number]|null;

	// Disable the decoration when near the cursor. Defaults to true.
	hideWhenContainsSelection?: boolean;
}

export interface RenderedContentContext {
	resolveImageSrc(src: string): Promise<string>;
}
