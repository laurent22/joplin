import * as React from 'react';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Text, Button } from 'react-native-paper';
import { _, languageName } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import VoiceTyping, { OnTextCallback, VoiceTypingSession } from '../../services/voiceTyping/VoiceTyping';
import { RecorderState } from './types';
import RecordingControls from './RecordingControls';
import { PrimaryButton } from '../buttons';
import useQueuedAsyncEffect from '@joplin/lib/hooks/useQueuedAsyncEffect';
import shim from '@joplin/lib/shim';

interface Props {
	locale: string;
	onDismiss: ()=> void;
	onText: (text: string)=> void;
}

interface UseVoiceTypingProps {
	locale: string;
	onSetPreview: OnTextCallback;
	onText: OnTextCallback;
}

const useVoiceTyping = ({ locale, onSetPreview, onText }: UseVoiceTypingProps) => {
	const [voiceTyping, setVoiceTyping] = useState<VoiceTypingSession>(null);
	const [error, setError] = useState<Error|null>(null);
	const [mustDownloadModel, setMustDownloadModel] = useState<boolean | null>(null);
	const [stoppingSession, setIsStoppingSession] = useState(false);

	const onTextRef = useRef(onText);
	onTextRef.current = onText;
	const onSetPreviewRef = useRef(onSetPreview);
	onSetPreviewRef.current = onSetPreview;

	const voiceTypingRef = useRef(voiceTyping);
	voiceTypingRef.current = voiceTyping;

	const builder = useMemo(() => {
		return new VoiceTyping(locale);
	}, [locale]);

	const [redownloadCounter, setRedownloadCounter] = useState(0);

	useQueuedAsyncEffect(async (event) => {
		try {
			// Reset the error: If starting voice typing again resolves the error, the error
			// should be hidden (and voice typing should start).
			setError(null);

			await voiceTypingRef.current?.cancel();
			onSetPreviewRef.current?.('');

			const outdated = await builder.isDownloadedFromOutdatedUrl();
			if (outdated) {
				const allowOutdatedMessage = _('New model available\nA new voice typing model is available. Do you want to download it?');
				const downloadNewModel = await shim.showConfirmationDialog(allowOutdatedMessage);
				if (downloadNewModel) {
					await onRequestRedownload();
					return;
				}
			}

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
		void voiceTypingRef.current?.cancel();
	}, []);

	const onRequestRedownload = useCallback(async () => {
		setIsStoppingSession(true);
		await voiceTypingRef.current?.cancel();
		await builder.clearDownloads();
		setMustDownloadModel(true);
		setIsStoppingSession(false);
		setRedownloadCounter(value => value + 1);
	}, [builder]);

	return {
		error, mustDownloadModel, stoppingSession, voiceTyping, onRequestRedownload,
	};
};

const SpeechToTextComponent: React.FC<Props> = props => {
	const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.Loading);
	const [preview, setPreview] = useState<string>('');
	const {
		error: modelError,
		mustDownloadModel,
		voiceTyping,
		stoppingSession,
		onRequestRedownload,
	} = useVoiceTyping({
		locale: props.locale,
		onSetPreview: setPreview,
		onText: props.onText,
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
		if (stoppingSession) {
			setRecorderState(RecorderState.Processing);
		}
	}, [stoppingSession]);

	useEffect(() => {
		if (recorderState === RecorderState.Recording) {
			void voiceTyping.start();
		}
	}, [recorderState, voiceTyping, props.onText]);

	const onDismiss = useCallback(async () => {
		if (voiceTyping) {
			setRecorderState(RecorderState.Processing);
			await voiceTyping.stop();
			setRecorderState(RecorderState.Idle);
		}
		props.onDismiss();
	}, [voiceTyping, props.onDismiss]);

	const renderContent = () => {
		const components: Record<RecorderState, ()=> string> = {
			[RecorderState.Loading]: () => _('Loading...'),
			[RecorderState.Idle]: () => 'Waiting...', // Not used for now
			[RecorderState.Recording]: () => _('Please record your voice...'),
			[RecorderState.Processing]: () => (
				stoppingSession ? _('Closing session...') : _('Converting speech to text...')
			),
			[RecorderState.Downloading]: () => _('Downloading %s language files...', languageName(props.locale)),
			[RecorderState.Error]: () => _('Error: %s', modelError?.message),
		};

		return components[recorderState]();
	};

	const renderPreview = () => {
		if (recorderState !== RecorderState.Recording) {
			return null;
		}
		return <Text variant='labelSmall'>{preview}</Text>;
	};

	const reDownloadButton = <Button
		// Usually, stoppingSession is true because the re-download button has
		// just been pressed.
		disabled={stoppingSession || recorderState === RecorderState.Downloading}
		onPress={onRequestRedownload}
	>
		{_('Re-download model')}
	</Button>;
	const allowReDownload = recorderState === RecorderState.Error;

	const actions = <>
		{allowReDownload ? reDownloadButton : null}
		<PrimaryButton
			onPress={onDismiss}
			disabled={recorderState === RecorderState.Processing}
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

export default SpeechToTextComponent;
