import * as React from 'react';
import Setting from '@joplin/lib/models/Setting';
import { useEffect, useState } from 'react';
import { View, Alert, Button, ViewStyle } from 'react-native';
import { SensorInfo } from './sensorInfo';
import { _ } from '@joplin/lib/locale';
import Logger from '@joplin/utils/Logger';
import biometricAuthenticate from './biometricAuthenticate';
import SafeAreaView from '../SafeAreaView';

const logger = Logger.create('BiometricPopup');

interface Props {
	themeId: number;
	sensorInfo: SensorInfo;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch: Function;
}

export default (props: Props) => {
	// The initial prompt is there so that the user can choose to opt-in to
	// biometrics auth the first time the app is launched. However since it
	// doesn't work properly, we disable it. We only want the user to enable the
	// feature after they've read the description in the config screen.
	const [initialPromptDone, setInitialPromptDone] = useState(true); // useState(Setting.value('security.biometricsInitialPromptDone'));
	const [display, setDisplay] = useState(props.sensorInfo.enabled || !initialPromptDone);
	const [tryBiometricsCheck, setTryBiometricsCheck] = useState(initialPromptDone);

	logger.info('Render start');
	logger.info('initialPromptDone', initialPromptDone);
	logger.info('display', display);
	logger.info('tryBiometricsCheck', tryBiometricsCheck);
	logger.info('props.sensorInfo', props.sensorInfo);

	useEffect(() => {
		if (!display || !tryBiometricsCheck) return;

		const biometricsCheck = async () => {
			logger.info('biometricsCheck: start');

			try {
				await biometricAuthenticate();
				setDisplay(false);
			} catch (error) {
				Alert.alert(error.message);
			}

			setTryBiometricsCheck(false);

			logger.info('biometricsCheck: end');
		};

		void biometricsCheck();
	}, [display, tryBiometricsCheck]);

	useEffect(() => {
		if (initialPromptDone) return;
		if (!display) return;

		const complete = (enableBiometrics: boolean) => {
			logger.info('complete: start');
			logger.info('complete: enableBiometrics:', enableBiometrics);

			setInitialPromptDone(true);
			Setting.setValue('security.biometricsInitialPromptDone', true);
			Setting.setValue('security.biometricsEnabled', enableBiometrics);
			if (!enableBiometrics) {
				setDisplay(false);
				setTryBiometricsCheck(false);
			} else {
				setTryBiometricsCheck(true);
			}

			props.dispatch({
				type: 'BIOMETRICS_DONE_SET',
				value: true,
			});

			logger.info('complete: end');
		};

		Alert.alert(
			_('Enable biometrics authentication?'),
			_('Use your biometrics to secure access to your application. You can always set it up later in Settings.'),
			[
				{
					text: _('Enable'),
					onPress: () => complete(true),
					style: 'default',
				},
				{
					text: _('Not now'),
					onPress: () => complete(false),
					style: 'cancel',
				},
			],
		);
	}, [initialPromptDone, display, props.dispatch]);

	useEffect(() => {
		logger.info('effect 1: start');

		if (!display) {
			logger.info('effect 1: display', display);

			props.dispatch({
				type: 'BIOMETRICS_DONE_SET',
				value: true,
			});
		}

		logger.info('effect 1: end');
	}, [display, props.dispatch]);

	const renderTryAgainButton = () => {
		if (!display || tryBiometricsCheck || !initialPromptDone) return null;
		return <Button title={_('Try again')} onPress={() => setTryBiometricsCheck(true)} />;
	};

	return (
		<View style={[rootStyle, { display: display ? 'flex' : 'none' }]}>
			<SafeAreaView>
				{renderTryAgainButton()}
			</SafeAreaView>
		</View>
	);
};

const rootStyle: ViewStyle = {
	position: 'absolute',
	zIndex: 99999,
	backgroundColor: '#000000',
	top: 0,
	bottom: 0,
	left: 0,
	right: 0,
};
