/* eslint-disable */
const React = require('react')
import { useState, useEffect, useRef, useCallback } from 'react';

import { StyleSheet, View, Text, Button } from 'react-native';
import Vosk from 'react-native-vosk';
const { ScreenHeader } = require('../ScreenHeader');


function VoskScreen() {
	const [ready, setReady] = useState<Boolean>(false);
	const [recognizing, setRecognizing] = useState<Boolean>(false);
	const [result, setResult] = useState<String | undefined>();

	const vosk = useRef(new Vosk()).current;

	const load = useCallback(() => {
		vosk
			.loadModel('vosk-model-small-fr-0.22')
		// .loadModel('model-en-us')
			.then(() => setReady(true))
			.catch((e: any) => console.log(e));
	}, [vosk]);

	const unload = useCallback(() => {
		vosk.unload();
		setReady(false);
	}, [vosk]);

	useEffect(() => {
		const resultEvent = vosk.onResult((res: { data: String }) => {
			console.log(res);

			console.log(`A onResult event has been caught: ${res.data}`);
		});

		return () => {
			resultEvent.remove();
		};
	}, [vosk]);

	const grammar = ['gauche', 'droite', '[unk]'];
	// const grammar = ['left', 'right', '[unk]'];

	const record = () => {
		if (!ready) return;
		console.log('Starting recognition ...');

		setRecognizing(true);

		vosk
			.start(grammar)
			.then((res: String) => {
				console.log(`Result is: ${res}`);
				setResult(res);
			})
			.catch((e: any) => {
				console.log(`Error: ${e}`);
			})
			.finally(() => {
				setRecognizing(false);
			});
	};

	return (
		<View style={styles.container}>
			<ScreenHeader title={"Vosk Test"} parentComponent={null} showSearchButton={false} />
			<View style={{
				display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginVertical: 34
			}}>
				<Button
					onPress={ready ? unload : load}
					title={ready ? 'Unload model' : 'Load model'}
					color="blue"
				/>
				<Button
					onPress={record}
					title="Record"
					disabled={ready === false || recognizing === true}
					color="#841584"
				/>
				<Text>Recognized word:</Text>
				<Text>{result}</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		// justifyContent: 'center',
	},
	// box: {
	// 	width: "100%",
	// 	height: "100%",
	// },
});

// export default VoskScreenWrapper
export default VoskScreen