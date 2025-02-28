import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Text, Button } from 'react-native-paper';
import { _, languageName } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import VoiceTyping, { OnTextCallback, VoiceTypingSession } from '../../services/voiceTyping/VoiceTyping';
import whisper from '../../services/voiceTyping/whisper';
import vosk from '../../services/voiceTyping/vosk';
import { AppState } from '../../utils/types';
import { connect } from 'react-redux';
import Logger from '@joplin/utils/Logger';
import { RecorderState } from './types';
import RecordingControls from './RecordingControls';
import { PrimaryButton } from '../buttons';
import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';

const logger = Logger.create('VoiceTypingDialog');

interface Props {
	locale: string;
	provider: string;
	onDismiss: ()=> void;
	onText: (text: string)=> void;
}

interface UseVoiceTypingProps {
	locale: string;
	provider: string;
	onSetPreview: OnTextCallback;
	onText: OnTextCallback;
}

const useVoiceTyping = ({ locale, provider, onSetPreview, onText }: UseVoiceTypingProps) => {
	const [voiceTyping, setVoiceTyping] = useState<VoiceTypingSession>(null);
	const [error, setError] = useState<Error|null>(null);
	const [mustDownloadModel, setMustDownloadModel] = useState<boolean | null>(null);
	const [modelIsOutdated, setModelIsOutdated] = useState(false);

	const onTextRef = useRef(onText);
	onTextRef.current = onText;
	const onSetPreviewRef = useRef(onSetPreview);
	onSetPreviewRef.current = onSetPreview;

	const voiceTypingRef = useRef(voiceTyping);
	voiceTypingRef.current = voiceTyping;

	const builder = useMemo(() => {
		return new VoiceTyping(locale, provider?.startsWith('whisper') ? [whisper] : [vosk]);
	}, [locale, provider]);

	const [redownloadCounter, setRedownloadCounter] = useState(0);

	useEffect(() => {
		if (modelIsOutdated) {
			logger.info('The downloaded version of the model is from an outdated URL.');
		}
	}, [modelIsOutdated]);

	useQueuedAsyncEffect(async (event: AsyncEffectEvent) => {
		try {
			// Reset the error: If starting voice typing again resolves the error, the error
			// should be hidden (and voice typing should start).
			setError(null);

			await voiceTypingRef.current?.stop();
			onSetPreviewRef.current?.('');

			setModelIsOutdated(await builder.isDownloadedFromOutdatedUrl());

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
	}, [builder, redownloadCounter]);

	useAsyncEffect(async (_event: AsyncEffectEvent) => {
		setMustDownloadModel(!(await builder.isDownloaded()));
	}, [builder]);

	useEffect(() => () => {
		void voiceTypingRef.current?.stop();
	}, []);

	const onRequestRedownload = useCallback(async () => {
		await voiceTypingRef.current?.stop();
		await builder.clearDownloads();
		setMustDownloadModel(true);
		setRedownloadCounter(value => value + 1);
	}, [builder]);

	return {
		error, mustDownloadModel, voiceTyping, onRequestRedownload, modelIsOutdated,
	};
};

const SpeechToTextComponent: React.FC<Props> = props => {
	const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.Loading);
	const [preview, setPreview] = useState<string>('');
	const {
		error: modelError,
		mustDownloadModel,
		voiceTyping,
		onRequestRedownload,
		modelIsOutdated,
	} = useVoiceTyping({
		locale: props.locale,
		onSetPreview: setPreview,
		onText: props.onText,
		provider: props.provider,
	});

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
			[RecorderState.Idle]: () => 'Waiting...', // Not used for now
			[RecorderState.Recording]: () => _('Please record your voice...'),
			[RecorderState.Processing]: () => _('Converting speech to text...'),
			[RecorderState.Downloading]: () => _('Downloading %s language files...', languageName(props.locale)),
			[RecorderState.Error]: () => _('Error: %s', modelError?.message),
		};

		return components[recorderState]();
	};

	const renderPreview = () => {
		return <Text variant='labelSmall'>{preview}</Text>;
	};

	const reDownloadButton = <Button onPress={onRequestRedownload}>
		{modelIsOutdated ? _('Download updated model') : _('Re-download model')}
	</Button>;
	const allowReDownload = recorderState === RecorderState.Error || modelIsOutdated;

	const actions = <>
		{allowReDownload ? reDownloadButton : null}
		<PrimaryButton
			onPress={onDismiss}
			accessibilityHint={_('Ends voice typing')}
		>{_('Done')}</PrimaryButton>
	</>;

	return <RecordingControls
		recorderState={recorderState}
		heading={_('Voice typing...')}
		content={renderContent()}
		preview={renderPreview()}
		actions={actions}
	/>;
};

export default connect((state: AppState) => ({
	provider: state.settings['voiceTyping.preferredProvider'],
}))(SpeechToTextComponent);
