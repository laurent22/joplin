import { ToolDefinition, ToolOutput } from '../types';

const buildTool = <OutputType extends ToolOutput> (spec: ToolDefinition<OutputType>) => {
	return {
		...spec,
		inputSchema: {
			// Some providers (e.g. OpenAI) fail if additionalProperties is not false:
			additionalProperties: false,
			...spec.inputSchema,
		},
	} as ToolDefinition<unknown>;
};

export default buildTool;
