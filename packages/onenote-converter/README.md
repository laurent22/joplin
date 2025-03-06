# OneNote Converter

This package is used to process OneNote backup files and output HTML that Joplin can import.

The code is based on the projects created by https://github.com/msiemens

We adapted it to target WebAssembly, adding Node.js functions that could interface with the host machine. For that to happen we are using custom-made functions (see `node_functions.js`) and the Node.js standard library (see `src/utils.rs`).

## How the OneNote Importer Process Works

The requirement for this project was to simplify the migration process from OneNote to Joplin. The starting point of this migration is to export the notebook from OneNote as a `zip` file containing files in the binary format used by OneNote.

The process looks like this:

1. Unzip the backup file.
2. Use `onenote-converter` to read and convert the binary files to HTML (this project).
3. Extract the SVG nodes from the HTML to resources:
    1. Find all SVG nodes in the HTML file.
    2. Create SVG files from the nodes.
    3. Update the HTML file with references to the SVGs.
4. Use the Importer HTML service to create the Joplin notes and resources.

See the `InteropService_Importer_OneNote` class in the `lib` project for details.

### SVG Extraction

The OneNote drawing feature uses `<svg>` tags to save user drawings. Joplin doesn't support SVG rendering due to security concerns, so we added a step to extract the `<svg>` elements as SVG images, replacing them with `<img>` tags.

For each HTML file, we:

- Mount the HTML in the document.
- Find all the `svg` nodes.
- Replace each `svg` node with an `img` node that has a unique title, which will be used as the resource name.
- After editing the entire document, update the HTML.
- Create the SVG images on the local disk with the title used in the replaced `img` tags.

After this, the HTML should look the same and is ready to be imported by the Importer HTML service.

## Project structure:

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

## Development requirements:

To work with the project you will need:

- Rust https://www.rust-lang.org/learn/get-started

When working with the Rust code you will probably rather run `yarn buildDev` since it is faster and it has more logging messages (they can be disabled in the macro `log!()`)

During development, it will be easier to test it where this library is called. `InteropService_Importer_Onenote.ts` is the code that depends on this and already has some tests.

### Running tests and IS_CONTINUOUS_INTEGRATION

We don't require developers that won't work on this project to have Rust installed on their machine.
To make this work we:

- Use temporary files, required only for building the application correctly (e.g: `pkg/onenote_converter.js`).
- Skip the build process if `IS_CONTINUOUS_INTEGRATION` is not set (see `build.js`).
- Skip some tests if `IS_CONTINUOUS_INTEGRATION` is not set (see `lib/services/interop/InteropService_Importer_OneNote.test.ts`).

The tests should still run on CI since `IS_CONTINUOUS_INTEGRATION` is used there.

## Security concerns

We are using WebAssembly with Node.js calls to the file system, reading and writing files and directories, which means
it is not isolated (no more than Node.js is, for that matter). 