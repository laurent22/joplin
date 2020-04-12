import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { PermissionsAndroid } from 'react-native';

class RecordAudio {
	constructor() {
		this.dispatch = () => {};
        this.audioRecorderPlayer = new AudioRecorderPlayer();
        this.recordSecs = 0;
        this.recordTime = 0;
        this.uri = '';
	};

	static instance() {
		if (RecordAudio.instance_) return RecordAudio.instance_;
		RecordAudio.instance_ = new RecordAudio();
		return RecordAudio.instance_;
    }
    
    async onStartRecord() {
		if (Platform.OS === 'android') {
			try {
				const granted = await PermissionsAndroid.request(
					PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
					{
						title: 'Permissions for write access',
						message: 'Give permission to your storage to write a file',
						buttonPositive: 'ok',
					},
				);
				if (granted === PermissionsAndroid.RESULTS.GRANTED) {
					console.log('You can use the storage');
				} else {
					console.log('permission denied');
					return;
				}
			} catch (err) {
				console.warn(err);
				return;
			}
		}
		if (Platform.OS === 'android') {
			try {
				const granted = await PermissionsAndroid.request(
					PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
					{
						title: 'Permissions for recording audio',
						message: 'Give permission to record audio from the mic',
						buttonPositive: 'ok',
					},
				);
				if (granted === PermissionsAndroid.RESULTS.GRANTED) {
					console.log('You can record audio');
				} else {
					console.log('permission denied');
					return;
				}
			} catch (err) {
				console.warn(err);
				return;
			}
		}

		const uri = await this.audioRecorderPlayer.startRecorder();
		this.audioRecorderPlayer.addRecordBackListener((e) => {
			this.recordSecs = e.current_position;
			this.recordTime = this.audioRecorderPlayer.mmssss(Math.floor(e.current_position));
		});
		console.log(`uri: ${uri}`);
	}

	async onStopRecord() {
		const result = await this.audioRecorderPlayer.stopRecorder();
		this.audioRecorderPlayer.removeRecordBackListener();
        this.recordSecs = 0;
        return result;
    }

    async destroy() {
		RecordAudio.instance_ = null;

		return new Promise((resolve) => {
			const iid = setInterval(() => {
				if (!this.syncCalls_.length) {
					clearInterval(iid);
					this.instance_ = null;
					resolve();
				}
			}, 100);
		});
	}
}

RecordAudio.instance_ = null;

module.exports = RecordAudio;