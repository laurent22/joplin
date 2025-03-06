import { useMemo } from 'react';
import { AccessibilityActionEvent, NativeSyntheticEvent } from 'react-native';

interface Props {
	onLongPress: ()=> void;
	// Read by accessibility tools on iOS/Android when describing
	// the long press action. For example, TalkBack might read
	// "Double-tap to activate. Double-tap and hold to [[longPressLabel]]".
	actionDescription: string;
}

// Allows adding an onLongPress listener in a more accessible way.
// In particular:
// - For keyboard accessibility (web only) adds an onContextMenu listener.
// - Adds a longpress accessibility action. This causes TalkBack to announce that
//   a longpress accessibility action is available.
const useOnLongPressProps = ({ onLongPress, actionDescription }: Props) => {
	return useMemo(() => {
		if (!onLongPress) return {};

		return {
			onContextMenu: (event: NativeSyntheticEvent<unknown>) => {
				event.preventDefault();
				onLongPress();
			},
			onLongPress,
			accessibilityActions: [
				{ name: 'longpress', label: actionDescription },
			],
			onAccessibilityAction: (event: AccessibilityActionEvent)=>{
				if (event.nativeEvent.actionName === 'longpress') {
					onLongPress();
				}
			},
		};
	}, [onLongPress, actionDescription]);
};

export default useOnLongPressProps;
