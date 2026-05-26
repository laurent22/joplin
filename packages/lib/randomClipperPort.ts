type Env = 'dev' | 'prod';

interface ClipperPortState {
	offset: number;
	port?: number;
}

const startPort = (env: Env): number => {
	const startPorts = {
		prod: 41184,
		dev: 27583,
	};

	return env === 'prod' ? startPorts.prod : startPorts.dev;
};

const randomClipperPort = (state: ClipperPortState | null, env: Env): ClipperPortState => {
	if (!state) {
		state = { offset: 0 };
	} else {
		state.offset++;
	}

	state.port = startPort(env) + state.offset;

	return state;
};

export { randomClipperPort, startPort };
