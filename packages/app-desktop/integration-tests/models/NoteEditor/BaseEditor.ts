interface BaseEditor {
	typeText(text: string): Promise<void>;
	waitFor(): Promise<void>;
}
export default BaseEditor;
