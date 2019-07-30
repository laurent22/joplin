const React = require('react');
const Component = React.Component;
const { View, TouchableOpacity } = require('react-native');
import { RNCamera } from 'react-native-camera';
const Icon = require('react-native-vector-icons/Ionicons').default;
const { _ } = require('lib/locale.js');

class CameraView extends Component {
	constructor() {
		super();

		this.state = {
			snapping: false,
		};

		this.back_onPress = this.back_onPress.bind(this);
		this.photo_onPress = this.photo_onPress.bind(this);
	}

	back_onPress() {
		if (this.props.onCancel) this.props.onCancel();
	}

	async photo_onPress() {
		if (!this.camera || !this.props.onPhoto) return;

		this.setState({ snapping: true });

		const result = await this.camera.takePictureAsync({
			quality: 0.8,
			exif: true,
			fixOrientation: true,
		});

		if (this.props.onPhoto) this.props.onPhoto(result);

		this.setState({ snapping: false });
	}

	render() {
		const photoIcon = this.state.snapping ? 'md-checkmark' : 'md-camera';

		return (
			<View style={this.props.style}>
				<RNCamera
					style={{ flex: 1 }}
					ref={ref => {
						this.camera = ref;
					}}
					type={RNCamera.Constants.Type.back}
					captureAudio={false}
					androidCameraPermissionOptions={{
						title: _('Permission to use camera'),
						message: _('Your permission to use your camera is required.'),
						buttonPositive: _('OK'),
						buttonNegative: _('Cancel'),
					}}
				>
					<View style={{ flex: 1, justifyContent: 'space-between', flexDirection: 'column' }}>
						<View style={{ flex: 1, justifyContent: 'flex-start' }}>
							<TouchableOpacity onPress={this.back_onPress}>
								<View style={{ marginLeft: 5, marginTop: 5, borderRadius: 90, width: 50, height: 50, display: 'flex', backgroundColor: '#ffffff55', justifyContent: 'center', alignItems: 'center' }}>
									<Icon
										name={'md-arrow-back'}
										style={{
											fontSize: 40,
											color: 'black',
										}}
									/>
								</View>
							</TouchableOpacity>
						</View>
						<View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-end', flexDirection: 'row' }}>
							<TouchableOpacity onPress={this.photo_onPress}>
								<View style={{ marginBottom: 20, borderRadius: 90, width: 90, height: 90, backgroundColor: '#ffffffaa', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
									<Icon
										name={photoIcon}
										style={{
											fontSize: 60,
											color: 'black',
										}}
									/>
								</View>
							</TouchableOpacity>
						</View>
					</View>
				</RNCamera>
			</View>
		);
	}
}

module.exports = CameraView;
