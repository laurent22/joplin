import * as React from 'react';
import { PrimaryButton, SecondaryButton } from '../buttons';
import { _ } from '@joplin/lib/locale';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Audio, InterruptionModeIOS } from 'expo-av';
import Logger from '@joplin/utils/Logger';
import { OnFileSavedCallback, RecorderState } from './types';
import { Platform } from 'react-native';
import shim from '@joplin/lib/shim';
import FsDriverWeb from '../../utils/fs-driver/fs-driver-rn.web';
import uuid from '@joplin/lib/uuid';
import RecordingControls from './RecordingControls';
import { Text } from 'react-native-paper';
import { AndroidAudioEncoder, AndroidOutputFormat, IOSAudioQuality, IOSOutputFormat, RecordingOptions } from 'expo-av/build/Audio';
import time from '@joplin/lib/time';
import { toFileExtension } from '@joplin/lib/mime-utils';
import { formatMsToDurationCompat } from '@joplin/utils/time';

const logger = Logger.create('AudioRecording');

interface Props {
	onFileSaved: OnFileSavedCallback;
	onDismiss: ()=> void;
}

// Modified from the Expo default recording options to create
// .m4a recordings on both Android and iOS (rather than .3gp on Android).
const recordingOptions = (): RecordingOptions => ({
	isMeteringEnabled: true,
	android: {
		extension: '.m4a',
		outputFormat: AndroidOutputFormat.MPEG_4,
		audioEncoder: AndroidAudioEncoder.AAC,
		sampleRate: 44100,
		numberOfChannels: 2,
		bitRate: 64000,
	},
	ios: {
		extension: '.m4a',
		audioQuality: IOSAudioQuality.MIN,
		outputFormat: IOSOutputFormat.MPEG4AAC,
		sampleRate: 44100,
		numberOfChannels: 2,
		bitRate: 64000,
		linearPCMBitDepth: 16,
		linearPCMIsBigEndian: false,
		linearPCMIsFloat: false,
	},
	web: Platform.OS === 'web' ? {
		mimeType: [
			// Different browsers support different audio formats.
			// In most cases, prefer audio/ogg and audio/mp4 to audio/webm because
			// Chrome and Firefox create .webm files without duration information.
			// See https://issues.chromium.org/issues/40482588
			'audio/ogg', 'audio/mp4', 'audio/webm',
		].find(type => MediaRecorder.isTypeSupported(type)) ?? 'audio/webm',
		bitsPerSecond: 128000,
	} : {},
});

const getRecordingFileName = (extension: string) => {
	return `recording-${time.formatDateToLocal(new Date())}${extension}`;
};

const recordingToSaveData = async (recording: Audio.Recording) => {
	let uri = recording.getURI();
	let type: string|undefined;
	let fileName;

	if (Platform.OS === 'web') {
		// On web, we need to fetch the result (which is a blob URL) and save it in our
		// virtual file system so that it can be processed elsewhere.
		const fetchResult = await fetch(uri);
		const blob = await fetchResult.blob();

		type = recordingOptions().web.mimeType;
		const extension = `.${toFileExtension(type)}`;
		fileName = getRecordingFileName(extension);
		const file = new File([blob], fileName);

		const path = `/tmp/${uuid.create()}-${fileName}`;
		await (shim.fsDriver() as FsDriverWeb).createReadOnlyVirtualFile(path, file);
		uri = path;
	} else {
		const options = recordingOptions();
		const extension = Platform.select({
			android: options.android.extension,
			ios: options.ios.extension,
			default: '',
		});
		fileName = getRecordingFileName(extension);
	}

	return { uri, fileName, type };
};

const resetAudioMode = async () => {
	await Audio.setAudioModeAsync({
		// When enabled, iOS may use the small (phone call) speaker
		// instead of the default one, so it's disabled when not recording:
		allowsRecordingIOS: false,
		playsInSilentModeIOS: false,
	});
};

const useAudioRecorder = (onFileSaved: OnFileSavedCallback, onDismiss: ()=> void) => {
	const [permissionResponse, requestPermissions] = Audio.usePermissions();
	const [recordingState, setRecordingState] = useState<RecorderState>(RecorderState.Idle);
	const [error, setError] = useState('');
	const [duration, setDuration] = useState(0);

	const recordingRef = useRef<Audio.Recording|null>();
	const onStartRecording = useCallback(async () => {
		try {
			setRecordingState(RecorderState.Loading);

			if (permissionResponse?.status !== 'granted') {
				const response = await requestPermissions();
				if (!response.granted) {
					throw new Error(_('Missing permission to record audio.'));
				}
			}

			await Audio.setAudioModeAsync({
				allowsRecordingIOS: true,
				playsInSilentModeIOS: true,
				// Fixes an issue where opening a recording in the iOS audio player
				// breaks creating new recordings.
				// See https://github.com/expo/expo/issues/31152#issuecomment-2341811087
				interruptionModeIOS: InterruptionModeIOS.DoNotMix,
			});
			setRecordingState(RecorderState.Recording);
			const recording = new Audio.Recording();
			await recording.prepareToRecordAsync(recordingOptions());
			recording.setOnRecordingStatusUpdate(status => {
				setDuration(status.durationMillis);
			});
			recordingRef.current = recording;
			await recording.startAsync();
		} catch (error) {
			logger.error('Error starting recording:', error);
			setError(`Recording error: ${error}`);
			setRecordingState(RecorderState.Error);

			void recordingRef.current?.stopAndUnloadAsync();
			recordingRef.current = null;
		}
	}, [permissionResponse, requestPermissions]);

	const onStopRecording = useCallback(async () => {
		const recording = recordingRef.current;
		recordingRef.current = null;

		try {
			setRecordingState(RecorderState.Processing);
			await recording.stopAndUnloadAsync();
			await resetAudioMode();

			const saveEvent = await recordingToSaveData(recording);
			onFileSaved(saveEvent);
			onDismiss();
		} catch (error) {
			logger.error('Error saving recording:', error);
			setError(`Save error: ${error}`);
			setRecordingState(RecorderState.Error);
		}
	}, [onFileSaved, onDismiss]);

	const onStartStopRecording = useCallback(async () => {
		if (recordingState === RecorderState.Idle) {
			await onStartRecording();
		} else if (recordingState === RecorderState.Recording && recordingRef.current) {
			await onStopRecording();
		}
	}, [recordingState, onStartRecording, onStopRecording]);

	useEffect(() => () => {
		if (recordingRef.current) {
			void recordingRef.current?.stopAndUnloadAsync();
			recordingRef.current = null;
			void resetAudioMode();
		}
	}, []);

	return { onStartStopRecording, error, duration, recordingState };
};

const AudioRecordingBanner: React.FC<Props> = props => {
	const { recordingState, onStartStopRecording, duration, error } = useAudioRecorder(props.onFileSaved, props.onDismiss);

	const onCancelPress = useCallback(async () => {
		if (recordingState === RecorderState.Recording) {
			const message = _('Cancelling will discard the recording. This cannot be undone. Are you sure you want to proceed?');
			if (!await shim.showConfirmationDialog(message)) return;
		}
		props.onDismiss();
	}, [recordingState, props.onDismiss]);

	const startStopButtonLabel = recordingState === RecorderState.Idle ? _('Start recording') : _('Done');
	const allowStartStop = recordingState === RecorderState.Idle || recordingState === RecorderState.Recording;
	const actions = <>
		<SecondaryButton onPress={onCancelPress}>{_('Cancel')}</SecondaryButton>
		<PrimaryButton
			disabled={!allowStartStop}
			onPress={onStartStopRecording}
			// Add additional accessibility information to make it clear that "Done" is
			// associated with the voice recording banner:
			accessibilityHint={recordingState === RecorderState.Recording ? _('Finishes recording') : undefined}
		>{startStopButtonLabel}</PrimaryButton>
	</>;

	const renderDuration = () => {
		if (recordingState !== RecorderState.Recording) return null;

		const durationValue = formatMsToDurationCompat(duration);
		return <Text
			accessibilityLabel={_('Duration: %s', durationValue)}
			accessibilityRole='timer'
		>{durationValue}</Text>;
	};

	return <RecordingControls
		recorderState={recordingState}
		heading={recordingState === RecorderState.Recording ? _('Recording...') : _('Voice recorder')}
		content={
			recordingState === RecorderState.Idle
				? _('Click "start" to attach a new voice memo to the note.')
				: error
		}
		preview={renderDuration()}
		actions={actions}
	/>;
};

export default AudioRecordingBanner;
