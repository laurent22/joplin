import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import createRootStyle from '../../utils/createRootStyle';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Divider, IconButton, Text, TouchableRipple } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '../global-style';
import { connect } from 'react-redux';
import ToolbarButtonUtils, { ToolbarButtonInfo, ToolbarItem } from '@joplin/lib/services/commands/ToolbarButtonUtils';
import Icon from '../Icon';
import { AppState } from '../../utils/types';
import CommandService from '@joplin/lib/services/CommandService';
import allToolbarCommandNamesFromState from './utils/allToolbarCommandNamesFromState';
import Setting from '@joplin/lib/models/Setting';
import DismissibleDialog, { DialogVariant } from '../DismissibleDialog';
import selectedCommandNamesFromState from './utils/selectedCommandNamesFromState';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
import { DeleteButton } from '../buttons';
import shim from '@joplin/lib/shim';
import useToolbarEditorState, { ReorderableItem } from './utils/useToolbarEditorState';

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
			disabledIcon: {
				color: theme.colorFaded,
				fontSize: theme.fontSizeLarge,
			},
			labelText: {
				fontSize: theme.fontSize,
				flex: 1,
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
			arrowButtonsContainer: {
				flexDirection: 'row',
				alignItems: 'center',
			},
			arrowButton: {
				margin: 0,
				padding: 0,
			},
			sectionHeader: {
				paddingVertical: 8,
				paddingHorizontal: 4,
				color: theme.colorFaded,
			},
			enabledItemTouchable: {
				flexDirection: 'row',
				alignItems: 'center',
				flex: 1,
				gap: theme.margin,
			},
			disabledLabelText: {
				fontSize: theme.fontSize,
				flex: 1,
				color: theme.colorFaded,
			},
		});
	}, [themeId]);
};
type Styles = ReturnType<typeof useStyle>;

interface EnabledItemRowProps {
	item: ReorderableItem;
	index: number;
	isFirst: boolean;
	isLast: boolean;
	styles: Styles;
	onToggle: (commandName: string)=> void;
	onMoveUp: (index: number)=> void;
	onMoveDown: (index: number)=> void;
}

const EnabledItemRow: React.FC<EnabledItemRowProps> = ({
	item, index, isFirst, isLast, styles, onToggle, onMoveUp, onMoveDown,
}) => {
	const title = item.buttonInfo.title || item.buttonInfo.tooltip;

	const handleToggle = useCallback(() => {
		onToggle(item.commandName);
	}, [onToggle, item.commandName]);

	const handleMoveUp = useCallback(() => {
		onMoveUp(index);
	}, [onMoveUp, index]);

	const handleMoveDown = useCallback(() => {
		onMoveDown(index);
	}, [onMoveDown, index]);

	return (
		<View style={styles.listItem}>
			<TouchableRipple
				accessibilityRole='checkbox'
				accessibilityState={{ checked: true }}
				aria-checked={true}
				onPress={handleToggle}
				style={styles.enabledItemTouchable}
			>
				<>
					<Icon name='ionicon checkbox-outline' style={styles.icon} accessibilityLabel={null}/>
					<Icon name={item.buttonInfo.iconName} style={styles.icon} accessibilityLabel={null}/>
					<Text style={styles.labelText}>{title}</Text>
				</>
			</TouchableRipple>
			<View style={styles.arrowButtonsContainer}>
				<IconButton
					icon='arrow-up'
					size={20}
					onPress={handleMoveUp}
					disabled={isFirst}
					style={styles.arrowButton}
					accessibilityLabel={_('Move %s up', title)}
				/>
				<IconButton
					icon='arrow-down'
					size={20}
					onPress={handleMoveDown}
					disabled={isLast}
					style={styles.arrowButton}
					accessibilityLabel={_('Move %s down', title)}
				/>
			</View>
		</View>
	);
};

interface DisabledItemRowProps {
	item: ReorderableItem;
	styles: Styles;
	onToggle: (commandName: string)=> void;
}

const DisabledItemRow: React.FC<DisabledItemRowProps> = ({
	item, styles, onToggle,
}) => {
	const title = item.buttonInfo.title || item.buttonInfo.tooltip;

	const handleToggle = useCallback(() => {
		onToggle(item.commandName);
	}, [onToggle, item.commandName]);

	return (
		<TouchableRipple
			accessibilityRole='checkbox'
			accessibilityState={{ checked: false }}
			aria-checked={false}
			onPress={handleToggle}
		>
			<View style={styles.listItem}>
				<Icon name='ionicon square-outline' style={styles.disabledIcon} accessibilityLabel={null}/>
				<Icon name={item.buttonInfo.iconName} style={styles.disabledIcon} accessibilityLabel={null}/>
				<Text style={styles.disabledLabelText}>{title}</Text>
			</View>
		</TouchableRipple>
	);
};

const ToolbarEditorScreen: React.FC<EditorDialogProps> = props => {
	const styles = useStyle(props.themeId);

	// Filter button infos to only include actual buttons (not separators)
	const allButtonInfos = useMemo(() => {
		return props.defaultToolbarButtonInfos.filter(
			(item): item is ToolbarButtonInfo => item.type === 'button',
		);
	}, [props.defaultToolbarButtonInfos]);

	const {
		enabledItems,
		disabledItems,
		handleMoveUp,
		handleMoveDown,
		handleToggle,
		reinitialize,
	} = useToolbarEditorState({
		initialSelectedCommandNames: props.selectedCommandNames,
		allCommandNames: props.allCommandNames,
		allButtonInfos,
	});

	// Re-sync local state whenever the dialog becomes visible (e.g. after Restore defaults)
	const prevVisible = useRef(props.visible);
	useEffect(() => {
		if (props.visible && !prevVisible.current) {
			reinitialize(props.selectedCommandNames);
		}
		prevVisible.current = props.visible;
	}, [props.visible, props.selectedCommandNames, reinitialize]);

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
			size={DialogVariant.Small}
			themeId={props.themeId}
			visible={props.visible}
			onDismiss={props.onDismiss}
			heading={_('Manage toolbar options')}
		>
			<View>
				<Text variant='bodyMedium'>{_('Check elements to display in the toolbar')}</Text>
			</View>
			<ScrollView style={styles.listContainer}>
				{enabledItems.map((item, index) => (
					<EnabledItemRow
						key={`enabled-${item.commandName}`}
						item={item}
						index={index}
						isFirst={index === 0}
						isLast={index === enabledItems.length - 1}
						styles={styles}
						onToggle={handleToggle}
						onMoveUp={handleMoveUp}
						onMoveDown={handleMoveDown}
					/>
				))}

				{disabledItems.length > 0 && (
					<>
						<Divider />
						<Text variant='labelMedium' style={styles.sectionHeader}>
							{_('Available')}
						</Text>
					</>
				)}

				{disabledItems.map((item) => (
					<DisabledItemRow
						key={`disabled-${item.commandName}`}
						item={item}
						styles={styles}
						onToggle={handleToggle}
					/>
				))}

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
