// Helper commands added to the the CodeMirror instance
export default function useJoplinCommands(CodeMirror: any) {

	CodeMirror.defineExtension('commandExists', function(name: string) {
		return !!CodeMirror.commands[name];
	});
}
