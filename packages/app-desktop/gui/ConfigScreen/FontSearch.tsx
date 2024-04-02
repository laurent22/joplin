import React = require('react');
import { useMemo, useState } from 'react';
import { CSSProperties } from 'styled-components';

const searchListStyle: CSSProperties = {
	backgroundColor: 'var(--joplin-background-color)',
	maxHeight: '200px',
	minHeight: '10px', // Needed to prevent the list from collapsing when empty
	width: '50%',
	minWidth: '20em',
	overflowY: 'auto',
	border: '1px solid #ccc',
	borderRadius: '5px',
	display: 'none',
	marginTop: '10px',
};
const optionStyle: CSSProperties = {
	padding: '5px',
	borderBottom: '1px solid #ccc',
	cursor: 'pointer',
};

interface Props {
	_key: string;
	updateSettingValue: (key: string, value: string)=> void;
	inputType: string;
	inputStyle: CSSProperties;
	fieldValue: string;
	fonts: string[];
}

const FontSearch = (props: Props) => {
	const { _key: key, updateSettingValue, inputType, inputStyle, fieldValue, fonts } = props;
	const [hoveredFont, setHoveredFont] = useState('');
	const [inputText, setInputText] = useState('');
	const areFontsLoading = fonts.length === 0;

	const filteredFonts = useMemo(() => {
		return fonts.filter((font: string) =>
			font.toLowerCase().startsWith(inputText.toLowerCase()),
		);
	}, [fonts, inputText]);

	const showList = (display: boolean) => {
		document.getElementById(`searchList-${key}`).style.display = display ? 'block' : 'none';
	};
	const onTextChange = (event: any) => {
		setInputText(event.target.value);
		updateSettingValue(key, event.target.value);
		showList(true);
	};
	const onFocusHandle = (event: any) => {
		setInputText(event.target.value); // To handle the case when the value is already set
		showList(true);
	};
	const onFontClick = (font: string) => {
		(document.getElementById(key) as HTMLDivElement).innerText = font;
		updateSettingValue(key, font);
		showList(false);
	};

	return (
		<>
			<input
				type={inputType}
				style={inputStyle}
				value={fieldValue}
				id={key}
				onChange={(event: any) => {
					onTextChange(event);
				}}
				onFocus={onFocusHandle}
				onBlur={() => setTimeout(() => showList(false), 150)} // Delay the hiding of the list to allow the click event to fire
				spellCheck={false}
			/>
			<div id={`searchList-${key}`} style={searchListStyle} >
				{
					areFontsLoading ? <div style={{ padding: '5px' }}>Loading...</div> :
						filteredFonts.map((font: string) =>
							<div
								key={font}
								style={{ ...optionStyle, fontFamily: `"${font}"`,
									color: hoveredFont === font ? 'var(--joplin-background-color)' : 'var(--joplin-color)',
									backgroundColor: hoveredFont === font ? 'var(--joplin-color)' : 'var(--joplin-background-color)',
								}}
								onClick={() => onFontClick(font)}
								onMouseEnter={() => setHoveredFont(font)}
								onMouseLeave={() => setHoveredFont('')}
							>
								{font}
							</div>,
						)
				}
			</div>
		</>
	);
};

export default FontSearch;
