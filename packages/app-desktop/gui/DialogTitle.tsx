import styled from 'styled-components';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const Root = styled.h1<any>`
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
