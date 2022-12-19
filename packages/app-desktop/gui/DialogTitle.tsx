import styled from 'styled-components';

const Root = styled.div<any>`
	display: flex;
	justify-content: ${props => props.justifyContent ? props.justifyContent : 'center'};
	font-family: ${props => props.theme.fontFamily};
	font-size: ${props => props.theme.fontSize * 1.5}px;
	line-height: 1.6em;
	color: ${props => props.theme.color};
	font-weight: bold;
	margin-bottom: 1em;
`;


interface Props {
	title: string;
	justifyContent?: string;
}

export default function DialogTitle(props: Props) {
	return (
		<Root justifyContent={props.justifyContent}>{props.title}</Root>
	);
}
