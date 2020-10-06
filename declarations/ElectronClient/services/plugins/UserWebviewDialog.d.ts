/// <reference types="react" />
import { ButtonSpec } from 'lib/services/plugins/WebviewController';
import { Props as UserWebviewProps } from './UserWebview';
interface Props extends UserWebviewProps {
    buttons: ButtonSpec[];
}
export default function UserWebviewDialog(props: Props): JSX.Element;
export {};
