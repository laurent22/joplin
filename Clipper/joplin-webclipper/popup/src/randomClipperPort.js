function randomClipperPort(state, env) {
	const startPorts = {
		prod: 41184,
		dev: 27583,
	};

	const startPort = env === 'prod' ? startPorts.prod : startPorts.dev;

	if (!state) {
		state = { offset: 0 };
	} else {
		state.offset++;
	}

	state.port = startPort + state.offset;

	return state;
}

module.exports = randomClipperPort;
