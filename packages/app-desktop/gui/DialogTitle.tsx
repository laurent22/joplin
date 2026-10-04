import styled from 'styled-components';

const Root = styled.h1<{ justifyContent?: string }>`
	display: flex;
	justify-content: ${props => props.justifyContent ? props.justifyContent : 'center'};
	font-family: ${props => props.theme.fontFamily};
	font-size: ${props => props.theme.fontSize * 1.5}px;
	line-height: 1.6em;
	color: ${props => props.theme.color};
	font-weight: bold;
	margin-bottom: 1em;
`;

const Title = styled.span<{ justifyContent?: string }>`
	text-align: ${props => props.justifyContent === 'center' ? 'center' : 'start'};
`;


interface Props {
	title: string;
	justifyContent?: string;
}

export default function DialogTitle(props: Props) {
	return (
		<Root justifyContent={props.justifyContent}>
			<Title justifyContent={props.justifyContent}>{props.title}</Title>
		</Root>
	);
}
