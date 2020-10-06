/// <reference types="react" />
import { ToolbarButtonInfo } from 'lib/services/commands/ToolbarButtonUtils';
interface ToolbarProps {
    themeId: number;
    toolbarButtonInfos: ToolbarButtonInfo[];
}
declare function Toolbar(props: ToolbarProps): JSX.Element;
declare const _default: import("react-redux").ConnectedComponent<typeof Toolbar, Pick<ToolbarProps, "themeId">>;
export default _default;
