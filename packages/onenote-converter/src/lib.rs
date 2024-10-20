pub use crate::parser::Parser;
use color_eyre::eyre::eyre;
use color_eyre::eyre::Result;
use std::panic;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::utils::utils::{log, log_warn};
use crate::utils::{get_file_extension, get_file_name, get_output_path, get_parent_dir};

mod notebook;
mod page;
mod parser;
mod section;
mod templates;
mod utils;

extern crate console_error_panic_hook;
extern crate web_sys;

#[wasm_bindgen]
#[allow(non_snake_case)]
pub fn oneNoteConverter(input: &str, output: &str, base_path: &str) {
    panic::set_hook(Box::new(console_error_panic_hook::hook));

    if let Err(e) = _main(input, output, base_path) {
        log_warn!("{:?}", e);
    }
}

fn _main(input_path: &str, output_dir: &str, base_path: &str) -> Result<()> {
    log!("Starting parsing of the file: {:?}", input_path);
    convert(&input_path, &output_dir, base_path)?;

    Ok(())
}

pub fn convert(path: &str, output_dir: &str, base_path: &str) -> Result<()> {
    let mut parser = Parser::new();

    let extension: String = unsafe { get_file_extension(path) }
        .unwrap()
        .as_string()
        .unwrap();

    match extension.as_str() {
        ".one" => {
            let _name: String = unsafe { get_file_name(path) }.unwrap().as_string().unwrap();
            log!("Parsing .one file: {}", _name);

            if path.contains("OneNote_RecycleBin") {
                return Ok(());
            }

            let section = parser.parse_section(path.to_owned())?;

            let section_output_dir = unsafe { get_output_path(base_path, output_dir, path) }
                .unwrap()
                .as_string()
                .unwrap();

            section::Renderer::new().render(&section, section_output_dir.to_owned())?;
        }
        ".onetoc2" => {
            let _name: String = unsafe { get_file_name(path) }.unwrap().as_string().unwrap();
            log!("Parsing .onetoc2 file: {}", _name);

            let notebook = parser.parse_notebook(path.to_owned())?;

            let notebook_name = unsafe { get_parent_dir(path) }
                .expect("Input file has no parent folder")
                .as_string()
                .expect("Parent folder has no name");
            log!("notebook name: {:?}", notebook_name);

            let notebook_output_dir = unsafe { get_output_path(base_path, output_dir, path) }
                .unwrap()
                .as_string()
                .unwrap();
            log!("Notebok directory: {:?}", notebook_output_dir);

            notebook::Renderer::new().render(&notebook, &notebook_name, &notebook_output_dir)?;
        }
        ext => return Err(eyre!("Invalid file extension: {}, file: {}", ext, path)),
    }

    Ok(())
}
