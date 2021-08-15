import styled from 'styled-components';

const Root = styled.div`
	font-family: ${props => props.theme.fontFamily};
	font-size: ${props => props.theme.fontSize * 1.5}px;
	line-height: 1.6em;
	color: ${props => props.theme.color};
	font-weight: bold;
	margin-bottom: 1.2em;
`;


interface Props {
	title: string;
}

export default function DialogTitle(props: Props) {
	return (
		<Root>{props.title}</Root>
	);
}
