import { ToolDefinition, ToolOutput } from '../types';

const buildTool = <OutputType extends ToolOutput> (spec: ToolDefinition<OutputType>) => {
	return spec as ToolDefinition<unknown>;
};

export default buildTool;
