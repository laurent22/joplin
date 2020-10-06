interface HookDependencies {
    pluginId: string;
    themeId: string;
}
export default function useThemeCss(dep: HookDependencies): string;
export {};
