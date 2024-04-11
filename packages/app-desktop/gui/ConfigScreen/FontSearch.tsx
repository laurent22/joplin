import React = require('react');
import { useMemo, useState, useCallback, CSSProperties, useEffect } from 'react';
import { _ } from '@joplin/lib/locale';
import { SettingItemSubType } from '@joplin/lib/models/Setting';

interface Props {
	type: string;
	style: CSSProperties;
	value: string;
	fonts: string[];
	onChange: (font: string)=> void;
	subtype: string;
}

const FontSearch = (props: Props) => {
	const { type, style, value, fonts: allFonts, onChange, subtype } = props;
	const [fonts, setFonts] = useState(allFonts);
	const [inputText, setInputText] = useState(value);
	const [showList, setShowList] = useState(false);
	const [isListHovered, setIsListHovered] = useState(false);
	const [isFontSelected, setIsFontSelected] = useState(value !== '');
	const [renderedFonts, setRenderedFonts] = useState<string[]>([]);
	const [isMonoBoxChecked, setIsMonoBoxChecked] = useState(false);
	const areFontsLoading = fonts.length === 0;

	useEffect(() => {
		if (subtype === SettingItemSubType.MonospaceFontFamily) {
			setIsMonoBoxChecked(true);
		}
	}, [subtype]);

	useEffect(() => {
		if (!isMonoBoxChecked) return setFonts(allFonts);
		const localMonospacedFonts = allFonts.filter((font: string) =>
			monospaceKeywords.some((word: string) => font.toLowerCase().includes(word)) ||
			knownMonospacedFonts.includes(font.toLowerCase()),
		);
		setFonts(localMonospacedFonts);
	}, [isMonoBoxChecked, allFonts]);

	const filteredFonts = useMemo(() => {
		if (isFontSelected) return fonts;
		return fonts.filter((font: string) =>
			font.toLowerCase().startsWith(inputText.toLowerCase()),
		);
	}, [fonts, inputText, isFontSelected]);

	useEffect(() => {
		setRenderedFonts(filteredFonts.slice(0, 20));
	}, [filteredFonts]);

	// Lazy loading
	const onListScroll: React.UIEventHandler<HTMLDivElement> = useCallback((event) => {
		const scrollTop = (event.target as HTMLDivElement).scrollTop;
		const scrollHeight = (event.target as HTMLDivElement).scrollHeight;
		const clientHeight = (event.target as HTMLDivElement).clientHeight;

		// Check if the user has scrolled to the bottom of the container
		// A small buffer of 20 pixels is subtracted from the total scrollHeight to ensure new content starts loading slightly before the user reaches the absolute bottom, providing a smoother experience.
		if (scrollTop + clientHeight >= scrollHeight - 20) {
			// Load the next 20 fonts
			const remainingFonts = filteredFonts.slice(renderedFonts.length, renderedFonts.length + 20);

			setRenderedFonts([...renderedFonts, ...remainingFonts]);
		}
	}, [filteredFonts, renderedFonts]);

	const onTextChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
		setIsFontSelected(false);
		setInputText(event.target.value);
		onChange(event.target.value);
	}, [onChange]);

	const onFocusHandle: React.FocusEventHandler<HTMLInputElement> = useCallback(() => setShowList(true), []);

	const onBlurHandle: React.FocusEventHandler<HTMLInputElement> = useCallback(() => {
		if (!isListHovered) {
			setShowList(false);
		}
	}, [isListHovered]);

	const onFontClick: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
		const font = (event.target as HTMLDivElement).innerText;
		setInputText(font);
		setShowList(false);
		onChange(font);
		setIsFontSelected(true);
	}, [onChange]);

	const onListHover: React.MouseEventHandler<HTMLDivElement> = useCallback(() => setIsListHovered(true), []);

	const onListLeave: React.MouseEventHandler<HTMLDivElement> = useCallback(() => setIsListHovered(false), []);

	const onMonoBoxCheck: React.ChangeEventHandler<HTMLInputElement> = useCallback(() => {
		setIsMonoBoxChecked(!isMonoBoxChecked);
	}, [isMonoBoxChecked]);

	return (
		<>
			<input
				type={type}
				style={style}
				value={inputText}
				onChange={onTextChange}
				onFocus={onFocusHandle}
				onBlur={onBlurHandle}
				spellCheck={false}
			/>
			<div
				className={'font-search-list'}
				style={{ display: showList ? 'block' : 'none' }}
				onMouseEnter={onListHover}
				onMouseLeave={onListLeave}
				onScroll={onListScroll}
			>
				{
					areFontsLoading ? <div>{_('Loading...')}</div> :
						renderedFonts.map((font: string) =>
							<div
								key={font}
								style={{ fontFamily: `"${font}"` }}
								onClick={onFontClick}
								className='font-search-item'
							>
								{font}
							</div>,
						)
				}
			</div>
			<div className='monospace-checkbox'>
				<input
					type='checkbox'
					checked={isMonoBoxChecked}
					onChange={onMonoBoxCheck}
					id={`show-monospace-fonts_${subtype}`}
				/>
				<label htmlFor={`show-monospace-fonts_${subtype}`}>{_('Show monospace fonts only.')}</label>
			</div>
		</>
	);
};

export default FontSearch;

// Known monospaced fonts from wikipedia
// https://en.wikipedia.org/wiki/List_of_monospaced_typefaces
// https://en.wikipedia.org/wiki/Category:Monospaced_typefaces
// Make sure to add the fonts in lower case
// cSpell:disable
const knownMonospacedFonts = [
	'andalé mono',
	'anonymous pro',
	'bitstream vera sans mono',
	'cascadia code',
	'century schoolbook monospace',
	'comic mono',
	'computer modern mono/typewriter',
	'consolas',
	'courier',
	'courier final draft',
	'courier new',
	'courier prime',
	'courier screenplay',
	'cousine',
	'dejavu sans mono',
	'droid sans mono',
	'envy code r',
	'everson mono',
	'fantasque sans mono',
	'fira code',
	'fira mono',
	'fixed',
	'fixedsys',
	'freemono',
	'go mono',
	'hack',
	'hyperfont',
	'ibm courier',
	'ibm plex mono',
	'inconsolata',
	'input',
	'iosevka',
	'jetbrains mono',
	'juliamono',
	'letter gothic',
	'liberation mono',
	'lucida console',
	'menlo',
	'monaco',
	'monofur',
	'monospace (unicode)',
	'nimbus mono l',
	'nk57 monospace',
	'noto mono',
	'ocr-a',
	'ocr-b',
	'operator mono',
	'overpass mono',
	'oxygen mono',
	'pragmatapro',
	'profont',
	'pt mono',
	'recursive mono',
	'roboto mono',
	'sf mono',
	'source code pro',
	'spleen',
	'terminal',
	'terminus',
	'tex gyre cursor',
	'ubuntu mono',
	'victor mono',
	'wumpus mono',
];

const monospaceKeywords = [
	'mono',
	'code',
	'courier',
	'console',
	'source code',
	'terminal',
	'fixed',
];
