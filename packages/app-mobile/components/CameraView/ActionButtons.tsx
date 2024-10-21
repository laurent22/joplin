import * as React from 'react';
import { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import IconButton from '../IconButton';
import { _ } from '@joplin/lib/locale';
import { CameraDirection } from '@joplin/lib/models/settings/builtInMetadata';
import { ActivityIndicator } from 'react-native-paper';

interface Props {
	themeId: number;
	onCameraReverse: ()=> void;
	cameraDirection: CameraDirection;

	onSetCameraRatio: ()=> void;
	cameraRatio: string;

	onCancelPhoto: ()=> void;
	onTakePicture: ()=> void;
	takingPicture: boolean;

	cameraReady: boolean;
}

const useStyles = () => {
	return useMemo(() => {
		const buttonContainer: ViewStyle = {
			borderRadius: 32,
			minWidth: 60,
			minHeight: 60,
			borderColor: '#00000040',
			borderWidth: 1,
			borderStyle: 'solid',
			backgroundColor: '#ffffff77',
			justifyContent: 'center',
			alignItems: 'center',
			alignSelf: 'flex-end',
		};
		const buttonRowContainer: ViewStyle = {
			display: 'flex',
			flexDirection: 'row',
			justifyContent: 'space-between',
			left: 20,
			right: 20,
			position: 'absolute',
		};

		return StyleSheet.create({
			buttonRowContainerTop: {
				...buttonRowContainer,
				top: 20,
			},
			buttonRowContainerBottom: {
				...buttonRowContainer,
				bottom: 20,
			},
			buttonContainer,
			buttonContent: {
				color: 'black',
				fontSize: 40,
			},
			buttonPlaceHolder: {
				width: 60,
			},

			qrCodeButtonDimmed: {
				...buttonContainer,
				backgroundColor: '#ffffff44',
				borderWidth: 0,
			},

			takePhotoButtonContainer: {
				...buttonContainer,
				minWidth: 80,
				minHeight: 80,
				borderRadius: 80,
			},
			takePhotoButtonContent: {
				color: 'black',
				fontSize: 60,
			},

			ratioButtonContainer: {
				...buttonContainer,
				aspectRatio: undefined,
				padding: 12,
			},
			ratioButtonContent: {
				fontSize: 20,
				color: 'black',
			},
		});
	}, []);
};

const ActionButtons: React.FC<Props> = props => {
	const styles = useStyles();
	const reverseButton = (
		<IconButton
			iconName='ionicon camera-reverse'
			onPress={props.onCameraReverse}
			description={props.cameraDirection === CameraDirection.Front ? _('Switch to back-facing camera') : _('Switch to front-facing camera')}
			themeId={props.themeId}
			iconStyle={styles.buttonContent}
			containerStyle={styles.buttonContainer}
		/>
	);
	const takePhotoButton = (
		<IconButton
			iconName={props.takingPicture ? 'ionicon checkmark' : 'ionicon camera'}
			onPress={props.onTakePicture}
			description={props.takingPicture ? _('Processing photo...') : _('Take picture')}
			themeId={props.themeId}
			iconStyle={styles.takePhotoButtonContent}
			containerStyle={styles.takePhotoButtonContainer}
		/>
	);
	const ratioButton = (
		<IconButton
			themeId={props.themeId}
			iconName={`text ${props.cameraRatio}`}
			onPress={props.onSetCameraRatio}
			iconStyle={styles.ratioButtonContent}
			containerStyle={styles.ratioButtonContainer}
			description={_('Change ratio')}
		/>
	);

	const cameraActions = (
		<View style={styles.buttonRowContainerBottom}>
			{reverseButton}
			{takePhotoButton}
			{
				// Changing ratio is only supported on Android:
				Platform.OS === 'android' ? ratioButton : <View style={styles.buttonPlaceHolder}/>
			}
		</View>
	);


	return <>
		<View style={styles.buttonRowContainerTop}>
			<IconButton
				themeId={props.themeId}
				iconName='ionicon arrow-back'
				containerStyle={styles.buttonContainer}
				iconStyle={styles.buttonContent}
				onPress={props.onCancelPhoto}
				description={_('Back')}
			/>
		</View>
		{props.cameraReady ? cameraActions : <ActivityIndicator/>}
	</>;
};

export default ActionButtons;
