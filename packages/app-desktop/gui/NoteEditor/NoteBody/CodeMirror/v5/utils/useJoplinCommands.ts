// Helper commands added to the CodeMirror instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function useJoplinCommands(CodeMirror: any) {

	CodeMirror.defineExtension('commandExists', (name: string) => {
		return !!CodeMirror.commands[name];
	});
}
