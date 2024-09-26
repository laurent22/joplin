import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Banner, ActivityIndicator } from 'react-native-paper';
import { _, languageName } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import Whisper, { OnTextCallback } from '../../services/voiceTyping/Whisper';

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

const useWhisper = (locale: string, onText: OnTextCallback): [Error | null, boolean, Whisper|null] => {
	const [whisper, setWhisper] = useState<Whisper>(null);
	const [error, setError] = useState<Error>(null);
	const [mustDownloadModel, setMustDownloadModel] = useState<boolean | null>(null);

	const onTextRef = useRef(onText);
	onTextRef.current = onText;

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		if (mustDownloadModel === null) return;

		try {
			const v = await Whisper.fetched(locale, (text) => onTextRef.current(text));
			if (event.cancelled) return;
			setWhisper(v);
		} catch (error) {
			setError(error);
		} finally {
			setMustDownloadModel(false);
		}
	}, [locale, mustDownloadModel]);

	useAsyncEffect(async (_event: AsyncEffectEvent) => {
		setMustDownloadModel(await Whisper.mustDownload());
	}, []);

	return [error, mustDownloadModel, whisper];
};

export default (props: Props) => {
	const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.Loading);
	const [whisperError, mustDownloadModel, whisper] = useWhisper(props.locale, props.onText);

	useEffect(() => {
		if (whisperError) {
			setRecorderState(RecorderState.Error);
		} else if (whisper) {
			setRecorderState(RecorderState.Recording);
		}
	}, [whisper, whisperError]);

	useEffect(() => {
		if (mustDownloadModel) {
			setRecorderState(RecorderState.Downloading);
		}
	}, [mustDownloadModel]);

	useEffect(() => {
		if (recorderState === RecorderState.Recording) {
			void whisper.start();
		}
	}, [recorderState, whisper, props.onText]);

	const onDismiss = useCallback(() => {
		void whisper.stop();
		props.onDismiss();
	}, [whisper, props.onDismiss]);

	const renderContent = () => {
		const components: Record<RecorderState, ()=> string> = {
			[RecorderState.Loading]: () => _('Loading...'),
			[RecorderState.Recording]: () => _('Please record your voice...'),
			[RecorderState.Processing]: () => _('Converting speech to text...'),
			[RecorderState.Downloading]: () => _('Downloading %s language files...', languageName(props.locale)),
			[RecorderState.Error]: () => _('Error: %s', whisperError.message),
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
	);
};
