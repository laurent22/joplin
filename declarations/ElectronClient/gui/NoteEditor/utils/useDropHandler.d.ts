interface HookDependencies {
    editorRef: any;
}
export default function useDropHandler(dependencies: HookDependencies): (event: any) => Promise<void>;
export {};
