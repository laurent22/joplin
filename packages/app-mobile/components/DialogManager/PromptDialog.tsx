import * as React from 'react';
import { Dialog, Divider, Surface, Text } from 'react-native-paper';
import { DialogType, ButtonDialogData } from './types';
import { StyleSheet, ViewStyle } from 'react-native';
import { useMemo } from 'react';
import PromptButton from './PromptButton';
import { themeStyle } from '../global-style';

interface Props {
	dialog: ButtonDialogData;
	containerStyle: ViewStyle;
	themeId: number;
}

const useStyles = (themeId: number, isMenu: boolean) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		return StyleSheet.create({

			dialogContent: {
				paddingBottom: theme.margin,
				paddingHorizontal: theme.margin,
			},
			dialogActions: {
				paddingBottom: theme.margin,
				paddingHorizontal: theme.margin,
				paddingTop: isMenu ? 4 : theme.marginSmall,

				...(isMenu ? {
					flexDirection: 'column',
					alignItems: 'stretch',
					gap: 1,
				} : {
					gap: theme.marginMedium,
					flexWrap: 'wrap',
				}),
			},
			dialogLabel: isMenu ? {
				textAlign: 'center',
			} : {},
		});
	}, [isMenu, themeId]);
};

const PromptDialog: React.FC<Props> = ({ dialog, containerStyle, themeId }) => {
	const isMenu = dialog.type === DialogType.Menu;
	const styles = useStyles(themeId, isMenu);

	const buttons = dialog.buttons.map((button, index) => {
		return <PromptButton
			key={`${index}-${button.text}`}
			buttonSpec={button}
			isMenu={isMenu}
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
					variant='titleMedium'
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
