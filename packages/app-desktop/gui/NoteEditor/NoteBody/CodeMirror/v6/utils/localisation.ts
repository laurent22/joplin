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
});
