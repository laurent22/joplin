import * as React from 'react';
import { Divider, Surface, Text } from 'react-native-paper';
import { DialogType, ButtonDialogData } from './types';
import { Modal, StyleSheet, TouchableWithoutFeedback, useWindowDimensions, View, ViewStyle } from 'react-native';
import { useMemo } from 'react';
import PromptButton from './PromptButton';

interface Props {
	dialog: ButtonDialogData;
	containerStyle: ViewStyle;
	themeId: number;
}

const useStyles = (isMenu: boolean) => {
	const { width: windowWidth } = useWindowDimensions();
	return useMemo(() => {
		const dialogWidth = windowWidth < 400 ? windowWidth - 8 : Math.min(windowWidth * 0.9, 950);
		return StyleSheet.create({

			dialogContent: {
				paddingBottom: 14,
			},
			dialogActions: {
				paddingBottom: 14,
				paddingTop: 4,

				...(isMenu ? {
					flexDirection: 'column',
					alignItems: 'stretch',
				} : {
					flexDirection: 'row',
					justifyContent: 'flex-end',
				}),
			},
			dialogLabel: {
				textAlign: isMenu ? 'center' : undefined,
			},
			dialogOuterContainer: {
				flex: 1,
				justifyContent: 'center',
				alignItems: 'center',
				backgroundColor: 'rgba(0,0,0,0.1)',
			},
			modalContainer: {
				width: dialogWidth,
				paddingHorizontal: 24,
			},
		});
	}, [isMenu, windowWidth]);
};

const WebPromptDialog: React.FC<Props> = ({ dialog, containerStyle, themeId }) => {
	const isMenu = dialog.type === DialogType.Menu;
	const styles = useStyles(isMenu);

	const buttons = dialog.buttons.map((button, index) => {
		return <PromptButton
			key={`${index}-${button.text}`}
			buttonSpec={button}
			themeId={themeId}
		/>;
	});
	const titleComponent = <Text
		variant='titleMedium'
		accessibilityRole='header'
		style={styles.dialogLabel}
	>{dialog.title}</Text>;

	const onDismiss = () => {
		dialog.onDismiss?.();
	};

	return (
		<Modal animationType="fade" transparent onRequestClose={onDismiss} onDismiss={onDismiss}>
			<TouchableWithoutFeedback onPress={onDismiss}>
				<View style={styles.dialogOuterContainer}>
					<TouchableWithoutFeedback>
						<Surface
							testID={'prompt-dialog'}
							style={[styles.modalContainer, containerStyle]}
							key={dialog.key}
							elevation={1}
						>
							<View style={styles.dialogContent}>
								{dialog.title ? titleComponent : null}
								<Text
									variant='bodyMedium'
									style={styles.dialogLabel}
								>{dialog.message}</Text>
							</View>
							{isMenu ? <Divider/> : null}
							<View style={styles.dialogActions}>
								{buttons}
							</View>
						</Surface>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
};

export default WebPromptDialog;
