const browser_ = typeof browser !== 'undefined' ? browser : chrome;

// Duplicated from youtubeSettingDefaults in ../content_scripts/youtubeTranscript.js; keep both in sync.
// Sharing one file would need another script tag in options.html for just five values.
const defaults = {
	youtubeOnlyVideoContent: true,
	youtubeFetchTranscription: true,
	youtubeThumbnailWidthMode: 'percentage',
	youtubeThumbnailWidthPercentage: 40,
	youtubeThumbnailWidthPixels: 500,
};

const statusElement = document.querySelector('.status');
const inputs = document.querySelectorAll('[data-setting]');
const modeSetting = 'youtubeThumbnailWidthMode';

const showSaved = () => {
	statusElement.textContent = 'Saved';
	setTimeout(() => { statusElement.textContent = ''; }, 1500);
};

const updateVisibleWidthFields = (mode) => {
	for (const field of document.querySelectorAll('[data-show-for-mode]')) {
		field.hidden = field.dataset.showForMode !== mode;
	}
};

const readValue = (input) => {
	if (input.type === 'checkbox') return input.checked;
	if (input.type === 'number') {
		const value = Math.round(Number(input.value));
		const isValid = input.value !== '' && Number.isFinite(value) && value >= Number(input.min) && value <= Number(input.max);
		return isValid ? value : null;
	}
	return input.value;
};

const writeValue = (input, value) => {
	if (input.type === 'checkbox') {
		input.checked = !!value;
	} else {
		input.value = value;
	}
};

const init = async () => {
	const stored = await browser_.storage.local.get(Object.keys(defaults));
	const settings = { ...defaults, ...stored };

	for (const input of inputs) {
		const key = input.dataset.setting;
		writeValue(input, settings[key]);

		input.addEventListener('change', async () => {
			const value = readValue(input);
			if (value === null) {
				const current = await browser_.storage.local.get([key]);
				writeValue(input, key in current ? current[key] : defaults[key]);
				return;
			}
			await browser_.storage.local.set({ [key]: value });
			if (key === modeSetting) updateVisibleWidthFields(value);
			showSaved();
		});
	}

	updateVisibleWidthFields(settings[modeSetting]);
};

void init();
