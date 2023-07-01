import styled from 'styled-components';

const DialogModalLayer = styled.div`
	z-index: 9999;
	display: flex;
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0,0,0,0.6);
	align-items: flex-start;
	justify-content: center;
	overflow: hidden;
`;

const DialogRoot = styled.div`
	background-color: ${props => props.theme.backgroundColor};
	padding: 16px;
	box-shadow: 6px 6px 20px rgba(0,0,0,0.5);
	margin: 20px;
	min-height: fit-content;
	display: flex;
	flex-direction: column;
	border-radius: 10px;
`;

interface Props {
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	renderContent: Function;
	className?: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onClose?: Function;
}

export default function Dialog(props: Props) {
	return (
		<DialogModalLayer className={props.className}>
			<DialogRoot>
				{props.renderContent()}
			</DialogRoot>
		</DialogModalLayer>
	);
}
