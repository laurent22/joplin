import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { Button, Dialog, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import Vosk from '@joplin/react-native-vosk';
import { getVosk, Recorder, startRecording } from '../../services/voiceTyping/vosk';
import { Alert } from 'react-native';

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
			setRecorder(startRecording(vosk));
		}
	}, [recorderState, vosk]);

	const onDismiss = useCallback(() => {
		recorder.cleanup();
		props.onDismiss();
	}, [recorder, props.onDismiss]);

	const onStop = useCallback(async () => {
		try {
			setRecorderState(RecorderState.Processing);
			const result = await recorder.stop();
			props.onText(result);
		} catch (error) {
			Alert.alert(error.message);
		}
		onDismiss();
	}, [recorder, onDismiss, props.onText]);

	const renderContent = () => {
		const components: Record<RecorderState, any> = {
			[RecorderState.Loading]: <Text variant="bodyMedium">Loading...</Text>,
			[RecorderState.Recording]: <Text variant="bodyMedium">Please record your voice...</Text>,
			[RecorderState.Processing]: <Text variant="bodyMedium">Converting speech to text...</Text>,
		};

		return components[recorderState];
	};

	const renderActions = () => {
		const components: Record<RecorderState, any> = {
			[RecorderState.Loading]: null,
			[RecorderState.Recording]: (
				<Dialog.Actions>
					<Button onPress={onDismiss}>Cancel</Button>
					<Button onPress={onStop}>Done</Button>
				</Dialog.Actions>
			),
			[RecorderState.Processing]: null,
		};

		return components[recorderState];
	};

	return (
		<Dialog visible={true} onDismiss={props.onDismiss}>
			<Dialog.Title>{_('Voice typing')}</Dialog.Title>
			<Dialog.Content>
				{renderContent()}
			</Dialog.Content>
			{renderActions()}
		</Dialog>
	);
};
