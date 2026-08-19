// Helper commands added to the CodeMirror instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Receives dynamically-loaded CodeMirror 5 namespace; @types/codemirror's signature is too narrow for defineExtension
export default function useJoplinCommands(CodeMirror: any) {

	CodeMirror.defineExtension('commandExists', (name: string) => {
		return !!CodeMirror.commands[name];
	});
}
