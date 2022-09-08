import React, { useCallback } from 'react';
import styled from 'styled-components';
// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMarker, faEraser, faStrikethrough, faUnderline } from '@fortawesome/free-solid-svg-icons';
import { BaseButton } from './IconButtons';
import { MarkupAction, MarkupState, MarkupTool, MarkupColor, MarkupActionType } from '../types';

const MarkupGroup = styled.div`
	display: grid;
	justify-content: center;
	align-items: center;
	grid-template-columns: 50% 50%;
	font-size: 0.9rem;
	padding: 0.2rem 0.4rem;
	min-width: 8.5rem;
	& > div {
		display: flex;
		justify-content: center;
		align-items: center;
		max-width: fit-content;
	}
`;

const Select = styled.select`
	width: 17px;
	text-overflow: clip;
	border: none;
	border-radius: 0.2rem;
	color: var(--grey);
	background: var(--bg);
	cursor: pointer;
`;

const Color = styled.div<{ color: string }>`
	width: 20px;
	height: 20px;
	border-radius: 1rem;
	background-color: ${props => props.color};
	margin-left: 0.8rem;
	margin-right: 0.4rem;
	border: solid 2px var(--bg);
`;

function getToolIcon(tool: MarkupTool) {
	switch (tool as MarkupTool) {
	case MarkupTool.Highlight: return faMarker;
	case MarkupTool.StrikeThrough: return faStrikethrough;
	case MarkupTool.Underline: return faUnderline;
	case MarkupTool.Erase: return faEraser;
	default: {
		console.error(`Unknown tool: ${tool}`);
		return faMarker;
	}
	}
}

export interface MarkupControlsProps {
	markupState: MarkupState;
	dispatch: (action: MarkupAction)=> void;
}

export default function MarkupControls({ markupState, dispatch }: MarkupControlsProps) {

	const selectTool = useCallback(async (tool: MarkupTool) => {
		dispatch({ type: MarkupActionType.Tool, value: tool });
	}, [dispatch]);

	const selectColor = useCallback(async (color: MarkupColor) => {
		dispatch({ type: MarkupActionType.Color, value: color });
	}, [dispatch]);

	const toggle = useCallback(async () => {
		dispatch({ type: MarkupActionType.Toggle });
	}, [dispatch]);

	const handleToolChange = useCallback(async (event) => {
		event.target.value && selectTool(event.target.value as MarkupTool);
	}, [selectTool]);

	const handleColorChange = useCallback(async (event) => {
		event.target.value && selectColor(event.target.value as MarkupColor);
	}, [selectColor]);

	return (<MarkupGroup>
		<div>
			<BaseButton onClick={toggle}
				name={ (markupState.isEnabled ? 'Disable ' : 'Enable ') + markupState.currentTool}
				size={1} color={markupState.isEnabled ? 'blue' : 'grey'}
				hoverColor={'secondary'} icon={getToolIcon(markupState.currentTool)} />
			<Select value={markupState.currentTool} onChange={handleToolChange}>
				{
					Object.keys(MarkupTool).map((tool) => (
						<option key={tool} value={tool}>{tool}</option>
					))
				}
			</Select>
		</div>
		<div>
			{markupState.isEnabled && (markupState.currentTool !== MarkupTool.Erase) && (
				<>
					<Color color={markupState.color} />
					<Select value={markupState.color} onChange={handleColorChange}>
						{
							Object.keys(MarkupColor).map((color) => (
								<option key={color} value={color}>{color}</option>
							))
						}
					</Select>
				</>
			)}
		</div>
	</MarkupGroup>);
}
