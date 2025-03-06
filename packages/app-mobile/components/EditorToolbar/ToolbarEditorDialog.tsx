import * as React from 'react';
import { useCallback, useMemo } from 'react';
import createRootStyle from '../../utils/createRootStyle';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Divider, Text, TouchableRipple } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '../global-style';
import { connect } from 'react-redux';
import ToolbarButtonUtils, { ToolbarButtonInfo, ToolbarItem } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import Icon from '../Icon';
import { AppState } from '../../utils/types';
import CommandService from '@joplin/lib/services/CommandService';
import allToolbarCommandNamesFromState from './utils/allToolbarCommandNamesFromState';
import Setting from '@joplin/lib/models/Setting';
import DismissibleDialog, { DialogSize } from '../DismissibleDialog';
import selectedCommandNamesFromState from './utils/selectedCommandNamesFromState';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
import { DeleteButton } from '../buttons';
import shim from '@joplin/lib/shim';

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

interface EditorDialogProps {
	themeId: number;
	defaultToolbarButtonInfos: ToolbarItem[];
	selectedCommandNames: string[];
	allCommandNames: string[];
	hasCustomizedLayout: boolean;

	visible: boolean;
	onDismiss: ()=> void;
}

const useStyle = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		return StyleSheet.create({
			...createRootStyle(themeId),
			icon: {
				color: theme.color,
				fontSize: theme.fontSizeLarge,
			},
			labelText: {
				fontSize: theme.fontSize,
			},
			listContainer: {
				marginTop: theme.marginTop,
				flex: 1,
			},
			resetButton: {
				marginTop: theme.marginTop,
			},
			listItem: {
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'flex-start',
				gap: theme.margin,
				padding: 4,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
			},
		});
	}, [themeId]);
};
type Styles = ReturnType<typeof useStyle>;

const setCommandIncluded = (
	commandName: string,
	lastSelectedCommands: string[],
	allCommandNames: string[],
	include: boolean,
) => {
	let newSelectedCommands;
	if (include) {
		newSelectedCommands = [];
		for (const name of allCommandNames) {
			const isDivider = name === '-';
			if (isDivider || name === commandName || lastSelectedCommands.includes(name)) {
				newSelectedCommands.push(name);
			}
		}
	} else {
		newSelectedCommands = lastSelectedCommands.filter(name => name !== commandName);
	}
	Setting.setValue('editor.toolbarButtons', newSelectedCommands);
};

interface ItemToggleProps {
	item: ToolbarButtonInfo;
	selectedCommandNames: string[];
	allCommandNames: string[];
	styles: Styles;
}
const ToolbarItemToggle: React.FC<ItemToggleProps> = ({
	item, selectedCommandNames, styles, allCommandNames,
}) => {
	const title = item.title || item.tooltip;
	const checked = selectedCommandNames.includes(item.name);

	const onToggle = useCallback(() => {
		setCommandIncluded(item.name, selectedCommandNames, allCommandNames, !checked);
	}, [item, selectedCommandNames, allCommandNames, checked]);

	return (
		<TouchableRipple
			accessibilityRole='checkbox'
			accessibilityState={{ checked }}
			aria-checked={checked}
			onPress={onToggle}
		>
			<View style={styles.listItem}>
				<Icon name={checked ? 'ionicon checkbox-outline' : 'ionicon square-outline'} style={styles.icon} accessibilityLabel={null}/>
				<Icon name={item.iconName} style={styles.icon} accessibilityLabel={null}/>
				<Text style={styles.labelText}>
					{title}
				</Text>
			</View>
		</TouchableRipple>
	);
};

const ToolbarEditorScreen: React.FC<EditorDialogProps> = props => {
	const styles = useStyle(props.themeId);

	const renderItem = (item: ToolbarItem, index: number) => {
		if (item.type === 'separator') {
			return <Divider key={`separator-${index}`} />;
		}

		return <ToolbarItemToggle
			key={`command-${item.name}`}
			item={item}
			styles={styles}
			allCommandNames={props.allCommandNames}
			selectedCommandNames={props.selectedCommandNames}
		/>;
	};

	const onRestoreDefaultLayout = useCallback(async () => {
		// Dismiss before showing the confirm dialog to prevent modal conflicts.
		// On some platforms (web and possibly iOS) showing multiple modals
		// at the same time can cause issues.
		props.onDismiss();

		const message = _('Are you sure that you want to restore the default toolbar layout?\nThis cannot be undone.');
		if (await shim.showConfirmationDialog(message)) {
			Setting.setValue('editor.toolbarButtons', []);
		}
	}, [props.onDismiss]);

	const restoreButton = <DeleteButton
		style={styles.resetButton}
		onPress={onRestoreDefaultLayout}
	>
		{_('Restore defaults')}
	</DeleteButton>;

	return (
		<DismissibleDialog
			size={DialogSize.Small}
			themeId={props.themeId}
			visible={props.visible}
			onDismiss={props.onDismiss}
			heading={_('Manage toolbar options')}
		>
			<View>
				<Text variant='bodyMedium'>{_('Check elements to display in the toolbar')}</Text>
			</View>
			<ScrollView style={styles.listContainer}>
				{props.defaultToolbarButtonInfos.map((item, index) => renderItem(item, index))}
				{props.hasCustomizedLayout ? restoreButton : null}
			</ScrollView>
		</DismissibleDialog>
	);
};

export default connect((state: AppState) => {
	const whenClauseContext = stateToWhenClauseContext(state);

	const allCommandNames = allToolbarCommandNamesFromState(state);
	const selectedCommandNames = selectedCommandNamesFromState(state);

	return {
		themeId: state.settings.theme,
		selectedCommandNames,
		allCommandNames,
		hasCustomizedLayout: state.settings['editor.toolbarButtons'].length > 0,
		defaultToolbarButtonInfos: toolbarButtonUtils.commandsToToolbarButtons(allCommandNames, whenClauseContext),
	};
})(ToolbarEditorScreen);
