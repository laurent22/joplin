const React = require('react');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const AudioAnalyser = require('./AudioAnalyser.min');

class RecordAudioDialog extends React.Component {
	constructor() {
		super();
		this.state = {
			audio: null,
		};
		this.toggleMicrophone = this.toggleMicrophone.bind(this);
		this.startRecord = this.startRecord.bind(this);
		this.stopRecord = this.stopRecord.bind(this);
		this.closeDialog = this.closeDialog.bind(this);
		this.mediaRecorder = null;
		this.audioFile = null;
		this.recordingExists = false;
	}

	toggleMicrophone() {
		if (this.state.audio) {
			this.stopMicrophone();
		} else {
			this.getMicrophone();
		}
	}

	stopMicrophone() {
		this.state.audio.getTracks().forEach(track => track.stop());
		this.setState({ audio: null });
		this.stopRecord();
	}

	async getMicrophone() {
		this.recordingExists = false;
		const audio = await navigator.mediaDevices.getUserMedia({
			audio: true,
			video: false,
		});

		this.setState({ audio });
		this.startRecord();
	}

	startRecord() {
		this.mediaRecorder = new MediaRecorder(this.state.audio);
		this.mediaRecorder.start();

		let chunks = [];

		this.mediaRecorder.ondataavailable = function(e) {
			chunks.push(e.data);
		};

		this.mediaRecorder.onstop = function() {
			const blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
			this.audioFile = blob;
			chunks = [];
		};
		this.mediaRecorder.onstop = this.mediaRecorder.onstop.bind(this);
	}

	stopRecord() {
		this.mediaRecorder.stop();
		this.recordingExists = true;
	}

	closeDialog() {
		if (!this.state.audio) {
			if (this.props.onSaveClick && this.recordingExists) this.props.onSaveClick(this.audioFile);
			if (this.props.onClose) {
				this.props.onClose();
			}
		}
	}

	render() {
		const theme = themeStyle(this.props.theme);

		return (
			<div style={theme.dialogModalLayer}>
				<div style={theme.dialogBox}>
					<div style={theme.dialogTitle}>{_('Record Audio')}</div>
					<div className="controls">
						<button onClick={this.toggleMicrophone}>
							{this.state.audio ? 'Stop' : 'Record'}
						</button>
						<button onClick={this.closeDialog}>
							{this.recordingExists ? 'Save to Note' : 'Close'}
						</button>
					</div>
					{this.state.audio ? <AudioAnalyser audio={this.state.audio} /> : ''}
					<section className="sound-clips">
					</section>
				</div>
			</div>
		);
	}
}

module.exports = RecordAudioDialog;
