/// <reference types="react" />
export interface Props {
    html: string;
    scripts: string[];
    onMessage: Function;
    pluginId: string;
    viewId: string;
    themeId: string;
    minWidth?: number;
    minHeight?: number;
    fitToContent?: boolean;
    borderBottom?: boolean;
    theme?: any;
}
export default function UserWebview(props: Props): JSX.Element;
