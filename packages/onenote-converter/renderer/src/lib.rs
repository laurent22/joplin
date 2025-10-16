use color_eyre::eyre::{Result, eyre};
pub use parser::Parser;
use std::panic;
use wasm_bindgen::{JsError, prelude::wasm_bindgen};

use parser_utils::{fs_driver, log};

mod notebook;
mod page;
mod section;
mod templates;
mod utils;

#[wasm_bindgen]
#[allow(non_snake_case)]
pub fn oneNoteConverter(input: &str, output: &str, base_path: &str) -> Result<(), JsError> {
    panic::set_hook(Box::new(console_error_panic_hook::hook));
    log::set_current_page("[None]".into());

    if let Err(e) = _main(input, output, base_path) {
        let message = format!("Error: {:?} (near page {})", e, log::get_current_page());
        Err(JsError::new(&message))
    } else {
        Ok(())
    }
}

fn _main(input_path: &str, output_dir: &str, base_path: &str) -> Result<()> {
    log!("Starting parsing of the file: {:?}", input_path);
    convert(input_path, output_dir, base_path)?;

    Ok(())
}

pub fn convert(path: &str, output_dir: &str, base_path: &str) -> Result<()> {
    let mut parser = Parser::new();

    let extension: String = fs_driver().get_file_extension(path);

    match extension.as_str() {
        ".one" => {
            let _name: String = fs_driver().get_file_name(path).expect("Missing file name");
            log!("Parsing .one file: {}", _name);

            if path.contains("OneNote_RecycleBin") {
                return Ok(());
            }

            let section = parser.parse_section(path.to_owned())?;

            let section_output_dir = fs_driver().get_output_path(base_path, output_dir, path);
            section::Renderer::new().render(&section, section_output_dir.to_owned())?;
        }
        ".onetoc2" => {
            let _name: String = fs_driver().get_file_name(path).expect("Missing file name");
            log!("Parsing .onetoc2 file: {}", _name);

            let notebook = parser.parse_notebook(path.to_owned())?;

            let notebook_name = fs_driver()
                .get_parent_dir(path)
                .expect("Input file has no parent folder");
            if notebook_name.is_empty() {
                panic!("Parent directory has no name");
            }
            log!("notebook name: {:?}", notebook_name);

            let notebook_output_dir = fs_driver().get_output_path(base_path, output_dir, path);
            log!("Notebook directory: {:?}", notebook_output_dir);

            notebook::Renderer::new().render(&notebook, &notebook_name, &notebook_output_dir)?;
        }
        ext => return Err(eyre!("Invalid file extension: {}, file: {}", ext, path)),
    }

    Ok(())
}
