import React, { useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleRight, faAngleLeft } from '@fortawesome/free-solid-svg-icons';

const Group = styled.div<{ size: number }>`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-flow: row;
	color: var(--grey);
	cursor: initial;
	font-size: ${props => props.size}rem;
	padding: 0.2rem 0.4rem;
	svg:hover {
		color: var(--secondary);
	}
`;

const GoToInput = styled.input`
ont-size: 0.7rem;
    font-weight: 500;
    max-width: 3rem;
    padding: 0.4rem 0.3rem;
    background: var(--bg);
    border: solid 2px transparent;
    border-radius: 3.5rem;
    color: var(--tertialry);
    text-align: center;
    margin: auto 0.6rem;
	&:focus {
		outline: none;
		border: solid 2px var(--blue);
	}
`;

export interface GotoInputProps {
	onChange: (pageNo: number)=> void;
	size?: number;
	pageCount: number;
	currentPage: number;
}

export default function GotoInput(props: GotoInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const inputFocus = useCallback(() => {
		inputRef.current?.select();
	} , []);

	const onPageNoInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.value.length <= 0) return;
		const pageNo = parseInt(e.target.value, 10);
		if (pageNo < 1 || pageNo > props.pageCount || pageNo === props.currentPage) return;
		props.onChange(pageNo);
	}, [props.onChange, props.pageCount, props.currentPage]);

	useEffect(() => {
		inputRef.current.value = props.currentPage.toString();
	} , [props.currentPage]);

	return (<Group size={props.size || 1}>
		<FontAwesomeIcon icon={faAngleLeft} title="Previous Page" style={{ cursor: 'pointer' }} onClick={() => props.onChange(props.currentPage - 1)} />
		<GoToInput onChange={onPageNoInput} placeholder="Page" ref={inputRef} onFocus={inputFocus} />
		<FontAwesomeIcon icon={faAngleRight} title="Next Page" style={{ cursor: 'pointer' }} onClick={() => props.onChange(props.currentPage + 1)} />
	</Group>);
}
