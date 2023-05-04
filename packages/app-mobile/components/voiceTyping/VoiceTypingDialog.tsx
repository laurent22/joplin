import * as React from 'react';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button, Dialog, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import useAsyncEffect, { AsyncEffectEvent } from '@joplin/lib/hooks/useAsyncEffect';
import Vosk from '@joplin/react-native-vosk';
import { getVosk, Recorder, startRecording } from '../../services/voiceTyping/vosk';
import Logger from '@joplin/lib/Logger';

const logger = Logger.create('VoiceTypingDialog');

interface Props {
	onDismiss: ()=> void;
}

enum RecorderState {
	Loading = 1,
	Recording = 2,
	Closing = 3,
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

	const vosk = useVosk();

	const recorderState: RecorderState = useMemo(() => {
		if (!vosk) return RecorderState.Loading;
		return RecorderState.Recording;
	}, [vosk]);

	useEffect(() => {
		if (recorderState === RecorderState.Recording) {
			setRecorder(startRecording(vosk));
		}
	}, [recorderState, vosk]);

	const onStop = useCallback(async () => {
		const result = await recorder.stop();
		logger.info('GOT RESULT', result);
	}, [recorder]);

	const renderContent = () => {
		if (recorderState === RecorderState.Loading) {
			return <Text variant="bodyMedium">Loading...</Text>;
		}

		if (recorderState === RecorderState.Recording) {
			return <Text variant="bodyMedium">Please record your voice...</Text>;
		}

		return <Text variant="bodyMedium">Converting speech to text...</Text>;
	};

	const renderActions = () => {
		if (recorderState === RecorderState.Loading) {
			return <Dialog.Actions><Button onPress={()=>{}}>Wait</Button></Dialog.Actions>;
		}

		if (recorderState === RecorderState.Recording) {
			return (
				<Dialog.Actions>
					<Button onPress={onStop}>Stop</Button>
				</Dialog.Actions>
			);
		}

		return <Dialog.Actions><Button onPress={()=>{}}>Wait</Button></Dialog.Actions>;
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
