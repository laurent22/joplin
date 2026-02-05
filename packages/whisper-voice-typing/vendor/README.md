# Vendored Android packages

This directory contains upstream packages that can't be added as direct dependencies (e.g. through `npm`).

## whisper.cpp

`whisper.cpp` provides voice typing capabilities. It can be updated by replacing the contents of the `whisper.cpp` directory with the latest content from https://github.com/ggerganov/whisper.cpp. To decrease the size of the `whisper.cpp` directory, some files are ignored by the `.gitignore`.
