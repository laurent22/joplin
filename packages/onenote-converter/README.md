# OneNote Converter

This package is used to process OneNote backup files and output HTML that Joplin can import.

The code is based on the projects created by https://github.com/msiemens

We adapted it to target WebAssembly, adding Node.js functions that could interface with the host machine. For that to  happen we are using custom-made functions (see `node_functions.js`) and the Node.js standard library (see `src/utils.rs`).


### Project structure:

```
- onenote-converter
    - package.json              -> where the project is built
    - node_functions.js         -> where the custom-made functions used inside rust goes
    ...
    - pkg                       -> artifact folder generated in the build step
        - onenote_converter.js  -> main file
    ...
    - src
        - lib.rs                -> starting point
```

### Development requirements:

To work with the project you will need:

- Rust https://www.rust-lang.org/learn/get-started

When working with the Rust code you will will probably rather run `yarn buildDev` since it is faster and it has more logging messages (they can be disabled in the macro `log!()`)

During development, it will be easier to test it where this library is called. `InteropService_Importer_Onenote.ts` is the code that depends on this and already has some tests.

### Security concerns

We are using WebAssembly with Node.js calls to the file system, reading and writing files and directories, which means
it is not isolated (no more than Node.js is, for that matter). 