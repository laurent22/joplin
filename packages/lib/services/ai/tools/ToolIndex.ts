import { _ } from '../../../locale';
import { substrWithEllipsis } from '../../../string-utils';
import { EditorToolContext, ToolDefinition, ToolError } from './types';
import buildTool from './utils/buildTool';
import { toolSettingKey, toolSettingName, toolsSectionName } from './utils/settings';
import globalTools from './global/index';
import buildEditorTools from './buildEditorTools';
import Setting from '../../../models/Setting';

export default class ToolIndex {
	private tools_: ToolDefinition[];

	public constructor(private editorContext_: EditorToolContext|null) {
		this.tools_ = [
			...globalTools,
			...(this.editorContext_ ? buildEditorTools(this.editorContext_) : []),
		];
	}

	private isEnabled_(toolId: string) {
		const tool = this.tools_.find(tool => tool.id === toolId);
		// For tools with no corresponding setting
		if (tool.enabled !== undefined) return tool.enabled;

		const settingName = toolSettingKey(toolId);
		return !!Setting.valueNoThrow(settingName, false);
	}

	public enabledTools() {
		const baseEnabledTools = this.tools_.filter(tool => this.isEnabled_(tool.id));

		if (baseEnabledTools.length < this.tools_.length) {
			// Add an extra virtual tool that describes which tools are disabled
			return [...baseEnabledTools, this.buildDisabledToolIndex_()];
		} else {
			return baseEnabledTools;
		}
	}

	public findTool(id: string) {
		return this.enabledTools().find(tool => tool.id === id);
	}

	private disabledTools_() {
		return this.tools_.filter(tool => !this.isEnabled_(tool.id));
	}

	public describeToolNotFoundFailure(toolId: string) {
		const settingName = toolSettingName(toolId);
		// Return "disabled" vs "unknown" differently so the LLM gets actionable feedback.
		if (!settingName) return `Unknown tool: '${toolId}'`;

		return [
			`# Tool \`${toolId}\` is disabled in Joplin's settings`,
			'',
			'If you need this tool, please ask the user to enable it for you. The user can enable this tool by:',
			'1. opening Joplin\'s settings screen,',
			`2. opening the "${toolsSectionName()}" tab, and`,
			`3. enabling the "${settingName}" setting.`,
			'',
			'You can\'t enable this tool yourself. If you need this tool, you\'ll have to ask the user to enable it for you.',
		].join('\n');
	}

	// A tool that allows the AI to request the user to enable a tool.
	// This tool is always enabled if there are disabled tools.
	private buildDisabledToolIndex_() {
		const tools = this.disabledTools_();
		const disabledToolIds = tools.map(t => t.id);

		return buildTool<{ tool_id: string }>({
			id: 'disabled_tool_info',
			enabled: true,
			description: [
				'**Getting access to more tools:** The following tools/capabilities are currently **disabled** in Joplin\'s settings:',
				'| Tool ID | Setting name | Description |',
				'|---------|--------------|-------------|',
				...tools.map((tool) => `| ${tool.id} | ${toolSettingName(tool.id)} | ${substrWithEllipsis(tool.description, 0, 50)} |`),
				'',
				'Communication is important here! The user may not know that these tools exist or how to enable them:',
				`If you need one or more of these tools, please ask the user to enable them from the **${toolsSectionName()}** tab of Joplin's settings screen.`,
				'',
				'Run this tool for more information about any of the above disabled tools.',
			].join('\n'),
			inputSchema: {
				type: 'object',
				properties: {
					tool_id: {
						type: 'string',
						enum: disabledToolIds,
					},
				},
				required: ['tool_id'],
			},
			userDescription: (_input, output) => {
				return _('Searched for tool: %s', output.tool_id ?? _('(unknown)'));
			},
			handler: async (input) => {
				const toolId = input.tool_id;
				if (typeof toolId !== 'string') throw new ToolError('Missing or invalid tool_id');
				if (!disabledToolIds.includes(toolId)) throw new ToolError(`Invalid tool_id: ${JSON.stringify(toolId)}. Must be one of ${JSON.stringify(disabledToolIds)}`);

				const description = this.disabledTools_().find(tool => tool.id === input.tool_id)?.description;
				return { tool_id: toolId, description, how_to_enable: this.describeToolNotFoundFailure(toolId) };
			},
		});
	};
}

