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
			camera: RNCamera.Constants.Type.back,
		};

		this.back_onPress = this.back_onPress.bind(this);
		this.photo_onPress = this.photo_onPress.bind(this);
		this.reverse_onPress = this.reverse_onPress.bind(this);
	}

	back_onPress() {
		if (this.props.onCancel) this.props.onCancel();
	}

	reverse_onPress() {
		if (this.state.camera == RNCamera.Constants.Type.back) {
			this.setState({
				camera: RNCamera.Constants.Type.front,
			});
		} else if (this.state.camera == RNCamera.Constants.Type.front) {
			this.setState({
				camera: RNCamera.Constants.Type.back,
			});
		}
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
					type={this.state.camera}
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
						<View style={{ flex: 1, alignItems: 'flex-end', flexDirection: 'row', width: '100%' }}>
							<View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }}>
								<TouchableOpacity onPress={this.reverse_onPress} style={{width: '35%', marginLeft: 20}}>
									<View style={{borderRadius: 32, width: 60, height: 60, backgroundColor: '#ffffffaa', justifyContent: 'center', alignItems: 'center', alignSelf: 'baseline' }}>
										<Icon
											name="md-reverse-camera"
											style={{
												fontSize: 40,
												color: 'black',
											}}
										/>
									</View>
								</TouchableOpacity>
								<TouchableOpacity onPress={this.photo_onPress} style={{width: '65%'}}>
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
					</View>
				</RNCamera>
			</View>
		);
	}
}

module.exports = CameraView;
