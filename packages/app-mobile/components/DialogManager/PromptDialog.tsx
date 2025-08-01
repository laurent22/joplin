import * as React from 'react';
import { Dialog, Divider, Surface, Text } from 'react-native-paper';
import { DialogType, ButtonDialogData } from './types';
import { StyleSheet, ViewStyle } from 'react-native';
import { useMemo } from 'react';
import PromptButton from './PromptButton';

interface Props {
	dialog: ButtonDialogData;
	containerStyle: ViewStyle;
	themeId: number;
}

const useStyles = (isMenu: boolean) => {
	return useMemo(() => {
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
				} : {}),
			},
			dialogLabel: {
				textAlign: isMenu ? 'center' : undefined,
			},
		});
	}, [isMenu]);
};

const PromptDialog: React.FC<Props> = ({ dialog, containerStyle, themeId }) => {
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

	return (
		<Surface
			testID={'prompt-dialog'}
			style={containerStyle}
			key={dialog.key}
			elevation={1}
		>
			<Dialog.Content style={styles.dialogContent}>
				{dialog.title ? titleComponent : null}
				<Text
					variant='bodyMedium'
					style={styles.dialogLabel}
				>{dialog.message}</Text>
			</Dialog.Content>
			{isMenu ? <Divider/> : null}
			<Dialog.Actions
				style={styles.dialogActions}
			>
				{buttons}
			</Dialog.Actions>
		</Surface>
	);
};

export default PromptDialog;
