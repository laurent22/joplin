# Voice typing

The Android mobile application supports built-in, offline voice typing via the [Vosk library](https://alphacephei.com/vosk/). Vosk is a speech recognition toolkit that can work on lightweight devices, such as mobile phones.

## Language models

Vosk uses pre-trained language models that can be used for automatic speech recognition tasks. These models are trained on large amounts of speech data to convert spoken language into written text. Multiple language models are available per language - lightweight ones, which are suitable for mobile (about 50 MB per model), and large ones which are designed for server-side speech recognition (2 GB+ per model).

## Downloading the language models

By default Joplin will automatically download the [lightweight models](https://alphacephei.com/vosk/models) from the official Vosk website. That language file only needs to be downloaded the first time the voice typing feature is used.

You can also configure the application to download the models from your own server. To do so, set the **Voice typing language files (URL)** setting in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md). You have two options:

* **Provide the base URL**, eg `https://example.com/models`. Then Joplin will automatically append the filename to that URL, for example it will download the French files from `https://example.com/models/fr.zip`

* **Provide a URL template**. In that case, include a `{lang}` variable, which will be expanded to the language code. For example, if the URL is set to `https://example.com/models/vosk-model-{lang}.zip`, the app will download the French file from `https://example.com/models/vosk-model-fr.zip`. With this option you have more flexibility on where the app should get the file from. For example you can also use query parameters, as in `https://example.com/models/vosk-models.php?lang={lang}&download=true`