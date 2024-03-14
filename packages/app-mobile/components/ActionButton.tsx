const React = require('react');
import { useState, useCallback, useMemo } from 'react';
import { FAB, Portal } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import { Dispatch } from 'redux';
import { useWindowDimensions } from 'react-native';
import shim from '@joplin/lib/shim';
// import { useWindowDimensions } from 'react-native';
// import shim from '@joplin/lib/shim';
const Icon = require('react-native-vector-icons/Ionicons').default;

// eslint-disable-next-line no-undef -- Don't know why it says React is undefined when it's defined above
type FABGroupProps = React.ComponentProps<typeof FAB.Group>;

type OnButtonPress = ()=> void;
interface ButtonSpec {
	icon: string;
	label: string;
	color?: string;
	onPress?: OnButtonPress;
}

interface ActionButtonProps {
	buttons?: ButtonSpec[];

	// If not given, an "add" button will be used.
	mainButton?: ButtonSpec;
	dispatch: Dispatch;
}

const defaultOnPress = () => {};

// Returns a render function compatible with React Native Paper.
const getIconRenderFunction = (iconName: string) => {
	return (props: any) => <Icon name={iconName} {...props} />;
};

const useIcon = (iconName: string) => {
	return useMemo(() => {
		return getIconRenderFunction(iconName);
	}, [iconName]);
};

const ActionButton = (props: ActionButtonProps) => {
	const [open, setOpen] = useState(false);
	const onMenuToggled: FABGroupProps['onStateChange'] = useCallback(state => {
		props.dispatch({
			type: 'SIDE_MENU_CLOSE',
		});
		setOpen(state.open);
	}, [setOpen, props.dispatch]);

	const actions = useMemo(() => (props.buttons ?? []).map(button => {
		return {
			...button,
			icon: getIconRenderFunction(button.icon),
			onPress: button.onPress ?? defaultOnPress,
		};
	}), [props.buttons]);

	const closedIcon = useIcon(props.mainButton?.icon ?? 'add');
	const openIcon = useIcon('close');

	// To work around an Android accessibility bug, we decrease the
	// size of the container for the FAB. According to the documentation for
	// RN Paper, a large action button has size 96x96. As such, we allocate
	// a larger than this space for the button.
	//
	// To prevent the accessibility issue from regressing (which makes it
	// very hard to access some UI features), we also enable this when Talkback
	// is disabled.
	//
	// See https://github.com/callstack/react-native-paper/issues/4064
	const windowSize = useWindowDimensions();
	const adjustMargins = !open && shim.mobilePlatform() === 'android';
	const marginTop = adjustMargins ? Math.max(0, windowSize.height - 120) : 0;
	const marginStart = adjustMargins ? Math.max(0, windowSize.width - 200) : 0;

	return (
		<Portal>
			<FAB.Group
				open={open}
				accessibilityLabel={props.mainButton?.label ?? _('Add new')}
				style={{ marginStart, marginTop }}
				icon={ open ? openIcon : closedIcon }
				fabStyle={{
					backgroundColor: props.mainButton?.color ?? 'rgba(231,76,60,1)',
				}}
				onStateChange={onMenuToggled}
				actions={actions}
				onPress={props.mainButton?.onPress ?? defaultOnPress}
				visible={true}
			/>
		</Portal>
	);
};

export default ActionButton;
