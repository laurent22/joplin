# Voice typing

The Android mobile application supports built-in, offline voice typing via either the [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) or [Vosk libraries](https://alphacephei.com/vosk/). Vosk is a speech recognition toolkit that can work on lightweight devices, such as mobile phones. Whisper is a more advanced speech-to-text library, but will be slower than Vosk.

## Whisper

By default, Joplin uses Whisper.cpp for voice typing.

### Language models

Whisper.cpp provides a number of pre-trained models for transcribing speech in different languages. Both [English-only and multilingual models](https://github.com/openai/whisper?tab=readme-ov-file#available-models-and-languages) are available. The multilingual models support a variety of different languages. Joplin uses the smallest of the multilingual models by default.

### Downloading the models

By default, Joplin downloads Whisper models from [this GitHub repository](https://github.com/personalizedrefrigerator/joplin-voice-typing-test/releases). It's possible to download models from a custom location by changing the **Voice typing language files (URL)** in from the "Note" tab of the configuration screen.

### Customizing Whisper

Joplin supports loading Whisper models from `.zip` files with the following structure:
```
🗃️ modelName.zip/
| 📄 config.json
| 📄 model.bin
| 📄 README.md
```

Above, `config.json` includes [prompting](https://cookbook.openai.com/examples/whisper_prompting_guide) and post-processing information. It should have the following format:
```json
{
	"prompts": {
		"en": "Prompt for English-language text goes here.",
		"fr": "Prompt for French-language text goes here.",
        "...": "... more prompts for other languages ..."
	},
	"output": {
		"stringReplacements": [
			[ "text to replace 1", "replace with" ],
			[ "text to replace 2", "replace with 2" ]
		],
		"regexReplacements": [
			[ "some.*regular (expression)?", "replace with" ],
			[ "another regular expression", "replace with 2" ]
		]
	}
}
```

The `model.bin` file is a [ggml](https://github.com/ggml-org/ggml) model.

Pre-built models that can be included as `model.bin` are present [on whisper.cpp's Huggingface](https://huggingface.co/ggerganov/whisper.cpp/tree/main) page. Custom models can be built by [following the instructions in whisper.cpp's README](https://github.com/ggerganov/whisper.cpp/blob/d682e150908e10caa4c15883c633d7902d385237/models/README.md?plain=1#L74).


## Vosk

Vosk voice typing can be enabled in settings, under the "Note" tab, by changing the "Preferred voice typing provider" to "Vosk".

### Comparison with Whisper

- **No punctuation**: Vosk's output is all-lowercase text, without punctuation.
- **Single paragraph**: Vosk's output is a single paragraph.
- **Fast**: Vosk runs with less latency than Whisper.

### Language models

Like Whisper, Vosk uses pre-trained language models that can be used for automatic speech recognition tasks. These models are trained on large amounts of speech data to convert spoken language into written text. Multiple language models are available per language - lightweight ones, which are suitable for mobile (about 50 MB per model), and large ones which are designed for server-side speech recognition (2 GB+ per model).

### Downloading the language models

By default Joplin will automatically download the [lightweight models](https://alphacephei.com/vosk/models) from the official Vosk website. That language file only needs to be downloaded the first time the voice typing feature is used.

You can also configure the application to download the models from your own server. To do so, set the **Voice typing language files (URL)** setting in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md). You have two options:

* **Provide the base URL**, eg `https://example.com/models`. Then Joplin will automatically append the filename to that URL, for example it will download the French files from `https://example.com/models/fr.zip`

* **Provide a URL template**. In that case, include a `{lang}` variable, which will be expanded to the language code. For example, if the URL is set to `https://example.com/models/vosk-model-{lang}.zip`, the app will download the French file from `https://example.com/models/vosk-model-fr.zip`. With this option you have more flexibility on where the app should get the file from. For example you can also use query parameters, as in `https://example.com/models/vosk-models.php?lang={lang}&download=true`