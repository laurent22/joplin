import * as React from 'react';
import { Card, TouchableRipple } from 'react-native-paper';
import { useMemo } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';

export enum InstallState {
	NotInstalled,
	Installing,
	Installed,
}

interface Props {
	onPress: ()=> void;
	disabled?: boolean;
	children: React.ReactNode;
	style?: ViewStyle;
	testID?: string;
}

const useStyles = (disabled: boolean) => {
	return useMemo(() => {
		// For the TouchableRipple to work on Android, the card needs a transparent background.
		const borderRadius = 12;
		const baseCard = { backgroundColor: 'transparent', borderRadius };
		return StyleSheet.create({
			cardOuterWrapper: {
				margin: 0,
				padding: 0,
				borderRadius,
				overflow: 'hidden',
				// Accessibility: Prevent the 'overflow: hidden' from hiding the focus indicator
				// on web. Only apply to web, as this causes the touchable ripple
				// from being completely contained within the card on non-web platforms.
				...(Platform.OS === 'web' ? {
					margin: -2,
					padding: 2,
				} : {}),
			},
			cardInnerWrapper: {
				width: '100%',
				borderRadius,
			},
			card: disabled ? {
				...baseCard,
				opacity: 0.7,
			} : baseCard,
			content: {
				gap: 5,
			},
		});
	}, [disabled]);
};


const CardButton: React.FC<Props> = props => {
	const containerIsButton = !!props.onPress;
	const styles = useStyles(props.disabled);

	const CardWrapper = containerIsButton ? TouchableRipple : View;
	return (
		<View style={[styles.cardOuterWrapper, props.style]}>
			<CardWrapper
				accessibilityRole={containerIsButton ? 'button' : null}
				accessible={containerIsButton}
				onPress={props.onPress}
				disabled={props.disabled}
				style={styles.cardInnerWrapper}
				testID={props.testID}
			>
				<Card
					mode='outlined'
					style={styles.card}
				>
					{props.children}
				</Card>
			</CardWrapper>
		</View>
	);
};

export default CardButton;
