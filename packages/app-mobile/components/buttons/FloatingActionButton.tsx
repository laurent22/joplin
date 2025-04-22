import * as React from 'react';
import { useState, useCallback, useMemo, useRef } from 'react';
import { FAB } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import { AccessibilityActionEvent, AccessibilityActionInfo, View } from 'react-native';
import { connect } from 'react-redux';
import BottomDrawer from '../BottomDrawer';
const Icon = require('react-native-vector-icons/Ionicons').default;

type OnButtonPress = ()=> void;
interface ButtonSpec {
	icon: string;
	label: string;
	color?: string;
	onPress?: OnButtonPress;
}

interface ActionButtonProps {
	// If not given, an "add" button will be used.
	mainButton: ButtonSpec;
	dispatch: Dispatch;

	menuContent?: React.ReactNode;
	onMenuShow?: ()=> void;

	accessibilityActions?: readonly AccessibilityActionInfo[];
	// Can return a Promise to simplify unit testing
	onAccessibilityAction?: (event: AccessibilityActionEvent)=> void|Promise<void>;
	accessibilityHint?: string;
}

// Returns a render function compatible with React Native Paper.
const getIconRenderFunction = (iconName: string) => {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	return (props: any) => <Icon name={iconName} {...props} />;
};

const useIcon = (iconName: string) => {
	return useMemo(() => {
		return getIconRenderFunction(iconName);
	}, [iconName]);
};

const FloatingActionButton = (props: ActionButtonProps) => {
	const [open, setOpen] = useState(false);
	const onMenuToggled = useCallback(() => {
		props.dispatch({
			type: 'SIDE_MENU_CLOSE',
		});
		const newOpen = !open;
		setOpen(newOpen);
	}, [setOpen, open, props.dispatch]);

	const onDismiss = useCallback(() => {
		if (open) onMenuToggled();
	}, [open, onMenuToggled]);

	const mainButtonRef = useRef<View>();

	const closedIcon = useIcon(props.mainButton?.icon ?? 'add');
	const openIcon = useIcon('close');

	const label = props.mainButton?.label ?? _('Add new');

	const menuButton = <FAB
		ref={mainButtonRef}
		icon={open ? openIcon : closedIcon}
		accessibilityLabel={label}
		onPress={props.mainButton?.onPress ?? onMenuToggled}
		style={{
			alignSelf: 'flex-end',
		}}
		accessibilityActions={props.accessibilityActions}
		onAccessibilityAction={props.onAccessibilityAction}
	/>;

	return <>
		<View
			style={{
				position: 'absolute',
				bottom: 10,
				right: 10,
			}}
		>
			{menuButton}
		</View>
		<BottomDrawer
			visible={open}
			onDismiss={onDismiss}
			onShow={props.onMenuShow}
		>
			{props.menuContent}
		</BottomDrawer>
	</>;
};

export default connect()(FloatingActionButton);
