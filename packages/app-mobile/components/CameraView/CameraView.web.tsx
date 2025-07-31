import * as React from 'react';
import { useCallback, useMemo } from 'react';

import { connect } from 'react-redux';
import { StyleSheet, View } from 'react-native';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../utils/types';
import { PrimaryButton } from '../buttons';
import { themeStyle } from '../global-style';
import { CameraViewProps } from './types';
import pickDocument from '../../utils/pickDocument';

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			container: {
				backgroundColor: theme.backgroundColor,
				flexGrow: 1,
				justifyContent: 'center',
				alignItems: 'center',
			},
		});
	}, [themeId]);
};

const CameraViewComponent: React.FC<CameraViewProps> = props => {
	const styles = useStyles(props.themeId);

	const onUploadPress = useCallback(async () => {
		const response = await pickDocument({ preferCamera: true });
		for (const asset of response) {
			props.onPhoto({
				uri: asset.uri,
				type: asset.type,
			});
		}
	}, [props.onPhoto]);

	return (
		<View style={styles.container}>
			<PrimaryButton
				icon='file-upload'
				onPress={onUploadPress}
			>{_('Upload photo')}</PrimaryButton>
		</View>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		themeId: state.settings.theme,
		cameraRatio: state.settings['camera.ratio'],
		cameraType: state.settings['camera.type'],
	};
};

export default connect(mapStateToProps)(CameraViewComponent);
