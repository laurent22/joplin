export interface ClipperState {
	offset: number;
	port?: number;
}

export function startPort(env: string): number {
	const startPorts: Record<string, number> = {
		prod: 41184,
		dev: 27583,
	};

	return env === 'prod' ? startPorts.prod : startPorts.dev;
}

export function randomClipperPort(state: ClipperState | null, env: string): ClipperState {
	if (!state) {
		state = { offset: 0 };
	} else {
		state.offset++;
	}

	state.port = startPort(env) + state.offset;

	return state;
}

const randomClipperPort_ = {
	randomClipperPort,
	startPort,
};

export default randomClipperPort_;
