export const isInsideContainer = (node: any, className: string): boolean => {
	while (node) {
		if (node.classList && node.classList.contains(className)) return true;
		node = node.parentNode;
	}
	return false;
};

export const waitForElement = async (parent: any, id: string): Promise<any> => {
	return new Promise((resolve, reject) => {
		const iid = setInterval(() => {
			try {
				const element = parent.getElementById(id);
				if (element) {
					clearInterval(iid);
					resolve(element);
				}
			} catch (error) {
				clearInterval(iid);
				reject(error);
			}
		}, 10);
	});
};

// -----------------------------------------------------------------------
// Imported from https://github.com/Moh-Snoussi/keyboard-event-key-type
// -----------------------------------------------------------------------

type NumericKeypadKeys = 'Decimal' | 'Key11' | 'Key12' | 'Multiply' | 'Add' | 'Clear' | 'Divide' | 'Subtract' | 'Separator' | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type UpperAlpha = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';
type LowerAlpha = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
type ModifierKeys = 'Alt' | 'AltGraph' | 'CapsLock' | 'Control' | 'Fn' | 'FnLock' | 'Hyper' | 'Meta' | 'NumLock' | 'ScrollLock' | 'Shift' | 'Super' | 'Symbol' | 'SymbolLock';
type WhitespaceKeys = 'Enter' | 'Tab' | ' ';
type NavigationKeys = 'ArrowDown' | 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'End' | 'Home' | 'PageDown' | 'PageUp';
type EditingKeys = 'Backspace' | 'Clear' | 'Copy' | 'CrSel' | 'Cut' | 'Delete' | 'EraseEof' | 'ExSel' | 'Insert' | 'Paste' | 'Redo' | 'Undo';
type UIKeys = 'Accept' | 'Again' | 'Attn' | 'Cancel' | 'ContextMenu' | 'Escape' | 'Execute' | 'Find' | 'Finish' | 'Help' | 'Pause' | 'Play' | 'Props' | 'Select' | 'ZoomIn' | 'ZoomOut';
type DeviceKeys = 'BrightnessDown' | 'BrightnessUp' | 'Eject' | 'LogOff' | 'Power' | 'PowerOff' | 'PrintScreen' | 'Hibernate' | 'Standby' | 'WakeUp';
type IMECompositionKeys = 'AllCandidates' | 'Alphanumeric' | 'CodeInput' | 'Compose' | 'Convert' | 'Dead' | 'FinalMode' | 'GroupFirst' | 'GroupLast' | 'GroupNext' | 'GroupPrevious' | 'ModeChange' | 'NextCandidate' | 'NonConvert' | 'PreviousCandidate' | 'Process' | 'SingleCandidate';
type LinuxDeadKeys = 'GDK_KEY_dead_grave' | 'GDK_KEY_dead_acute' | 'GDK_KEY_dead_circumflex' | 'GDK_KEY_dead_tilde' | 'GDK_KEY_dead_perispomeni' | 'GDK_KEY_dead_macron' | 'GDK_KEY_dead_breve' | 'GDK_KEY_dead_abovedot' | 'GDK_KEY_dead_diaeresis' | 'GDK_KEY_dead_abovering' | 'GDK_KEY_dead_doubleacute' | 'GDK_KEY_dead_caron' | 'GDK_KEY_dead_cedilla' | 'GDK_KEY_dead_ogonek' | 'GDK_KEY_dead_iota' | 'GDK_KEY_dead_voiced_sound' | 'GDK_KEY_dead_semivoiced_sound' | 'GDK_KEY_dead_belowdot' | 'GDK_KEY_dead_hook' | 'GDK_KEY_dead_horn' | 'GDK_KEY_dead_stroke' | 'GDK_KEY_dead_abovecomma' | 'GDK_KEY_dead_psili' | 'GDK_KEY_dead_abovereversedcomma' | 'GDK_KEY_dead_dasia' | 'GDK_KEY_dead_doublegrave' | 'GDK_KEY_dead_belowring' | 'GDK_KEY_dead_belowmacron' | 'GDK_KEY_dead_belowcircumflex' | 'GDK_KEY_dead_belowtilde' | 'GDK_KEY_dead_belowbreve' | 'GDK_KEY_dead_belowdiaeresis' | 'GDK_KEY_dead_invertedbreve' | 'GDK_KEY_dead_belowcomma' | 'GDK_KEY_dead_currency' | 'GDK_KEY_dead_a' | 'GDK_KEY_dead_A' | 'GDK_KEY_dead_e' | 'GDK_KEY_dead_E' | 'GDK_KEY_dead_i' | 'GDK_KEY_dead_I' | 'GDK_KEY_dead_o' | 'GDK_KEY_dead_O' | 'GDK_KEY_dead_u' | 'GDK_KEY_dead_U' | 'GDK_KEY_dead_small_schwa' | 'GDK_KEY_dead_capital_schwa' | 'GDK_KEY_dead_greek';
type FunctionKeys = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' | 'F11' | 'F12' | 'F13' | 'F14' | 'F15' | 'F16' | 'F17' | 'F18' | 'F19' | 'F20' | 'Soft1' | 'Soft2' | 'Soft3' | 'Soft4';
type PhoneKeys = 'AppSwitch' | 'Call' | 'Camera' | 'CameraFocus' | 'EndCall' | 'GoBack' | 'GoHome' | 'HeadsetHook' | 'LastNumberRedial' | 'Notification' | 'MannerMode' | 'VoiceDial';
type MultimediaKeys = 'ChannelDown' | 'ChannelUp' | 'MediaFastForward' | 'MediaPause' | 'MediaPlay' | 'MediaPlayPause' | 'MediaRecord' | 'MediaRewind' | 'MediaStop' | 'MediaTrackNext' | 'MediaTrackPrevious';
type TVControlKeys = 'TV' | 'TV3DMode' | 'TVAntennaCable' | 'TVAudioDescription' | 'TVAudioDescriptionMixDown' | 'TVAudioDescriptionMixUp' | 'TVContentsMenu' | 'TVDataService' | 'TVInput' | 'TVInputComponent1' | 'TVInputComponent2' | 'TVInputComposite1' | 'TVInputComposite2' | 'TVInputHDMI1' | 'TVInputHDMI2' | 'TVInputHDMI3' | 'TVInputHDMI4' | 'TVInputVGA1' | 'TVMediaContext' | 'TVNetwork' | 'TVNumberEntry' | 'TVPower' | 'TVRadioService' | 'TVSatellite' | 'TVSatelliteBS' | 'TVSatelliteCS' | 'TVSatelliteToggle' | 'TVTerrestrialAnalog' | 'TVTerrestrialDigital' | 'TVTimer';
type MediaControllerKeys = 'AVRInput' | 'AVRPower' | 'ColorF0Red' | 'ColorF1Green' | 'ColorF2Yellow' | 'ColorF3Blue' | 'ColorF4Grey' | 'ColorF5Brown' | 'ClosedCaptionToggle' | 'Dimmer' | 'DisplaySwap' | 'DVR' | 'Exit' | 'FavoriteClear0' | 'FavoriteClear1' | 'FavoriteClear2' | 'FavoriteClear3' | 'FavoriteRecall0' | 'FavoriteRecall1' | 'FavoriteRecall2' | 'FavoriteRecall3' | 'FavoriteStore0' | 'FavoriteStore1' | 'FavoriteStore2' | 'FavoriteStore3' | 'Guide' | 'GuideNextDay' | 'GuidePreviousDay' | 'Info' | 'InstantReplay' | 'Link' | 'ListProgram' | 'LiveContent' | 'Lock' | 'MediaApps' | 'MediaAudioTrack' | 'MediaLast' | 'MediaSkipBackward' | 'MediaSkipForward' | 'MediaStepBackward' | 'MediaStepForward' | 'MediaTopMenu' | 'NavigateIn' | 'NavigateNext' | 'NavigateOut' | 'NavigatePrevious' | 'NextFavoriteChannel' | 'NextUserProfile' | 'OnDemand' | 'Pairing' | 'PinPDown' | 'PinPMove' | 'PinPToggle' | 'PinPUp' | 'PlaySpeedDown' | 'PlaySpeedReset' | 'PlaySpeedUp' | 'RandomToggle' | 'RcLowBattery' | 'RecordSpeedNext' | 'RfBypass' | 'ScanChannelsToggle' | 'ScreenModeNext' | 'Settings' | 'SplitScreenToggle' | 'STBInput' | 'STBPower' | 'Subtitle' | 'Teletext' | 'VideoModeNext' | 'Wink' | 'ZoomToggle';
type SpeechRecognitionKeys = 'SpeechCorrectionList' | 'SpeechInputToggle';
type DocumentKeys = 'Close' | 'New' | 'Open' | 'Print' | 'Save' | 'SpellCheck' | 'MailForward' | 'MailReply' | 'MailSend';
type ApplicationSelectorKeys = 'LaunchCalculator' | 'LaunchCalendar' | 'LaunchContacts' | 'LaunchMail' | 'LaunchMediaPlayer' | 'LaunchMusicPlayer' | 'LaunchMyComputer' | 'LaunchPhone' | 'LaunchScreenSaver' | 'LaunchSpreadsheet' | 'LaunchWebBrowser' | 'LaunchWebCam' | 'LaunchWordProcessor' | 'LaunchApplication1' | 'LaunchApplication2' | 'LaunchApplication3' | 'LaunchApplication4' | 'LaunchApplication5' | 'LaunchApplication6' | 'LaunchApplication7' | 'LaunchApplication8' | 'LaunchApplication9' | 'LaunchApplication10' | 'LaunchApplication11' | 'LaunchApplication12' | 'LaunchApplication13' | 'LaunchApplication14' | 'LaunchApplication15' | 'LaunchApplication16';
type BrowserControlKeys = 'BrowserBack' | 'BrowserFavorites' | 'BrowserForward' | 'BrowserHome' | 'BrowserRefresh' | 'BrowserSearch' | 'BrowserStop';
type KoreanKeyboardsOnly = 'HangulMode' | 'HanjaMode' | 'JunjaMode';
type SpecialValueKey = 'Unidentified';

export declare type KeyboardEventKey = SpecialValueKey | ModifierKeys | WhitespaceKeys | NavigationKeys | EditingKeys | UIKeys | DeviceKeys | IMECompositionKeys | LinuxDeadKeys | FunctionKeys | PhoneKeys | MultimediaKeys | TVControlKeys | MediaControllerKeys | SpeechRecognitionKeys | DocumentKeys | ApplicationSelectorKeys | BrowserControlKeys | NumericKeypadKeys | UpperAlpha | LowerAlpha | KoreanKeyboardsOnly;


export function absoluteUrl(url: string) {
	if (!url) return url;
	const protocol = url.toLowerCase().split(':')[0];
	if (['http', 'https', 'file', 'data'].indexOf(protocol) >= 0) return url;

	if (url.indexOf('//') === 0) {
		return location.protocol + url;
	} else if (url[0] === '/') {
		return `${location.protocol}//${location.host}${url}`;
	} else {
		return `${baseUrl()}/${url}`;
	}
}

export function pageLocationOrigin() {
	// location.origin normally returns the protocol + domain + port (eg. https://example.com:8080)
	// but for file:// protocol this is browser dependant and in particular Firefox returns "null"
	// in this case.

	if (location.protocol === 'file:') {
		return 'file://';
	} else {
		return location.origin;
	}
}

export function baseUrl() {
	let output = pageLocationOrigin() + location.pathname;
	if (output[output.length - 1] !== '/') {
		const output2 = output.split('/');
		output2.pop();
		output = output2.join('/');
	}
	return output;
}

export function getJoplinClipperSvgClassName(svg: SVGSVGElement) {
	for (const className of svg.classList) {
		if (className.indexOf('joplin-clipper-svg-') === 0) return className;
	}
	return '';
}

type ImageObject = {
	width: number;
	height: number;
	naturalWidth?: number;
	naturalHeight?: number;
};

export function getImageSizes(element: HTMLElement, forceAbsoluteUrls = false) {
	const output: Record<string, ImageObject[]> = {};

	const images = element.getElementsByTagName('img');
	for (let i = 0; i < images.length; i++) {
		const img = images[i];
		if (img.classList && img.classList.contains('joplin-clipper-hidden')) continue;

		let src = imageSrc(img);
		src = forceAbsoluteUrls ? absoluteUrl(src) : src;

		if (!output[src]) output[src] = [];

		output[src].push({
			width: img.width,
			height: img.height,
			naturalWidth: img.naturalWidth,
			naturalHeight: img.naturalHeight,
		});
	}

	const svgs = element.getElementsByTagName('svg');
	for (let i = 0; i < svgs.length; i++) {
		const svg = svgs[i];
		if (svg.classList && svg.classList.contains('joplin-clipper-hidden')) continue;

		const className = getJoplinClipperSvgClassName(svg);// 'joplin-clipper-svg-' + i;

		if (!className) {
			console.warn('SVG without a Joplin class:', svg);
			continue;
		}

		if (!svg.classList.contains(className)) {
			svg.classList.add(className);
		}

		const rect = svg.getBoundingClientRect();

		if (!output[className]) output[className] = [];

		output[className].push({
			width: rect.width,
			height: rect.height,
		});
	}

	return output;
}

// In general we should use currentSrc because that's the image that's currently displayed,
// especially within <picture> tags or with srcset. In these cases there can be multiple
// sources and the best one is probably the one being displayed, thus currentSrc.
export function imageSrc(image: HTMLImageElement) {
	if (image.currentSrc) return image.currentSrc;
	return image.src;
}

// Given a document, return a <style> tag that contains all the styles
// required to render the page. Not currently used but could be as an
// option to clip pages as HTML.
export function getStyleSheets(doc: Document) {
	const output = [];
	for (let i = 0; i < doc.styleSheets.length; i++) {
		const sheet = doc.styleSheets[i];
		try {
			for (const cssRule of sheet.cssRules) {
				output.push({ type: 'text', value: cssRule.cssText });
			}
		} catch (error) {
			// Calling sheet.cssRules will throw a CORS error on Chrome if the stylesheet is on a different domain.
			// In that case, we skip it and add it to the list of stylesheet URLs. These URls will be downloaded
			// by the desktop application, since it doesn't have CORS restrictions.
			// eslint-disable-next-line
			console.info('Could not retrieve stylesheet now:', sheet.href);
			// eslint-disable-next-line
			console.info('It will downloaded by the main application.');
			// eslint-disable-next-line
			console.info(error);
			output.push({ type: 'url', value: sheet.href });
		}
	}
	return output;
}
