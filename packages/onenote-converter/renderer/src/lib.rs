use color_eyre::eyre::{Result, eyre};
pub use parser::Parser;
use sanitize_filename::sanitize;
use std::{io::Read, panic};
use wasm_bindgen::{JsError, prelude::wasm_bindgen};

use parser_utils::{FileHandle, fs_driver, log};

mod errors;
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
    let extension: String = fs_driver().get_file_extension(path);

    match extension.as_str() {
        ".one" => {
            let _name: String = fs_driver().get_file_name(path).expect("Missing file name");
            log!("Parsing .one file: {}", _name);

            if path.contains("OneNote_RecycleBin") {
                return Ok(());
            }

            let section = Parser::new().parse_section(path.to_owned())?;

            let section_output_dir = fs_driver().get_output_path(base_path, output_dir, path);
            section::Renderer::new().render(&section, section_output_dir.to_owned())?;
        }
        ".onetoc2" => {
            let _name: String = fs_driver().get_file_name(path).expect("Missing file name");
            log!("Parsing .onetoc2 file: {}", _name);

            let notebook = Parser::new().parse_notebook(path.to_owned())?;

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
        ".onepkg" => {
            let file_data = fs_driver().open_file(path)?;
            convert_onepkg(file_data, output_dir)?;
        }
        ext => return Err(eyre!("Invalid file extension: {}, file: {}", ext, path)),
    }

    Ok(())
}

fn convert_onepkg(file_data: Box<dyn FileHandle>, output_dir: &str) -> Result<()> {
    // .onepkg files are cabinet files
    let mut cabinet = cab::Cabinet::new(file_data)?;

    let file_paths: Vec<String> = cabinet
        .folder_entries()
        .flat_map(|folder| folder.file_entries())
        .map(|entry| String::from(entry.name()))
        .collect();

    let build_output_dir = |file_path_in_archive: &str| -> Result<(String, String)> {
        let mut output_path = String::from(output_dir);

        // Split on both "\"s and "/"s since CAB archives seem to use Windows-style paths,
        // where both / and \ are valid path separators.
        let is_path_separator = |c| c == '\\' || c == '/';
        let path_segments: Vec<&str> = file_path_in_archive.split(is_path_separator).collect();

        let path_segments_without_filename = &path_segments[0..path_segments.len() - 1];
        for part in path_segments_without_filename {
            output_path = fs_driver().join(&output_path, &sanitize(part));
            fs_driver().make_dir(&output_path)?;
        }

        let file_name = path_segments.last().unwrap_or(&"");
        Ok((output_path, sanitize(file_name)))
    };

    let mut parser = Parser::new();
    for file_path in file_paths {
        log!("File path {file_path}");

        if !file_path.ends_with(".one") {
            log!("Skipping non-section file {file_path}");
            continue;
        }

        log!("Rendering {file_path}");

        let data = {
            let mut file_data = cabinet.read_file(&file_path)?;
            let mut data = Vec::new();
            file_data.read_to_end(&mut data)?;
            data
        };

        let (output_path, file_name) = build_output_dir(&file_path)?;
        let section = parser.parse_section_from_data(&data, &file_name)?;
        section::Renderer::new().render(&section, output_path)?;
    }

    Ok(())
}
