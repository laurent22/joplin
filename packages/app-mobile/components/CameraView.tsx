const { RNCamera } = require('react-native-camera');
const React = require('react');
const Component = React.Component;
const { connect } = require('react-redux');
const { View, TouchableOpacity, Text, Dimensions } = require('react-native');
const Icon = require('react-native-vector-icons/Ionicons').default;
const { _ } = require('@joplin/lib/locale');
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';

class CameraView extends Component {
	public constructor() {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public onLayout(event: any) {
		this.setState({
			screenWidth: event.nativeEvent.layout.width,
			screenHeight: event.nativeEvent.layout.height,
		});
	}

	private back_onPress() {
		if (this.props.onCancel) this.props.onCancel();
	}

	private reverse_onPress() {
		if (this.props.cameraType === RNCamera.Constants.Type.back) {
			Setting.setValue('camera.type', RNCamera.Constants.Type.front);
		} else {
			Setting.setValue('camera.type', RNCamera.Constants.Type.back);
		}
	}

	private ratio_onPress() {
		if (this.state.ratios.length <= 1) return;

		let index = this.state.ratios.indexOf(this.props.cameraRatio);
		index++;
		if (index >= this.state.ratios.length) index = 0;
		Setting.setValue('camera.ratio', this.state.ratios[index]);
	}

	private async photo_onPress() {
		if (!this.camera || !this.props.onPhoto) return;

		this.setState({ snapping: true });

		const result = await this.camera.takePictureAsync({
			quality: 0.8,
			exif: true,
			fixOrientation: true,
		});

		this.setState({ snapping: false });

		if (this.props.onPhoto) this.props.onPhoto(result);

	}

	public async onCameraReady() {
		if (this.supportsRatios()) {
			const ratios = await this.camera.getSupportedRatiosAsync();
			this.setState({ ratios: ratios });
		}
	}

	// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any -- Old code before rule was applied, Old code before rule was applied
	public renderButton(onPress: Function, iconNameOrIcon: any, style: any) {
		let icon = null;

		if (typeof iconNameOrIcon === 'string') {
			icon = (
				<Icon
					name={iconNameOrIcon}
					style={{
						fontSize: 40,
						color: 'black',
					}}
				/>
			);
		} else {
			icon = iconNameOrIcon;
		}

		return (
			<TouchableOpacity onPress={onPress} style={{ ...style }}>
				<View style={{ borderRadius: 32, width: 60, height: 60, borderColor: '#00000040', borderWidth: 1, borderStyle: 'solid', backgroundColor: '#ffffff77', justifyContent: 'center', alignItems: 'center', alignSelf: 'baseline' }}>
					{ icon }
				</View>
			</TouchableOpacity>
		);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public fitRectIntoBounds(rect: any, bounds: any) {
		const rectRatio = rect.width / rect.height;
		const boundsRatio = bounds.width / bounds.height;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const newDimensions: any = {};

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

	public cameraRect(ratio: string) {
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

	public supportsRatios() {
		return shim.mobilePlatform() === 'android';
	}

	public render() {
		const photoIcon = this.state.snapping ? 'checkmark' : 'camera';

		const displayRatios = this.supportsRatios() && this.state.ratios.length > 1;

		const reverseCameraButton = this.renderButton(this.reverse_onPress, 'camera-reverse', { flex: 1, flexDirection: 'row', justifyContent: 'flex-start', marginLeft: 20 });
		const ratioButton = !displayRatios ? <View style={{ flex: 1 }}/> : this.renderButton(this.ratio_onPress, <Text style={{ fontWeight: 'bold', fontSize: 20 }}>{Setting.value('camera.ratio')}</Text>, { flex: 1, flexDirection: 'row', justifyContent: 'flex-end', marginRight: 20 });

		let cameraRatio = '4:3';
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const cameraProps: any = {};

		if (displayRatios) {
			cameraProps.ratio = this.props.cameraRatio;
			cameraRatio = this.props.cameraRatio;
		}

		const cameraRect = this.cameraRect(cameraRatio);
		cameraRect.left = (this.state.screenWidth - cameraRect.width) / 2;
		cameraRect.top = (this.state.screenHeight - cameraRect.height) / 2;

		return (
			<View style={{ ...this.props.style, position: 'relative' }} onLayout={this.onLayout}>
				<View style={{ position: 'absolute', backgroundColor: '#000000', width: '100%', height: '100%' }}/>
				<RNCamera
					style={({ position: 'absolute', ...cameraRect })}
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					ref={(ref: any) => {
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
										name={'arrow-back'}
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
								<TouchableOpacity onPress={this.photo_onPress} disabled={this.state.snapping}>
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const mapStateToProps = (state: any) => {
	return {
		cameraRatio: state.settings['camera.ratio'],
		cameraType: state.settings['camera.type'],
	};
};


export default connect(mapStateToProps)(CameraView);
