use crate::onenote::notebook::Notebook;
use crate::onenote::section::{Section, SectionEntry, SectionGroup};
use crate::onestore::{OneStoreType, parse_onestore};
use parser_utils::errors::{ErrorKind, Result};
use parser_utils::{fs_driver, log, reader::Reader};

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
pub(crate) mod text_region;

/// The OneNote file parser.
pub struct Parser;

impl Parser {
    /// Create a new OneNote file parser.
    pub fn new() -> Parser {
        Parser {}
    }

    /// Parse a OneNote notebook.
    ///
    /// The `path` argument must point to a `.onetoc2` file. This will parse the
    /// table of contents of the notebook as well as all contained
    /// sections from the folder that the table of contents file is in.
    pub fn parse_notebook(&mut self, path: String) -> Result<Notebook> {
        log!("Parsing notebook: {:?}", path);
        let data = fs_driver().read_file(&path)?;
        let store = parse_onestore(&mut Reader::new(&data))?;

        if store.get_type() != OneStoreType::TableOfContents {
            return Err(ErrorKind::NotATocFile { file: path }.into());
        }

        let base_dir = fs_driver().get_dir_name(&path);
        let sections = notebook::parse_toc(store.data_root())?
            .iter()
            .map(|name| fs_driver().join(&base_dir, name))
            .filter(|p| !p.contains("OneNote_RecycleBin"))
            .filter(|p| {
                let is_file = match fs_driver().exists(p) {
                    Ok(is_file) => is_file,
                    Err(_err) => false,
                };
                return is_file;
            })
            .map(|p| {
                let is_dir = fs_driver().is_directory(&p)?;
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
        let data = fs_driver().read_file(path.as_str())?;
        self.parse_section_from_data(&data, &path)
    }

    /// Parse a OneNote section file from a byte array.
    /// The [path] is used to provide debugging information and determine
    /// the name of the section file.
    pub fn parse_section_from_data(&mut self, data: &[u8], path: &str) -> Result<Section> {
        let store = parse_onestore(&mut Reader::new(&data))?;

        if store.get_type() != OneStoreType::Section {
            return Err(ErrorKind::NotASectionFile { file: String::from(path) }.into());
        }

        let filename = fs_driver()
            .get_file_name(&path)
            .expect("file without file name");
        section::parse_section(store, filename)
    }

    fn parse_section_group(&mut self, path: String) -> Result<SectionGroup> {
        let display_name = fs_driver()
            .get_file_name(path.as_str())
            .expect("file without file name");

        if let Ok(entries) = fs_driver().read_dir(&path) {
            for entry in entries {
                let ext = fs_driver().get_file_extension(&entry);
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
