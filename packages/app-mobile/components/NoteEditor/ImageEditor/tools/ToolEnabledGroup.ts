import BaseTool from './BaseTool';

// Connects a group of tools -- at most one tool in the group must be enabled.
export default class ToolEnabledGroup {
	private activeTool: BaseTool|null;
	public constructor() { }

	public notifyEnabled(tool: BaseTool) {
		if (tool !== this.activeTool) {
			this.activeTool?.setEnabled(false);
			this.activeTool = tool;
		}
	}
}
