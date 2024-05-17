import * as React from 'react';
import { useMemo, ReactNode } from 'react';
import { TextStyle, ViewStyle } from 'react-native';
import { Chip, Icon } from 'react-native-paper';


interface Props {
	icon: string;
	foreground?: string;
	background?: string;
	onPress?: ()=> void;
	children: ReactNode;
}

const useThemeOverride = (foreground: string|undefined, background: string|undefined) => {
	return useMemo(() => {
		if (!foreground || !background) {
			return {};
		}

		return {
			colors: {
				secondaryContainer: background,
				onSecondaryContainer: foreground,
				primary: foreground,
			},
		};
	}, [foreground, background]);
};

const containerStyle: ViewStyle = {
	borderRadius: 5,
	paddingTop: 0,
	paddingBottom: 0,
	paddingLeft: 1,
	paddingRight: 1,
};
const textStyle: TextStyle = {
	fontSize: 12,
	marginTop: 0,
	marginBottom: 0,
	marginLeft: 4,
	marginRight: 6,
};

const SmallChip: React.FC<Props> = props => {
	const theme = useThemeOverride(props.foreground, props.background);

	const icon = props.icon && <Icon source={props.icon} color={props.foreground} size={12}/>;
	return <Chip
		icon={props.icon ? () => icon : null}
		mode='flat'
		compact={true}
		theme={theme}
		style={containerStyle}
		textStyle={textStyle}
		onPress={props.onPress}
	>
		{props.children}
	</Chip>;
};

export default SmallChip;
