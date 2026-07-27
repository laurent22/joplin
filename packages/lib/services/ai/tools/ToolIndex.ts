import { substrWithEllipsis } from '../../../string-utils';
import { EditorToolContext, ToolDefinition } from './types';
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

	private isEnabled(toolId: string) {
		const tool = this.tools_.find(tool => tool.id === toolId);
		// For tools with no corresponding setting
		if (tool.enabled !== undefined) return tool.enabled;

		const settingName = toolSettingKey(toolId);
		return !!Setting.valueNoThrow(settingName, false);
	}

	public getTools() {
		return this.tools_.map(tool => {
			const enabled = this.isEnabled(tool.id);
			return {
				...tool,
				description: enabled ? tool.description : [
					substrWithEllipsis(tool.description, 0, 64),
					`**Disabled**: The setting "${toolSettingName(tool.id)}" must be enabled to use this tool.`,
				].join('\n'),
			};
		});
	}

	public findTool(id: string) {
		if (!this.isEnabled(id)) return null;
		return this.getTools().find(tool => tool.id === id);
	}

	public describeToolNotFoundFailure(toolId: string) {
		const settingName = toolSettingName(toolId);
		// Return "disabled" vs "unknown" differently so the LLM gets actionable feedback.
		if (!settingName) return `Unknown tool: '${toolId}'`;

		return [
			`# Tool \`${toolId}\` is disabled in Joplin's settings`,
			'',
			'If you need this tool, ask the user to enable it for you. The user can enable this tool by:',
			'1. opening Joplin\'s settings screen,',
			`2. opening the "${toolsSectionName()}" tab, and`,
			`3. enabling the "${settingName}" setting.`,
		].join('\n');
	}
}

