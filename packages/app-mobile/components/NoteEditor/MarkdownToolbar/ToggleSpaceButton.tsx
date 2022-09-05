
// On some devices, the SafeAreaView conflicts with the KeyboardAvoidingView, creating
// additional (or a lack of additional) space at the bottom of the screen. Because this
// is different on different devices, this button allows toggling additional space a the bottom
// of the screen to compensate.

// Works around https://github.com/facebook/react-native/issues/13393 by adding additional
// space below the given component when the keyboard is visible unless a button is pressed.

import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import { Theme } from '@joplin/lib/themes/type';
import * as React from 'react';
import { ReactNode, useCallback, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import CustomButton from '../../CustomButton';

const AntIcon = require('react-native-vector-icons/AntDesign').default;

interface Props {
	children: ReactNode;
	spaceAppliccable: boolean;
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
	}, [setAdditionalSpace, setDecreaseSpaceBtnVisible, additionalNegativeSpace]);
	const theme: Theme = themeStyle(props.themeId);

	const decreaseSpaceButton = (
		<>
			<View style={{ height: additionalPositiveSpace }} />
			<CustomButton
				themeId={props.themeId}
				description={_('Move toolbar to bottom of screen')}
				style={{
					height: additionalPositiveSpace,
					width: '100%',

					// Ensure that the icon is near the bottom of the screen,
					// and thus invisible on devices where it isn't necessary.
					position: 'absolute',
					bottom: 0,

					alignItems: 'center',
				}}
				onPress={onDecreaseSpace}
			>
				<AntIcon name='down' style={{
					color: theme.color,
				}}/>
			</CustomButton>
		</>
	);

	const style: ViewStyle = {
		marginBottom: props.spaceAppliccable ? additionalSpace : 0,
		...props.style,
	};

	return (
		<View style={style}>
			{props.children}
			{ decreaseSpaceBtnVisible && props.spaceAppliccable ? decreaseSpaceButton : null }
		</View>
	);
};

export default ToggleSpaceButton;
