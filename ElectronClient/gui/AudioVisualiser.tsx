import * as React from 'react';
import { useState, useEffect } from 'react';

interface AudioVisualiserProps {
    audioData: Uint8Array,
}

export default function AudioVisualiser(props:AudioVisualiserProps) {
	const canvasRef = React.useRef(null);
	const [audioData, setAudioData] = useState<Uint8Array>();
	useEffect(() => {
		setAudioData(props.audioData);
	});

	useEffect(() => {
		if(audioData) {
			draw();
		}
	},[audioData]);

	const draw = () => {
		const canvas = canvasRef.current;
		const height = canvas.height;
		const width = canvas.width;
		const context = canvas.getContext('2d');
		let x = 0;
		const sliceWidth = (width * 1.0) / audioData.length;
		context.lineWidth = 2;
		context.strokeStyle = '#000000';
		context.clearRect(0, 0, width, height);

		context.beginPath();
		context.moveTo(0, height / 2);
		for (const item of audioData) {
			const y = (item / 255.0) * height;
			context.lineTo(x, y);
			x += sliceWidth;
		}
		context.lineTo(x, height / 2);
        context.stroke();
	}

	return <canvas width="300" height="300" ref={canvasRef} />;
}
