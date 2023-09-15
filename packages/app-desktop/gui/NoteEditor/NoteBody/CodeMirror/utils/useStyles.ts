import { Theme } from '@joplin/lib/themes/type';
import { NoteBodyEditorProps } from '../../../utils/types';
import { buildStyle } from '@joplin/lib/theme';
import { useMemo } from 'react';



const useStyles = (props: NoteBodyEditorProps) => {
	return useMemo(() => {
		return buildStyle(['CodeMirror', props.fontSize], props.themeId, (theme: Theme) => {
			return {
				root: {
					position: 'relative',
					display: 'flex',
					flexDirection: 'column',
					minHeight: 0,
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

					// Allow the editor container to shrink (allowing the editor to scroll)
					minHeight: 0,
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
					lineHeight: `${Math.round(17 * props.fontSize / 12)}px`,
					fontSize: `${props.fontSize}px`,
					color: theme.color,
					backgroundColor: theme.backgroundColor,

					// CM5 only
					codeMirrorTheme: theme.codeMirrorTheme, // Defined in theme.js
				},

				// CM6 only
				globalTheme: {
					...theme,
					fontFamily: 'inherit',
					fontSize: props.fontSize,
					fontSizeUnits: 'px',
				},
			};
		});
	}, [props.style, props.themeId, props.fontSize]);
};
export default useStyles;
