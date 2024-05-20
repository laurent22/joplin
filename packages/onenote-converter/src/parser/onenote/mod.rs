use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::packaging::OneStorePackaging;
use crate::parser::onenote::notebook::Notebook;
use crate::parser::onenote::section::{Section, SectionEntry, SectionGroup};
use crate::parser::onestore::parse_store;
use crate::parser::reader::Reader;
use crate::parser::utils::{exists, is_directory, read_dir, read_file};
use crate::utils::utils::log;
use crate::utils::{get_dir_name, get_file_extension, get_file_name, join_path};
use std::panic;
use web_sys::js_sys::Uint8Array;

pub(crate) mod content;
pub(crate) mod embedded_file;
pub(crate) mod iframe;
pub(crate) mod image;
pub(crate) mod ink;
pub(crate) mod list;
pub(crate) mod note_tag;
pub(crate) mod notebook;
pub(crate) mod outline;
pub(crate) mod page;
pub(crate) mod page_content;
pub(crate) mod page_series;
pub(crate) mod rich_text;
pub(crate) mod section;
pub(crate) mod table;

extern crate console_error_panic_hook;

/// The OneNote file parser.
pub struct Parser;

impl Parser {
    /// Create a new OneNote file parser.
    pub fn new() -> Parser {
        panic::set_hook(Box::new(console_error_panic_hook::hook));
        Parser {}
    }

    /// Parse a OneNote notebook.
    ///
    /// The `path` argument must point to a `.onetoc2` file. This will parse the
    /// table of contents of the notebook as well as all contained
    /// sections from the folder that the table of contents file is in.
    pub fn parse_notebook(&mut self, path: String) -> Result<Notebook> {
        log!("Parsing notebook: {:?}", path);
        let file_content = unsafe { read_file(path.as_str()) }.unwrap();
        let array = Uint8Array::new(&file_content);
        let data = array.to_vec();
        let packaging = OneStorePackaging::parse(&mut Reader::new(&data))?;
        let store = parse_store(&packaging)?;

        if store.schema_guid() != guid!({ E4DBFD38 - E5C7 - 408B - A8A1 - 0E7B421E1F5F }) {
            return Err(ErrorKind::NotATocFile { file: path }.into());
        }

        let base_dir = unsafe { get_dir_name(path.as_str()) }
            .expect("base dir not found")
            .as_string()
            .unwrap();
        let sections = notebook::parse_toc(store.data_root())?
            .iter()
            .map(|name| {
                let result = unsafe { join_path(base_dir.as_str(), name) }
                    .unwrap()
                    .as_string()
                    .unwrap();
                return result;
            })
            .filter(|p| !p.contains("OneNote_RecycleBin"))
            .filter(|p| {
                let is_file = match unsafe { exists(p.as_str()) } {
                    Ok(is_file) => is_file,
                    Err(_err) => false,
                };
                return is_file;
            })
            .map(|p| {
                let is_dir = unsafe { is_directory(p.as_str()) }.unwrap();
                if !is_dir {
                    self.parse_section(p).map(SectionEntry::Section)
                } else {
                    self.parse_section_group(p).map(SectionEntry::SectionGroup)
                }
            })
            .collect::<Result<_>>()?;

        Ok(Notebook { entries: sections })
    }

    /// Parse a OneNote section file.
    ///
    /// The `path` argument must point to a `.one` file that contains a
    /// OneNote section.
    pub fn parse_section(&mut self, path: String) -> Result<Section> {
        log!("Parsing section: {:?}", path);
        let file_content = unsafe { read_file(path.as_str()) }.unwrap();
        let array = Uint8Array::new(&file_content);
        let data = array.to_vec();
        let packaging = OneStorePackaging::parse(&mut Reader::new(&data))?;
        let store = parse_store(&packaging)?;

        if store.schema_guid() != guid!({ 1F937CB4 - B26F - 445F - B9F8 - 17E20160E461 }) {
            return Err(ErrorKind::NotASectionFile { file: path }.into());
        }

        let filename = unsafe { get_file_name(path.as_str()) }
            .expect("file without file name")
            .as_string()
            .unwrap();
        section::parse_section(store, filename)
    }

    fn parse_section_group(&mut self, path: String) -> Result<SectionGroup> {
        let display_name = unsafe { get_file_name(path.as_str()) }
            .expect("file without file name")
            .as_string()
            .unwrap();

        if let Some(entries) = unsafe { read_dir(path.as_str()) } {
            for entry in entries {
                let ext = unsafe { get_file_extension(entry.as_str()) }
                    .unwrap()
                    .as_string()
                    .unwrap();
                if ext == ".onetoc2" {
                    return self.parse_notebook(entry).map(|group| SectionGroup {
                        display_name,
                        entries: group.entries,
                    });
                }
            }
        }

        Err(ErrorKind::TocFileMissing { dir: path }.into())
    }
}

impl Default for Parser {
    fn default() -> Self {
        Self::new()
    }
}
