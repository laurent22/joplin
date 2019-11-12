const React = require('react');
const Component = React.Component;
const { connect } = require('react-redux');
const { View, TouchableOpacity, Text, Dimensions } = require('react-native');
import { RNCamera } from 'react-native-camera';
const Icon = require('react-native-vector-icons/Ionicons').default;
const { _ } = require('lib/locale.js');
const { shim } = require('lib/shim');
const Setting = require('lib/models/Setting');

class CameraView extends Component {
	constructor() {
		super();

		const dimensions = Dimensions.get('window');

		this.state = {
			snapping: false,
			ratios: [],
			screenWidth: dimensions.width,
			screenHeight: dimensions.height,
		};

		this.back_onPress = this.back_onPress.bind(this);
		this.photo_onPress = this.photo_onPress.bind(this);
		this.reverse_onPress = this.reverse_onPress.bind(this);
		this.ratio_onPress = this.ratio_onPress.bind(this);
		this.onCameraReady = this.onCameraReady.bind(this);
		this.onLayout = this.onLayout.bind(this);
	}

	onLayout(event) {
		this.setState({
			screenWidth: event.nativeEvent.layout.width,
			screenHeight: event.nativeEvent.layout.height,
		});
	}

	back_onPress() {
		if (this.props.onCancel) this.props.onCancel();
	}

	reverse_onPress() {
		if (this.props.cameraType === RNCamera.Constants.Type.back) {
			Setting.setValue('camera.type', RNCamera.Constants.Type.front);
		} else {
			Setting.setValue('camera.type', RNCamera.Constants.Type.back);
		}
	}

	ratio_onPress() {
		if (this.state.ratios.length <= 1) return;

		let index = this.state.ratios.indexOf(this.props.cameraRatio);
		index++;
		if (index >= this.state.ratios.length) index = 0;
		Setting.setValue('camera.ratio', this.state.ratios[index]);
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

	async onCameraReady() {
		const ratios = await this.camera.getSupportedRatiosAsync();
		this.setState({ ratios: ratios });
	}

	renderButton(onPress, iconName, style) {
		let icon = null;

		if (typeof iconName === 'string') {
			icon = (
				<Icon
					name={iconName}
					style={{
						fontSize: 40,
						color: 'black',
					}}
				/>
			);
		} else {
			icon = iconName;
		}

		return (
			<TouchableOpacity onPress={onPress} style={Object.assign({}, style)}>
				<View style={{borderRadius: 32, width: 60, height: 60, borderColor: '#00000040', borderWidth: 1, borderStyle: 'solid', backgroundColor: '#ffffff77', justifyContent: 'center', alignItems: 'center', alignSelf: 'baseline' }}>
					{ icon }
				</View>
			</TouchableOpacity>
		);
	}

	fitRectIntoBounds(rect, bounds) {
		var rectRatio = rect.width / rect.height;
		var boundsRatio = bounds.width / bounds.height;

		var newDimensions = {};

		// Rect is more landscape than bounds - fit to width
		if (rectRatio > boundsRatio) {
			newDimensions.width = bounds.width;
			newDimensions.height = rect.height * (bounds.width / rect.width);
		} else { // Rect is more portrait than bounds - fit to height
			newDimensions.width = rect.width * (bounds.height / rect.height);
			newDimensions.height = bounds.height;
		}

		return newDimensions;
	}

	cameraRect(ratio) {
		// To keep the calculations simpler, it's assumed that the phone is in
		// portrait orientation. Then at the end we swap the values if needed.
		const splitted = ratio.split(':');

		const output = this.fitRectIntoBounds({
			width: Number(splitted[1]),
			height: Number(splitted[0]),
		}, {
			width: Math.min(this.state.screenWidth, this.state.screenHeight),
			height: Math.max(this.state.screenWidth, this.state.screenHeight),
		});

		if (this.state.screenWidth > this.state.screenHeight) {
			const w = output.width;
			output.width = output.height;
			output.height = w;
		}

		return output;
	}

	render() {
		const photoIcon = this.state.snapping ? 'md-checkmark' : 'md-camera';

		const displayRatios = shim.mobilePlatform() === 'android' && this.state.ratios.length > 1;

		const reverseCameraButton = this.renderButton(this.reverse_onPress, 'md-reverse-camera', { flex: 1, flexDirection: 'row', justifyContent: 'flex-start', marginLeft: 20 });
		const ratioButton = !displayRatios ? <View style={{ flex: 1 }}/> : this.renderButton(this.ratio_onPress, <Text style={{fontWeight: 'bold', fontSize: 20}}>{Setting.value('camera.ratio')}</Text>, { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', marginRight: 20 });

		let cameraRatio = '4:3';
		const cameraProps = {};
		if (displayRatios) {
			cameraProps.ratio = this.props.cameraRatio;
			cameraRatio = this.props.cameraRatio;
		}

		const cameraRect = this.cameraRect(cameraRatio);
		cameraRect.left = (this.state.screenWidth - cameraRect.width) / 2;
		cameraRect.top = (this.state.screenHeight - cameraRect.height) / 2;

		return (
			<View style={Object.assign({}, this.props.style, { position: 'relative' })} onLayout={this.onLayout}>
				<View style={{ position: 'absolute', backgroundColor: '#000000', width: '100%', height: '100%' }}/>
				<RNCamera
					style={Object.assign({ position: 'absolute' }, cameraRect)}
					ref={ref => {
						this.camera = ref;
					}}
					type={this.props.cameraType}
					captureAudio={false}
					onCameraReady={this.onCameraReady}
					androidCameraPermissionOptions={{
						title: _('Permission to use camera'),
						message: _('Your permission to use your camera is required.'),
						buttonPositive: _('OK'),
						buttonNegative: _('Cancel'),
					}}

					{ ...cameraProps }
				>
					<View style={{ flex: 1, justifyContent: 'space-between', flexDirection: 'column' }}>
						<View style={{ flex: 1, justifyContent: 'flex-start' }}>
							<TouchableOpacity onPress={this.back_onPress}>
								<View style={{ marginLeft: 5, marginTop: 5, borderColor: '#00000040', borderWidth: 1, borderStyle: 'solid', borderRadius: 90, width: 50, height: 50, display: 'flex', backgroundColor: '#ffffff77', justifyContent: 'center', alignItems: 'center' }}>
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
						<View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end' }}>
							<View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
								{ reverseCameraButton }
								<TouchableOpacity onPress={this.photo_onPress}>
									<View style={{ flexDirection: 'row', borderRadius: 90, width: 90, height: 90, backgroundColor: '#ffffffaa', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
										<Icon
											name={photoIcon}
											style={{
												fontSize: 60,
												color: 'black',
											}}
										/>
									</View>
								</TouchableOpacity>
								{ ratioButton }
							</View>
						</View>
					</View>
				</RNCamera>
			</View>
		);
	}
}

const mapStateToProps = state => {
	return {
		cameraRatio: state.settings['camera.ratio'],
		cameraType: state.settings['camera.type'],
	};
};


module.exports = connect(mapStateToProps)(CameraView);
