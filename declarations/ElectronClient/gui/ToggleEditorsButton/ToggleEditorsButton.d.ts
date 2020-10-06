/// <reference types="react" />
import { ToolbarButtonInfo } from 'lib/services/commands/ToolbarButtonUtils';
export declare enum Value {
    Markdown = "markdown",
    RichText = "richText"
}
export interface Props {
    themeId: number;
    value: Value;
    toolbarButtonInfo: ToolbarButtonInfo;
}
export default function ToggleEditorsButton(props: Props): JSX.Element;
