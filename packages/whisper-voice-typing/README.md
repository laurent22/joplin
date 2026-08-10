# react-native-whisper-voice-typing

Wraps `whisper.cpp` for use in React Native.

## Development

This package uses [react-native-nitro-modules](https://nitro.margelo.com/docs/what-is-nitro) and was scaffolded using [`nitrogen`](https://nitro.margelo.com/docs/how-to-build-a-nitro-module#1-create-a-nitro-module).

### Adding a new native hybrid object

Process summary:
1. Add a TypeScript type declaration to `src/specs/Whisper.nitro.ts`.
2. (Optional) Update `nitro.json`'s autolinking section.
3. Run `yarn build`. This regenerates the `nitrogen/generated` folder.
4. Implement the new interface(s) in `android/src/main/java/` or `cpp/`.

See [the documentation](https://nitro.margelo.com/docs/nitro-modules) for full instructions.
