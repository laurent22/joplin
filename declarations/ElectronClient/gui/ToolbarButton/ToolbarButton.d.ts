/// <reference types="react" />
import { ToolbarButtonInfo } from 'lib/services/commands/ToolbarButtonUtils';
interface Props {
    readonly themeId: number;
    readonly toolbarButtonInfo?: ToolbarButtonInfo;
    readonly title?: string;
    readonly tooltip?: string;
    readonly iconName?: string;
    readonly disabled?: boolean;
    readonly backgroundHover?: boolean;
}
export default function ToolbarButton(props: Props): JSX.Element;
export {};
