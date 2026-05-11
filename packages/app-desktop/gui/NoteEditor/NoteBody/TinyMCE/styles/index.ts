import { ThemeAppearance } from '@joplin/lib/themes/type';
import { NoteBodyEditorProps } from '../../../utils/types';
import { buildStyle } from '@joplin/lib/theme';

export default function styles(props: NoteBodyEditorProps) {
	const leftExtraToolbarContainerWidth = props.watchedNoteFiles.length > 0 ? 120 : 80;
	return buildStyle(['TinyMCE', props.style.width, props.style.height, leftExtraToolbarContainerWidth], props.themeId, theme => {
		const toolbarHeight = theme.toolbarHeight + theme.toolbarPadding * 2;
		const leftExtraToolbarContainerTotalWidth = leftExtraToolbarContainerWidth + theme.toolbarPadding * 2;
		const rightExtraToolbarContainerTotalWidth = 70 + theme.toolbarPadding + theme.mainPadding;

		return {
			disabledOverlay: {
				zIndex: 11,
				position: 'absolute',
				backgroundColor: theme.backgroundColor,
				opacity: theme.appearance === ThemeAppearance.Light ? 0.7 : 0.9,
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				padding: 20,
				paddingTop: 50,
				textAlign: 'center',
				width: '100%',
			},
			rootStyle: {
				position: 'relative',
				width: props.style.width,
				height: props.style.height,
			},
			toolbarContainer: {
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				height: toolbarHeight,
				display: 'flex',
				alignItems: 'stretch',
				zIndex: 10,
				overflow: 'hidden',
				pointerEvents: 'none',
			},
			leftExtraToolbarContainer: {
				boxSizing: 'border-box',
				display: 'flex',
				flex: '0 0 auto',
				width: leftExtraToolbarContainerTotalWidth,
				position: 'static',
				padding: theme.toolbarPadding,
				backgroundColor: theme.backgroundColor3,
				overflow: 'hidden',
				pointerEvents: 'auto',
			},
			tinyMceToolbarContainer: {
				flex: '1 1 auto',
				minWidth: 0,
			},
			rightExtraToolbarContainer: {
				boxSizing: 'border-box',
				display: 'flex',
				flex: '0 0 auto',
				width: rightExtraToolbarContainerTotalWidth,
				position: 'static',
				padding: theme.toolbarPadding,
				paddingRight: theme.mainPadding,
				backgroundColor: theme.backgroundColor3,
				overflow: 'hidden',
				pointerEvents: 'auto',
			},
			editorContainer: {
				width: '100%',
				height: '100%',
				boxSizing: 'border-box',
			},
			extraToolbarButton: {
				display: 'flex',
				border: 'none',
				background: 'none',
			},
			extraToolbarButtonIcon: {
				fontSize: theme.toolbarIconSize,
				color: theme.color3,
			},
		};
	});
}
