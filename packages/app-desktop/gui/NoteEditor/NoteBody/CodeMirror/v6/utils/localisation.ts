import { _ } from '@joplin/lib/locale';

// See https://codemirror.net/examples/translate/
export default () => ({
	// @codemirror/view
	'Control character': _('Control character'),

	// @codemirror/commands
	'Selection deleted': _('Selection deleted'),

	// @codemirror/search
	'Go to line': _('Go to line'),
	'go': _('go'),
	'Find': _('Find'),
	'Replace': _('Replace'),
	'next': _('next'),
	'previous': _('previous'),
	'all': _('all'),
	'match case': _('match case'),
	'by word': _('by word'),
	'replace': _('replace'),
	'replace all': _('replace all'),
	'close': _('close'),
	'current match': _('current match'),
	'replaced $ matches': _('replaced $ matches'),
	'replaced match on line $': _('replaced match on line $'),
	'on line': _('on line'),

	// Table editor context menu. These keys must be kept in sync with the
	// state.phrase() calls in packages/editor renderTables.ts.
	'Insert row above': _('Insert row above'),
	'Insert row below': _('Insert row below'),
	'Insert column left': _('Insert column left'),
	'Insert column right': _('Insert column right'),
	'Move row up': _('Move row up'),
	'Move row down': _('Move row down'),
	'Move column left': _('Move column left'),
	'Move column right': _('Move column right'),
	'Delete row': _('Delete row'),
	'Delete column': _('Delete column'),

	// Conflict resolution widgets. These keys must be kept in sync with the
	// state.phrase() calls in packages/editor conflictResolutionExtension.ts.
	'Use my version': _('Use my version'),
	'Current version': _('Current version'),
});
