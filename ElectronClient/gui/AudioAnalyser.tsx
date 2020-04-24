import * as React from 'react';
import { useState, useEffect } from 'react';
import * as AudioContext from 'standardized-audio-context';

const AudioVisualiser = require('./AudioVisualiser.js').default;

interface AudioAnalyserProps {
    audio: MediaStream,
}

export default function AudioAnalyser(props:AudioAnalyserProps) {
	let running: boolean = true;

	let audioContext: AudioContext.IAudioContext = null;
	let source: AudioContext.IMediaStreamAudioSourceNode<AudioContext.IAudioContext> = null;
	let analyser: AudioContext.IAnalyserNode<AudioContext.IAudioContext> = null;

	let rafId: number = 0;
	const [audioData, setAudioData] = useState<Uint8Array>();
	useEffect(() => {
		running = true;

		audioContext = new AudioContext.AudioContext();
		source = audioContext.createMediaStreamSource(props.audio);
		analyser = audioContext.createAnalyser();

		source.connect(analyser);
		rafId = requestAnimationFrame(tick);

		return function cleanup() {
			running = false;
			cancelAnimationFrame(rafId);
			analyser.disconnect();
			source.disconnect();
		};
	},[]);

	useEffect(() => {
	},[audioData]);

	const tick = () => {
		if (running) {
			const dataArray = new Uint8Array(analyser.fftSize);
			analyser.getByteTimeDomainData(dataArray);
			setAudioData(dataArray);
			rafId = requestAnimationFrame(tick);
		}
	};

	return <AudioVisualiser audioData={audioData} />;
}
