/// <reference types="react" />
interface Props {
    backButtonTitle?: string;
    hasChanges?: boolean;
    onCancelClick: Function;
    onSaveClick?: Function;
    onApplyClick?: Function;
}
export declare const StyledRoot: any;
export default function ButtonBar(props: Props): JSX.Element;
export {};
