
// On some devices, the SafeAreaView conflicts with the KeyboardAvoidingView, creating
// additional (or a lack of additional) space at the bottom of the screen. Because this
// is different on different devices, this button allows toggling additional space a the bottom
// of the screen to compensate.

// Works around https://github.com/facebook/react-native/issues/13393 by adding additional
// space below the given component when the keyboard is visible unless a button is pressed.

import Setting from '@joplin/lib/models/Setting';
import { themeStyle } from '@joplin/lib/theme';

import * as React from 'react';
import { ReactNode, useCallback, useState, useEffect } from 'react';
import { Platform, useWindowDimensions, View, ViewStyle } from 'react-native';
import IconButton from './IconButton';
import useKeyboardVisible from '../utils/hooks/useKeyboardVisible';

interface Props {
	children: ReactNode;
	themeId: number;
	style?: ViewStyle;
}

const ToggleSpaceButton = (props: Props) => {
	const [additionalSpace, setAdditionalSpace] = useState(0);
	const [decreaseSpaceBtnVisible, setDecreaseSpaceBtnVisible] = useState(true);

	// Some devices need space added, others need space removed.
	const additionalPositiveSpace = 14;
	const additionalNegativeSpace = -14;

	// Switch from adding +14px to -14px.
	const onDecreaseSpace = useCallback(() => {
		setAdditionalSpace(additionalNegativeSpace);
		setDecreaseSpaceBtnVisible(false);
		Setting.setValue('editor.mobile.removeSpaceBelowToolbar', true);
	}, [setAdditionalSpace, setDecreaseSpaceBtnVisible, additionalNegativeSpace]);

	useEffect(() => {
		if (Setting.value('editor.mobile.removeSpaceBelowToolbar')) {
			onDecreaseSpace();
		}
	}, [onDecreaseSpace]);

	const theme = themeStyle(props.themeId);

	const decreaseSpaceButton = (
		<>
			<View style={{
				height: additionalPositiveSpace,
				zIndex: -2,
			}} />
			<IconButton
				themeId={props.themeId}
				description={'Move toolbar to bottom of screen'}
				containerStyle={{
					height: additionalPositiveSpace,
					width: '100%',

					// Ensure that the icon is near the bottom of the screen,
					// and thus invisible on devices where it isn't necessary.
					position: 'absolute',
					bottom: 0,

					// Don't show the button on top of views with content.
					zIndex: -1,

					alignItems: 'center',
				}}
				onPress={onDecreaseSpace}

				iconName='material chevron-down'
				iconStyle={{ color: theme.color }}
			/>
		</>
	);

	const { keyboardVisible } = useKeyboardVisible();
	const windowSize = useWindowDimensions();
	const isPortrait = windowSize.height > windowSize.width;
	const spaceApplicable = keyboardVisible && Platform.OS === 'ios' && isPortrait;

	const style: ViewStyle = {
		marginBottom: spaceApplicable ? additionalSpace : 0,
		...props.style,
	};

	return (
		<View style={style}>
			{props.children}
			{ decreaseSpaceBtnVisible && spaceApplicable ? decreaseSpaceButton : null }
		</View>
	);
};

export default ToggleSpaceButton;
