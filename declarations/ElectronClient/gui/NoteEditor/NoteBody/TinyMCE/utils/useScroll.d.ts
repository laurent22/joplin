interface HookDependencies {
    editor: any;
    onScroll: Function;
}
export default function useScroll(dependencies: HookDependencies): {
    scrollToPercent: (percent: number) => void;
};
export {};
