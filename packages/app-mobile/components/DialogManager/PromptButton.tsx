import * as React from 'react';
import { useMemo } from 'react';
import { StyleSheet, TextStyle, View } from 'react-native';
import { TouchableRipple, Text } from 'react-native-paper';
import { PromptButtonSpec } from './types';
import { ThemeStyle, themeStyle } from '../global-style';
import Icon from '../Icon';

interface Props {
	themeId: number;
	buttonSpec: PromptButtonSpec;
}

const useStyles = (theme: ThemeStyle) => {
	return useMemo(() => {
		const buttonText: TextStyle = {
			color: theme.color4,
			textAlign: 'center',
		};

		return StyleSheet.create({
			buttonContainer: {
				// This applies the borderRadius to the TouchableRipple's parent, which
				// seems necessary on Android.
				borderRadius: theme.borderRadius,
				overflow: 'hidden',
			},
			button: {
				borderRadius: theme.borderRadius,
				padding: 10,
			},
			buttonContent: {
				display: 'flex',
				flexDirection: 'row',
				justifyContent: 'center',
				alignItems: 'baseline',
			},
			buttonText,
			icon: {
				...buttonText,
				marginRight: 8,
			},
		});
	}, [theme]);
};

const PromptButton: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);
	const styles = useStyles(theme);

	const { checked, text, iconChecked, onPress } = props.buttonSpec;

	const isCheckbox = (checked ?? null) !== null;
	const icon = checked ? (
		<>
			<Icon
				accessibilityLabel={null}
				style={styles.icon}
				name={iconChecked ?? 'fas fa-check'}
			/>
		</>
	) : null;

	return (
		<View style={styles.buttonContainer}>
			<TouchableRipple
				onPress={onPress}
				style={styles.button}
				rippleColor={theme.backgroundColorHover4}
				accessibilityRole={isCheckbox ? 'checkbox' : 'button'}
				accessibilityState={isCheckbox ? { checked } : null}
				aria-checked={isCheckbox ? checked : undefined}
			>
				<View style={styles.buttonContent}>
					{icon}
					<Text style={styles.buttonText}>{text}</Text>
				</View>
			</TouchableRipple>
		</View>
	);
};

export default PromptButton;
