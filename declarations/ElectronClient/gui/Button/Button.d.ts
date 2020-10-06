/// <reference types="react" />
export declare enum ButtonLevel {
    Primary = "primary",
    Secondary = "secondary",
    Tertiary = "tertiary",
    SideBarSecondary = "sideBarSecondary"
}
interface Props {
    title?: string;
    iconName?: string;
    level?: ButtonLevel;
    className?: string;
    onClick: Function;
    color?: string;
    iconAnimation?: string;
    tooltip?: string;
    disabled?: boolean;
    style?: any;
}
export default function Button(props: Props): JSX.Element;
export {};
