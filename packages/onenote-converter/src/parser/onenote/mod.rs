use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::packaging::OneStorePackaging;
use crate::parser::onenote::notebook::Notebook;
use crate::parser::onenote::section::{Section, SectionEntry, SectionGroup};
use crate::parser::onestore::parse_store;
use crate::parser::reader::Reader;
use crate::utils::utils::log;
use crate::parser::utils::{exists, is_directory, read_file};
use std::ffi::OsStr;
use std::panic;
use std::path::Path;
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
    pub fn parse_notebook(&mut self, path: &Path) -> Result<Notebook> {
        log!("Parsing notebook: {:?}", path);
        let file_content = read_file(path.as_os_str().to_str().unwrap()).unwrap();
        let array = Uint8Array::new(&file_content);
        let data = array.to_vec();
        let packaging = OneStorePackaging::parse(&mut Reader::new(&data))?;
        let store = parse_store(&packaging)?;

        if store.schema_guid() != guid!({ E4DBFD38 - E5C7 - 408B - A8A1 - 0E7B421E1F5F }) {
            return Err(ErrorKind::NotATocFile {
                file: path.to_string_lossy().to_string(),
            }
            .into());
        }

        let base_dir = path.parent().expect("no base dir found");
        let sections = notebook::parse_toc(store.data_root())?
            .iter()
            .map(|name| Path::new(base_dir).join(name))
            .filter(|p| !p.ends_with("OneNote_RecycleBin"))
            .filter(|p| {
                let path_as_str = p.as_os_str().to_str().unwrap();
                let is_file = match exists(path_as_str) {
                    Ok(is_file) => is_file,
                    Err(_err) => false,
                };
                return is_file;
            })
            .map(|path| {
                let is_dir = is_directory(path.as_os_str().to_str().unwrap()).unwrap();
                if !is_dir {
                    self.parse_section(&path).map(SectionEntry::Section)
                } else {
                    self.parse_section_group(&path)
                        .map(SectionEntry::SectionGroup)
                }
            })
            .collect::<Result<_>>()?;

        Ok(Notebook { entries: sections })
    }

    /// Parse a OneNote section file.
    ///
    /// The `path` argument must point to a `.one` file that contains a
    /// OneNote section.
    pub fn parse_section(&mut self, path: &Path) -> Result<Section> {
        log!("Parsing section: {:?}", path);
        let file_content = read_file(path.as_os_str().to_str().unwrap()).unwrap();
        let array = Uint8Array::new(&file_content);
        let data = array.to_vec();
        let packaging = OneStorePackaging::parse(&mut Reader::new(&data))?;
        let store = parse_store(&packaging)?;

        if store.schema_guid() != guid!({ 1F937CB4 - B26F - 445F - B9F8 - 17E20160E461 }) {
            return Err(ErrorKind::NotASectionFile {
                file: path.to_string_lossy().to_string(),
            }
            .into());
        }

        section::parse_section(
            store,
            path.file_name()
                .expect("file without file name")
                .to_string_lossy()
                .to_string(),
        )
    }

    fn parse_section_group(&mut self, path: &Path) -> Result<SectionGroup> {
        let display_name = path
            .file_name()
            .expect("file without file name")
            .to_string_lossy()
            .to_string();

        // TODO: remove read_dir()
        // find a case where this happens
        for entry in path.read_dir()? {
            let entry = entry?;
            let is_toc = entry
                .path()
                .extension()
                .map(|ext| ext == OsStr::new("onetoc2"))
                .unwrap_or_default();

            if is_toc {
                return self
                    .parse_notebook(&entry.path())
                    .map(|group| SectionGroup {
                        display_name,
                        entries: group.entries,
                    });
            }
        }

        Err(ErrorKind::TocFileMissing {
            dir: path.as_os_str().to_string_lossy().into_owned(),
        }
        .into())
    }
}

impl Default for Parser {
    fn default() -> Self {
        Self::new()
    }
}
