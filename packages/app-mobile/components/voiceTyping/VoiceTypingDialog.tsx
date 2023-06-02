import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Banner, ActivityIndicator } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import { getVosk, Recorder, startRecording, Vosk } from '../../services/voiceTyping/vosk';
import { IconSource } from 'react-native-paper/lib/typescript/src/components/Icon';

interface Props {
	onDismiss: ()=> void;
	onText: (text: string)=> void;
}

enum RecorderState {
	Loading = 1,
	Recording = 2,
	Processing = 3,
}

const useVosk = (): Vosk|null => {
	const [vosk, setVosk] = useState<Vosk>(null);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const v = await getVosk();
		if (event.cancelled) return;
		setVosk(v);
	}, []);

	return vosk;
};

export default (props: Props) => {
	const [recorder, setRecorder] = useState<Recorder>(null);
	const [recorderState, setRecorderState] = useState<RecorderState>(RecorderState.Loading);

	const vosk = useVosk();

	useEffect(() => {
		if (!vosk) return;
		setRecorderState(RecorderState.Recording);
	}, [vosk]);

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
		recorder.cleanup();
		props.onDismiss();
	}, [recorder, props.onDismiss]);

	const renderContent = () => {
		const components: Record<RecorderState, string> = {
			[RecorderState.Loading]: _('Loading...'),
			[RecorderState.Recording]: _('Please record your voice...'),
			[RecorderState.Processing]: _('Converting speech to text...'),
		};

		return components[recorderState];
	};

	const renderIcon = () => {
		const components: Record<RecorderState, IconSource> = {
			[RecorderState.Loading]: ({ size }: { size: number }) => <ActivityIndicator animating={true} style={{ width: size, height: size }} />,
			[RecorderState.Recording]: 'microphone',
			[RecorderState.Processing]: 'microphone',
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
