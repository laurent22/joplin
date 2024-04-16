import React = require('react');
import { useMemo, useState, useCallback, CSSProperties, useEffect, useRef } from 'react';
import { _ } from '@joplin/lib/locale';
import { SettingItemSubType } from '@joplin/lib/models/Setting';
import { focus } from '@joplin/lib/utils/focusHandler';

interface Props {
	type: string;
	style: CSSProperties;
	value: string;
	availableFonts: string[];
	onChange: (font: string)=> void;
	subtype: string;
}

const FontSearch = (props: Props) => {
	const { type, style, value, availableFonts, onChange, subtype } = props;
	const [filteredAvailableFonts, setFilteredAvailableFonts] = useState(availableFonts);
	const [inputText, setInputText] = useState(value);
	const [showList, setShowList] = useState(false);
	const [isListHovered, setIsListHovered] = useState(false);
	const [isFontSelected, setIsFontSelected] = useState(value !== '');
	const [visibleFonts, setVisibleFonts] = useState<string[]>([]);
	const [isMonoBoxChecked, setIsMonoBoxChecked] = useState(false);
	const isLoadingFonts = filteredAvailableFonts.length === 0;
	const fontInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (subtype === SettingItemSubType.MonospaceFontFamily) {
			setIsMonoBoxChecked(true);
		}
	}, [subtype]);

	useEffect(() => {
		if (!isMonoBoxChecked) return setFilteredAvailableFonts(availableFonts);
		const localMonospacedFonts = availableFonts.filter((font: string) =>
			monospaceKeywords.some((word: string) => font.toLowerCase().includes(word)) ||
			knownMonospacedFonts.includes(font.toLowerCase()),
		);
		setFilteredAvailableFonts(localMonospacedFonts);
	}, [isMonoBoxChecked, availableFonts]);

	const displayedFonts = useMemo(() => {
		if (isFontSelected) return filteredAvailableFonts;
		return filteredAvailableFonts.filter((font: string) =>
			font.toLowerCase().startsWith(inputText.toLowerCase()),
		);
	}, [filteredAvailableFonts, inputText, isFontSelected]);

	useEffect(() => {
		setVisibleFonts(displayedFonts.slice(0, 20));
	}, [displayedFonts]);

	// Lazy loading
	const handleListScroll: React.UIEventHandler<HTMLDivElement> = useCallback((event) => {
		const scrollTop = (event.target as HTMLDivElement).scrollTop;
		const scrollHeight = (event.target as HTMLDivElement).scrollHeight;
		const clientHeight = (event.target as HTMLDivElement).clientHeight;

		// Check if the user has scrolled to the bottom of the container
		// A small buffer of 20 pixels is subtracted from the total scrollHeight to ensure new content starts loading slightly before the user reaches the absolute bottom, providing a smoother experience.
		if (scrollTop + clientHeight >= scrollHeight - 20) {
			// Load the next 20 fonts
			const remainingFonts = displayedFonts.slice(visibleFonts.length, visibleFonts.length + 20);

			setVisibleFonts([...visibleFonts, ...remainingFonts]);
		}
	}, [displayedFonts, visibleFonts]);

	const handleTextChange: React.ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
		setIsFontSelected(false);
		setInputText(event.target.value);
		onChange(event.target.value);
	}, [onChange]);

	const handleFocus: React.FocusEventHandler<HTMLInputElement> = useCallback(() => setShowList(true), []);

	const handleBlur: React.FocusEventHandler<HTMLInputElement> = useCallback(() => {
		if (!isListHovered) {
			setShowList(false);
		}
	}, [isListHovered]);

	const handleFontClick: React.MouseEventHandler<HTMLDivElement> = useCallback((event) => {
		const font = (event.target as HTMLDivElement).innerText;
		setInputText(font);
		setShowList(false);
		onChange(font);
		setIsFontSelected(true);
	}, [onChange]);

	const handleListHover: React.MouseEventHandler<HTMLDivElement> = useCallback(() => setIsListHovered(true), []);

	const handleListLeave: React.MouseEventHandler<HTMLDivElement> = useCallback(() => setIsListHovered(false), []);

	const handleMonoBoxCheck: React.ChangeEventHandler<HTMLInputElement> = useCallback(() => {
		setIsMonoBoxChecked(!isMonoBoxChecked);
		focus('FontSearch::fontInputRef', fontInputRef.current);
	}, [isMonoBoxChecked]);

	return (
		<>
			<input
				type={type}
				style={style}
				value={inputText}
				onChange={handleTextChange}
				onFocus={handleFocus}
				onBlur={handleBlur}
				spellCheck={false}
				ref={fontInputRef}
			/>
			<div
				className={'font-search-list'}
				style={{ display: showList ? 'block' : 'none' }}
				onMouseEnter={handleListHover}
				onMouseLeave={handleListLeave}
				onScroll={handleListScroll}
			>
				{
					isLoadingFonts ? <div>{_('Loading...')}</div> :
						<>
							<div className='monospace-checkbox'>
								<input
									type='checkbox'
									checked={isMonoBoxChecked}
									onChange={handleMonoBoxCheck}
									id={`show-monospace-fonts_${subtype}`}
								/>
								<label htmlFor={`show-monospace-fonts_${subtype}`}>{_('Show monospace fonts only.')}</label>
							</div>
							{
								visibleFonts.map((font: string) =>
									<div
										key={font}
										style={{ fontFamily: `"${font}"` }}
										onClick={handleFontClick}
										className='font-search-item'
									>
										{font}
									</div>,
								)
							}
						</>
				}
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
