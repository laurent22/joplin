pub use crate::parser::Parser;
use color_eyre::eyre::Result;
use color_eyre::eyre::{eyre, ContextCompat};
use std::panic;
use std::path::Path;
use std::path::PathBuf;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::utils::utils::{log, log_warn};

mod notebook;
mod page;
mod parser;
mod section;
mod templates;
mod utils;

extern crate console_error_panic_hook;
extern crate web_sys;

#[wasm_bindgen]
pub fn oneNoteConverter(input: &str, output: &str) {
    panic::set_hook(Box::new(console_error_panic_hook::hook));

    let input_paths = PathBuf::from(input);
    let output_dir = PathBuf::from(output);

    if let Err(e) = _main(input_paths, output_dir) {
        log_warn!("Something went wrong: {:?}", e);
    }
}

fn _main(input_paths: PathBuf, output_dir: PathBuf) -> Result<()> {
    assert!(!output_dir.is_file());

    log!("Input path: {:?}", input_paths);
    convert(&input_paths, &output_dir)?;

    Ok(())
}

pub fn convert(path: &Path, output_dir: &Path) -> Result<()> {
    let mut parser = Parser::new();

    match path.extension().map(|p| p.to_string_lossy()).as_deref() {
        Some("one") => {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            log!("Processing .one file {}", name);

            let section = parser.parse_section(&path)?;

            section::Renderer::new().render(&section, output_dir)?;
        }
        Some("onetoc2") => {
            let name = path
                .parent()
                .unwrap()
                .file_name()
                .unwrap_or_default()
                .to_string_lossy();
            log!("Processing .onetoc2 file {}", name);

            let notebook = parser.parse_notebook(&path)?;

            let notebook_name = path
                .parent()
                .wrap_err("Input file has no parent folder")?
                .file_name()
                .wrap_err("Parent folder has no name")?
                .to_string_lossy();

            notebook::Renderer::new().render(&notebook, &notebook_name, &output_dir)?;
        }
        Some(ext) => return Err(eyre!("Invalid file extension: {}", ext)),
        _ => return Err(eyre!("Couldn't determine file type: {:?}", path)),
    }

    Ok(())
}
