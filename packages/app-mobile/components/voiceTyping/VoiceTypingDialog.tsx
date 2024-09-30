import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Banner, ActivityIndicator } from 'react-native-paper';
import { _, languageName } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import { IconSource } from 'react-native-paper/lib/typescript/components/Icon';
import VoiceTyping, { OnTextCallback, VoiceTypingSession } from '../../services/voiceTyping/VoiceTyping';
import whisper from '../../services/voiceTyping/whisper';

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

const useWhisper = (locale: string, onSetPreview: OnTextCallback, onText: OnTextCallback): [Error | null, boolean, VoiceTypingSession|null] => {
	const [voiceTyping, setVoiceTyping] = useState<VoiceTypingSession>(null);
	const [error, setError] = useState<Error>(null);
	const [mustDownloadModel, setMustDownloadModel] = useState<boolean | null>(null);

	const onTextRef = useRef(onText);
	onTextRef.current = onText;
	const onSetPreviewRef = useRef(onSetPreview);
	onSetPreviewRef.current = onSetPreview;

	const voiceTypingRef = useRef(voiceTyping);
	voiceTypingRef.current = voiceTyping;

	const builder = useMemo(() => {
		return new VoiceTyping(locale, [whisper]);
	}, [locale]);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		try {
			await voiceTypingRef.current?.stop();

			if (!await builder.isDownloaded()) {
				if (event.cancelled) return;
				await builder.download();
			}
			if (event.cancelled) return;

			const voiceTyping = await builder.build({
				onPreview: (text) => onSetPreviewRef.current(text),
				onFinalize: (text) => onTextRef.current(text),
			});
			if (event.cancelled) return;
			setVoiceTyping(voiceTyping);
		} catch (error) {
			setError(error);
		} finally {
			setMustDownloadModel(false);
		}
	}, [builder]);

	useAsyncEffect(async (_event: AsyncEffectEvent) => {
		setMustDownloadModel(!(await builder.isDownloaded()));
	}, [builder]);

	return [error, mustDownloadModel, voiceTyping];
};

export default (props: Props) => {
	const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.Loading);
	const [preview, setPreview] = useState<string>('');
	const [modelError, mustDownloadModel, voiceTyping] = useWhisper(props.locale, setPreview, props.onText);

	useEffect(() => {
		if (modelError) {
			setRecorderState(RecorderState.Error);
		} else if (voiceTyping) {
			setRecorderState(RecorderState.Recording);
		}
	}, [voiceTyping, modelError]);

	useEffect(() => {
		if (mustDownloadModel) {
			setRecorderState(RecorderState.Downloading);
		}
	}, [mustDownloadModel]);

	useEffect(() => {
		if (recorderState === RecorderState.Recording) {
			void voiceTyping.start();
		}
	}, [recorderState, voiceTyping, props.onText]);

	const onDismiss = useCallback(() => {
		void voiceTyping?.stop();
		props.onDismiss();
	}, [voiceTyping, props.onDismiss]);

	const renderContent = () => {
		const components: Record<RecorderState, ()=> string> = {
			[RecorderState.Loading]: () => _('Loading...'),
			[RecorderState.Recording]: () => _('Please record your voice...'),
			[RecorderState.Processing]: () => _('Converting speech to text...'),
			[RecorderState.Downloading]: () => _('Downloading %s language files...', languageName(props.locale)),
			[RecorderState.Error]: () => _('Error: %s', modelError.message),
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
			{`${_('Voice typing...')}\n${renderContent()}\n${preview}`}
		</Banner>
	);
};
