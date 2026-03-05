import * as React from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import createRootStyle from '../../utils/createRootStyle';
import { AccessibilityInfo, View, StyleSheet, ScrollView } from 'react-native';
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
import focusView from '../../utils/focusView';

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
	viewRef?: React.RefObject<View>;
	onToggle: (commandName: string)=> void;
	onMoveUp: (index: number)=> void;
	onMoveDown: (index: number)=> void;
}

const EnabledItemRow: React.FC<EnabledItemRowProps> = ({
	item, index, isFirst, isLast, styles, viewRef, onToggle, onMoveUp, onMoveDown,
}) => {
	const title = item.buttonInfo.title || item.buttonInfo.tooltip;

	// Local refs and state for keeping arrow focus after a move
	const upArrowRef = useRef<View>(null);
	const downArrowRef = useRef<View>(null);
	const pendingArrowFocusRef = useRef<'up'|'down'|null>(null);

	const handleToggle = useCallback(() => {
		onToggle(item.commandName);
		AccessibilityInfo.announceForAccessibility(_('%s removed from toolbar', title));
	}, [onToggle, item.commandName, title]);

	const handleMoveUp = useCallback(() => {
		pendingArrowFocusRef.current = 'up';
		onMoveUp(index);
		AccessibilityInfo.announceForAccessibility(_('%s moved up', title));
	}, [onMoveUp, index, title]);

	const handleMoveDown = useCallback(() => {
		pendingArrowFocusRef.current = 'down';
		onMoveDown(index);
		AccessibilityInfo.announceForAccessibility(_('%s moved down', title));
	}, [onMoveDown, index, title]);

	// After a move re-render, focus the arrow that was pressed.
	// If we hit a boundary (now first or last), swap to the opposite arrow.
	// index/isFirst/isLast reflect the new position after the parent re-renders.
	//
	// We delay the focusView call: when an item moves DOWN, TalkBack re-evaluates
	// focus after the accessibility tree update (content changed ahead of the focused
	// element), jumping to X. The delay lets TalkBack settle so our call wins.
	// Refs are captured before the timeout to avoid stale closures.
	// useEffect (not useLayoutEffect) is correct here since the 100ms delay
	// already negates any synchronous-paint timing advantage.
	useEffect(() => {
		const direction = pendingArrowFocusRef.current;
		pendingArrowFocusRef.current = null;

		const upRef = upArrowRef.current;
		const downRef = downArrowRef.current;
		const atFirst = isFirst;
		const atLast = isLast;

		const timeoutId = setTimeout(() => {
			if (!direction) return;
			const target = direction === 'up'
				? (atFirst ? downRef : upRef)
				: (atLast ? upRef : downRef);
			if (target) focusView('toolbar-editor-arrow', target);
		}, 100);

		return () => clearTimeout(timeoutId);
	}, [index, isFirst, isLast]);

	return (
		<View style={styles.listItem}>
			<TouchableRipple
				ref={viewRef}
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
					ref={upArrowRef}
					icon='arrow-up'
					size={20}
					onPress={handleMoveUp}
					disabled={isFirst}
					style={styles.arrowButton}
					accessibilityLabel={_('Move %s up', title)}
				/>
				<IconButton
					ref={downArrowRef}
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
		AccessibilityInfo.announceForAccessibility(_('%s added to toolbar', title));
	}, [onToggle, item.commandName, title]);

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

	const [pendingFocusCommand, setPendingFocusCommand] = useState<string|null>(null);
	const pendingFocusRef = useRef<View>(null);

	const {
		enabledItems,
		disabledItems,
		handleMoveUp,
		handleMoveDown,
		handleToggle: doToggle,
		reinitialize,
	} = useToolbarEditorState({
		initialSelectedCommandNames: props.selectedCommandNames,
		allCommandNames: props.allCommandNames,
		allButtonInfos,
	});

	const handleToggle = useCallback((commandName: string) => {
		const enabledIndex = enabledItems.findIndex(item => item.commandName === commandName);
		const isBeingEnabled = enabledIndex === -1;

		if (isBeingEnabled) {
			setPendingFocusCommand(commandName);
		} else if (enabledItems.length > 1) {
			const nextFocus = enabledIndex < enabledItems.length - 1
				? enabledItems[enabledIndex + 1].commandName
				: enabledItems[enabledIndex - 1].commandName;
			setPendingFocusCommand(nextFocus);
		}

		doToggle(commandName);
	}, [doToggle, enabledItems]);

	// useLayoutEffect fires synchronously after mutations, before TalkBack processes
	// the re-render's accessibility events — this prevents the brief flash to X.
	// Clearing pendingFocusCommand after focus is applied removes the ambient state
	// so stale re-triggers cannot occur.
	useLayoutEffect(() => {
		if (pendingFocusCommand && pendingFocusRef.current) {
			focusView('toolbar-editor', pendingFocusRef.current);
			setPendingFocusCommand(null);
		}
	}, [enabledItems, pendingFocusCommand]);

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
						viewRef={item.commandName === pendingFocusCommand ? pendingFocusRef : undefined}
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
