const { Component } = require('react');
const React = require('react');

const AudioVisualiser = require('./AudioVisualiser.min');

class AudioAnalyser extends Component {
	constructor(props) {
		super(props);
		this.state = { audioData: new Uint8Array(0) };
		this.tick = this.tick.bind(this);
		this.mediaRecorder = null;
	}

	componentDidMount() {
		this.audioContext = new (window.AudioContext ||
			window.webkitAudioContext)();
		this.analyser = this.audioContext.createAnalyser();
		this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
		this.source = this.audioContext.createMediaStreamSource(this.props.audio);
		this.source.connect(this.analyser);
		this.rafId = requestAnimationFrame(this.tick);
	}

	tick() {
		this.analyser.getByteTimeDomainData(this.dataArray);
		this.setState({ audioData: this.dataArray });
		this.rafId = requestAnimationFrame(this.tick);
	}

	componentWillUnmount() {
		cancelAnimationFrame(this.rafId);
		this.analyser.disconnect();
		this.source.disconnect();
	}

	render() {
		return <AudioVisualiser audioData={this.state.audioData} />;
	}
}

module.exports = AudioAnalyser;
