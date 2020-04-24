const React = require('react');
import {useState, useEffect} from 'react';
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const AudioAnalyser = require('./AudioAnalyser.js').default;

interface RecordAudioDialogProps {
    onSaveClick: any,
    onClose: any,
    theme: any,
}

export default function RecordAudioDialog(props: RecordAudioDialogProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingExists, setRecordingExists] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder>();
    const [audio, setAudio] = useState<MediaStream>();
    const [audioFile, setAudioFile] = useState<Blob>();

    useEffect(() => {
        if(audio) {
            startRecord();
        }
    },[audio]);

    useEffect(() => {
        if(mediaRecorder && !isRecording) {
            mediaRecorder.stop()
        }
    },[isRecording]);

    useEffect(() => {
    },[recordingExists]);

    useEffect(() => {
        if(mediaRecorder) {
            mediaRecorder.start();

            let chunks: any[] = [];

            mediaRecorder.ondataavailable = function(e: { data: any; }) {
                chunks.push(e.data);
            };

            mediaRecorder.onstop = function() {
                const blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
                setAudioFile(blob);
                chunks = [];
            };
        }
    },[mediaRecorder]);

	const toggleMicrophone = () => {
		if (audio) {
			stopMicrophone();
		} else {
			getMicrophone();
		}
	};

	const stopMicrophone = () =>  {
		audio.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        setAudio(null);
		stopRecord();
	};

	const getMicrophone = async () => {
		setRecordingExists(false);
		const audioTemp: MediaStream = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: false,
		});

        setAudio(audioTemp);
	};

	const startRecord = () => {
        setIsRecording(true);
        setMediaRecorder(new MediaRecorder(audio));
        
	};

	const stopRecord = () =>  {
		setIsRecording(false);
        setRecordingExists(true);
	};

	const saveDialog = () =>  {
		if (audioFile) {
			if (props.onSaveClick && recordingExists) props.onSaveClick(audioFile);
			if (props.onClose) {
				props.onClose();
			}
		}
	};

	const closeDialog = () =>  {
		if (!audio) {
			if (props.onClose) {
				props.onClose();
			}
		}
	};
    const theme = themeStyle(props.theme);

    return ( 
        <div style={theme.dialogModalLayer}>
            <div style={theme.dialogBox}>
                <div style={theme.dialogTitle}>{_('Record Audio')}</div>
                <div className="controls">
                    <button onClick={toggleMicrophone}>
                        {audio ? 'Stop' : 'Record'}
                    </button>
                    {recordingExists ? <button onClick={saveDialog}>{'Save to Note'}</button> : ''}
                    {isRecording ? ' ' : <button onClick={closeDialog}>{'Close'}</button>}
                </div>
                {audio ? <AudioAnalyser audio={audio} /> : ''}
                <section className="sound-clips">
                </section>
            </div>
        </div>
    );
}
