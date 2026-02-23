import * as React from 'react';
import styled from 'styled-components';

interface Props {
	notes: string;
}

const NotesContainer = styled.div`
	max-height: 300px;
	overflow-y: auto;
	padding: 1em;
	background-color: ${props => props.theme.backgroundColor3};
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 4px;
	margin-bottom: 1em;
	font-family: ${props => props.theme.fontFamily};
	font-size: ${props => props.theme.fontSize}px;
	color: ${props => props.theme.color};
	line-height: ${props => props.theme.lineHeight};
	white-space: pre-wrap;
	word-wrap: break-word;
`;

const EmptyNotes = styled.div`
	padding: 1em;
	color: ${props => props.theme.colorFaded};
	font-style: italic;
`;

const ReleaseNotesSection = (props: Props) => {
	if (!props.notes || !props.notes.trim()) {
		return <EmptyNotes>No release notes available.</EmptyNotes>;
	}

	return (
		<NotesContainer>
			{props.notes}
		</NotesContainer>
	);
};

export default ReleaseNotesSection;
