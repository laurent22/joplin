import * as React from 'react';
import { useMemo } from 'react';
import { StyleSheet, TextStyle, View } from 'react-native';
import { TouchableRipple, Text, useTheme } from 'react-native-paper';
import { PromptButtonSpec } from './types';
import { ThemeStyle, themeStyle } from '../global-style';
import Icon from '../Icon';

interface Props {
	themeId: number;
	buttonSpec: PromptButtonSpec;
	isMenu: boolean;
}

const useStyles = (theme: ThemeStyle, spec: PromptButtonSpec, isMenu: boolean) => {
	const paperTheme = useTheme();

	const { backgroundColor, color } = (() => {
		const style = spec.style ?? 'default';
		if (style === 'destructive') {
			return {
				backgroundColor: paperTheme.colors.errorContainer,
				color: paperTheme.colors.onErrorContainer,
			};
		} else if (style === 'cancel') {
			return {
				backgroundColor: theme.backgroundColor4Dimmed,
				color: theme.color4,
			};
		} else if (isMenu) {
			return {
				backgroundColor: theme.backgroundColor4,
				color: theme.color4,
			};
		} else {
			return {
				backgroundColor: theme.backgroundColor5,
				color: theme.color5,
			};
		}
	})();

	const styles = useMemo(() => {
		const buttonText: TextStyle = {
			color: color,
			textAlign: 'center',
		};

		return StyleSheet.create({
			buttonContainer: {
				backgroundColor: backgroundColor,

				// This applies the borderRadius to the TouchableRipple's parent, which
				// seems necessary on Android.
				borderRadius: theme.borderRadius,
				overflow: 'hidden',
				// Add additional padding to prevent the focus indicator from clipped by
				// the overflow: 'hidden':
				padding: 1,
			},
			button: {
				borderRadius: theme.borderRadius,
				paddingHorizontal: (theme.marginMedium - 1) * 2,
				paddingTop: theme.marginMedium - 1,
				paddingBottom: theme.marginMedium - 1,
				minWidth: theme.margin * 5,
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
				marginRight: theme.marginSmall,
			},
		});
	}, [theme, color, backgroundColor]);

	return styles;
};

const PromptButton: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);
	const styles = useStyles(theme, props.buttonSpec, props.isMenu);

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
