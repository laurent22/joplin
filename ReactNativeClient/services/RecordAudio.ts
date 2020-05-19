import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { PermissionsAndroid, Alert, Platform } from 'react-native';

export default class RecordAudio {
	audioRecorderPlayer: AudioRecorderPlayer;
	static instance_:RecordAudio = null;

	constructor() {
		this.audioRecorderPlayer = new AudioRecorderPlayer();
	}

	static instance() {
		if (RecordAudio.instance_) return RecordAudio.instance_;
		RecordAudio.instance_ = new RecordAudio();
		return RecordAudio.instance_;
	}

	async onStartRecord() {
		if (!(await this.checkPermission(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE)) && !(await this.checkPermission(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO))) {
			Alert.alert('Warning', 'In order to record audio your permission to write to external storage and record audio is required.');
		}
		await this.audioRecorderPlayer.startRecorder();
	}

	async onStopRecord() {
		const result = await this.audioRecorderPlayer.stopRecorder();
		this.audioRecorderPlayer.removeRecordBackListener();
		return result;
	}

	async checkPermission(permission: any) {
		if (Platform.OS !== 'android') {
			// Not implemented yet
			return true;
		}
		const hasPermission = await PermissionsAndroid.check(permission);
		if (hasPermission) {
			return true;
		}
		const requestResult = await PermissionsAndroid.request(permission, {
			title: 'Information',
			message: 'In order to record audio your permission to write to external storage and record audio is required.',
			buttonPositive: 'OK',
		});
		return requestResult === PermissionsAndroid.RESULTS.GRANTED;
	}
}
