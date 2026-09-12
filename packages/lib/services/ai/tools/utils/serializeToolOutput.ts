import { ToolImageResponse, ToolOutput } from '../types';

const serializeToolOutput = (output: ToolOutput) => {
	if (output instanceof ToolImageResponse) return output;
	return typeof output === 'string' ? output : JSON.stringify(output);
};

export default serializeToolOutput;

