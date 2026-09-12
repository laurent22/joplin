import Setting from '../../../../models/Setting';
import { ToolDefinition } from '../types';
import { isEditorToolCall } from '../buildEditorTools';

export const toolSettingKey = (toolId: string) => (
	isEditorToolCall(toolId) ? 'ai.tool.edit_current.enabled' : `ai.tool.${toolId}.enabled`
);

export const isToolEnabled = (tool: ToolDefinition) => !!Setting.value(toolSettingKey(tool.id));

export const toolSettingName = (toolId: string) => {
	const key = toolSettingKey(toolId);
	return Setting.keyExists(key) ? Setting.settingMetadata(key).label?.() : null;
};

export const toolsSectionName = () => Setting.sectionNameToLabel('ai.tools');

