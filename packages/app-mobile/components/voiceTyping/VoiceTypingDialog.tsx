import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Banner, ActivityIndicator, Modal } from 'react-native-paper';
import { _, languageName } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import { getVosk, Recorder, startRecording, Vosk } from '../../services/voiceTyping/vosk';
import { IconSource } from 'react-native-paper/lib/typescript/src/components/Icon';
import { modelIsDownloaded } from '../../services/voiceTyping/vosk.android';

interface Props {
	locale: string;
	onDismiss: ()=> void;
	onText: (text: string)=> void;
}

enum RecorderState {
	Loading = 1,
	Recording = 2,
	Processing = 3,
	Error = 4,
	Downloading = 5,
}

const useVosk = (locale: string): [Error | null, boolean, Vosk|null] => {
	const [vosk, setVosk] = useState<Vosk>(null);
	const [error, setError] = useState<Error>(null);
	const [mustDownloadModel, setMustDownloadModel] = useState<boolean | null>(null);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		if (mustDownloadModel === null) return;

		try {
			const v = await getVosk(locale);
			if (event.cancelled) return;
			setVosk(v);
		} catch (error) {
			setError(error);
		} finally {
			setMustDownloadModel(false);
		}
	}, [locale, mustDownloadModel]);

	useAsyncEffect(async (_event: AsyncEffectEvent) => {
		setMustDownloadModel(!(await modelIsDownloaded(locale)));
	}, [locale]);

	return [error, mustDownloadModel, vosk];
};

export default (props: Props) => {
	const [recorder, setRecorder] = useState<Recorder>(null);
	const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.Loading);
	const [voskError, mustDownloadModel, vosk] = useVosk(props.locale);

	useEffect(() => {
		if (voskError) {
			setRecorderState(RecorderState.Error);
		} else if (vosk) {
			setRecorderState(RecorderState.Recording);
		}
	}, [vosk, voskError]);

	useEffect(() => {
		if (mustDownloadModel) {
			setRecorderState(RecorderState.Downloading);
		}
	}, [mustDownloadModel]);

	useEffect(() => {
		if (recorderState === RecorderState.Recording) {
			setRecorder(startRecording(vosk, {
				onResult: (text: string) => {
					props.onText(text);
				},
			}));
		}
	}, [recorderState, vosk, props.onText]);

	const onDismiss = useCallback(() => {
		if (recorder) recorder.cleanup();
		props.onDismiss();
	}, [recorder, props.onDismiss]);

	const renderContent = () => {
		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		const components: Record<RecorderState, Function> = {
			[RecorderState.Loading]: () => _('Loading...'),
			[RecorderState.Recording]: () => _('Please record your voice...'),
			[RecorderState.Processing]: () => _('Converting speech to text...'),
			[RecorderState.Downloading]: () => _('Downloading %s language files...', languageName(props.locale)),
			[RecorderState.Error]: () => _('Error: %s', voskError.message),
		};

		return components[recorderState]();
	};

	const renderIcon = () => {
		const components: Record<RecorderState, IconSource> = {
			[RecorderState.Loading]: ({ size }: { size: number }) => <ActivityIndicator animating={true} style={{ width: size, height: size }} />,
			[RecorderState.Recording]: 'microphone',
			[RecorderState.Processing]: 'microphone',
			[RecorderState.Downloading]: ({ size }: { size: number }) => <ActivityIndicator animating={true} style={{ width: size, height: size }} />,
			[RecorderState.Error]: 'alert-circle-outline',
		};

		return components[recorderState];
	};

	return (
		<Modal visible={true} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
			<Banner
				visible={true}
				icon={renderIcon()}
				actions={[
					{
						label: _('Done'),
						onPress: onDismiss,
					},
				]}>
				{`${_('Voice typing...')}\n${renderContent()}`}
			</Banner>
		</Modal>
	);
};
