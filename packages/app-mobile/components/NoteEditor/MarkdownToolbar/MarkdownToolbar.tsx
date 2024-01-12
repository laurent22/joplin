// A toolbar for the markdown editor.

import * as React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useMemo } from 'react';

import { _ } from '@joplin/lib/locale';
import { MarkdownToolbarProps, StyleSheetData } from './types';
import Toolbar from './Toolbar';
import { buttonSize } from './ToolbarButton';
import { Theme } from '@joplin/lib/themes/type';
import ToggleSpaceButton from './ToggleSpaceButton';
import useHeaderButtons from './buttons/useHeaderButtons';
import useInlineFormattingButtons from './buttons/useInlineFormattingButtons';
import useActionButtons from './buttons/useActionButtons';
import useListButtons from './buttons/useListButtons';
import useKeyboardVisible from '../hooks/useKeyboardVisible';


const MarkdownToolbar: React.FC<MarkdownToolbarProps> = (props: MarkdownToolbarProps) => {
	const themeData = props.editorSettings.themeData;
	const styles = useStyles(props.style, themeData);

	const { keyboardVisible, hasSoftwareKeyboard } = useKeyboardVisible();
	const buttonProps = {
		...props,
		iconStyle: styles.text,
		keyboardVisible,
		hasSoftwareKeyboard,
	};
	const headerButtons = useHeaderButtons(buttonProps);
	const inlineFormattingBtns = useInlineFormattingButtons(buttonProps);
	const actionButtons = useActionButtons(buttonProps);
	const listButtons = useListButtons(buttonProps);

	const styleData: StyleSheetData = useMemo(() => ({
		styles: styles,
		themeId: props.editorSettings.themeId,
	}), [styles, props.editorSettings.themeId]);

	const toolbarButtons = useMemo(() => {
		const buttons = [
			{
				title: _('Formatting'),
				items: inlineFormattingBtns,
			},
			{
				title: _('Headers'),
				items: headerButtons,
			},
			{
				title: _('Lists'),
				items: listButtons,
			},
			{
				title: _('Actions'),
				items: actionButtons,
			},
		];

		return buttons;
	}, [headerButtons, inlineFormattingBtns, listButtons, actionButtons]);

	return (
		<ToggleSpaceButton
			spaceApplicable={ Platform.OS === 'ios' && keyboardVisible }
			themeId={props.editorSettings.themeId}
			style={styles.container}
		>
			<Toolbar
				styleSheet={styleData}
				buttons={toolbarButtons}
			/>
		</ToggleSpaceButton>
	);
};

const useStyles = (styleProps: any, theme: Theme) => {
	return useMemo(() => {
		return StyleSheet.create({
			container: {
				...styleProps,
			},
			button: {
				width: buttonSize,
				height: buttonSize,
				alignItems: 'center',
				justifyContent: 'center',
				backgroundColor: theme.backgroundColor,
			},
			buttonDisabled: {
				opacity: 0.5,
			},
			buttonDisabledContent: {
			},
			buttonActive: {
				backgroundColor: theme.backgroundColor3,
				color: theme.color3,
				borderWidth: 1,
				borderColor: theme.color3,
				borderRadius: 6,
			},
			buttonActiveContent: {
				color: theme.color3,
			},
			text: {
				fontSize: 22,
				color: theme.color,
			},
			toolbarRow: {
				flex: 0,
				flexDirection: 'row',
				alignItems: 'baseline',
				justifyContent: 'center',

				// Add a small amount of additional padding for button borders
				height: buttonSize + 6,
			},
			toolbarContainer: {
				flexShrink: 1,
			},
			toolbarContent: {
				flexGrow: 1,
				justifyContent: 'center',
			},
		});
	}, [styleProps, theme]);
};

export default MarkdownToolbar;
