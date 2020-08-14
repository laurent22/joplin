import { NoteBodyEditorProps } from '../../../utils/types';
const { buildStyle } = require('lib/theme');

export default function styles(props: NoteBodyEditorProps) {
	return buildStyle('CodeMirror', props.theme, (theme: any) => {
		return {
			root: {
				position: 'relative',
				display: 'flex',
				flexDirection: 'column',
				...props.style,
			},
			rowToolbar: {
				position: 'relative',
				display: 'flex',
				flexDirection: 'row',
			},
			rowEditorViewer: {
				position: 'relative',
				display: 'flex',
				flexDirection: 'row',
				flex: 1,
				paddingTop: 10,
			},
			cellEditor: {
				position: 'relative',
				display: 'flex',
				flex: 1,
			},
			cellViewer: {
				position: 'relative',
				display: 'flex',
				flex: 1,
				borderLeftWidth: 1,
				borderLeftColor: theme.dividerColor,
				borderLeftStyle: 'solid',
			},
			viewer: {
				display: 'flex',
				overflow: 'hidden',
				verticalAlign: 'top',
				boxSizing: 'border-box',
				width: '100%',
			},
			editor: {
				display: 'flex',
				width: 'auto',
				height: 'auto',
				flex: 1,
				overflowY: 'hidden',
				paddingTop: 0,
				lineHeight: `${theme.textAreaLineHeight}px`,
				fontSize: `${theme.editorFontSize}px`,
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				codeMirrorTheme: theme.codeMirrorTheme, // Defined in theme.js
			},
		};
	});
}
