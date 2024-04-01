use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::color::Color;
use crate::parser::one::property_set::{section_metadata_node, section_node};
use crate::parser::onenote::page_series::{parse_page_series, PageSeries};
use crate::parser::onestore::object_space::ObjectSpace;
use crate::parser::onestore::OneStore;

/// An entry in a section list.
#[allow(missing_docs)]
#[derive(Clone, Debug)]
pub enum SectionEntry {
    Section(Section),
    SectionGroup(SectionGroup),
}

/// A OneNote section.
///
/// See [\[MS-ONE\] 1.3.1] and [\[MS-ONE\] 2.2.17].
///
/// [\[MS-ONE\] 1.3.1]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/1603b29c-1c9f-4e85-b9b9-59684122374a
/// [\[MS-ONE\] 2.2.17]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/6913913f-b7d1-4b29-ab09-231ea3835ac2
#[derive(Clone, Debug)]
pub struct Section {
    display_name: String,
    page_series: Vec<PageSeries>,
    color: Option<Color>,
}

impl Section {
    /// The section name.
    pub fn display_name(&self) -> &str {
        &self.display_name
    }

    /// The page series contained within the section.
    pub fn page_series(&self) -> &[PageSeries] {
        &self.page_series
    }

    /// The color of the section.
    pub fn color(&self) -> Option<Color> {
        self.color
    }
}

/// A group of sections.
#[derive(Clone, Debug)]
pub struct SectionGroup {
    pub(crate) display_name: String,
    pub(crate) entries: Vec<SectionEntry>,
}

impl SectionGroup {
    /// The group name.
    pub fn display_name(&self) -> &str {
        &self.display_name
    }

    /// The sections contained within the group.
    pub fn entries(&self) -> &[SectionEntry] {
        &self.entries
    }
}

pub(crate) fn parse_section(store: OneStore, filename: String) -> Result<Section> {
    let metadata = parse_metadata(store.data_root())?;
    let content = parse_content(store.data_root())?;

    let display_name = metadata
        .display_name
        .unwrap_or(filename)
        .trim_end_matches(".one")
        .to_string();

    let page_series = content
        .page_series
        .into_iter()
        .map(|page_series_id| parse_page_series(page_series_id, &store))
        .collect::<Result<_>>()?;

    Ok(Section {
        display_name,
        page_series,
        color: metadata.color,
    })
}

fn parse_content(space: &ObjectSpace) -> Result<section_node::Data> {
    let content_root_id = space
        .content_root()
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("section has no content root".into()))?;
    let content_object = space.get_object(content_root_id).ok_or_else(|| {
        ErrorKind::MalformedOneNoteData("section content object is missing".into())
    })?;

    section_node::parse(content_object)
}

fn parse_metadata(space: &ObjectSpace) -> Result<section_metadata_node::Data> {
    let metadata_root_id = space
        .metadata_root()
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("section has no metadata root".into()))?;
    let metadata_object = space.get_object(metadata_root_id).ok_or_else(|| {
        ErrorKind::MalformedOneNoteData("section metadata object is missing".into())
    })?;

    section_metadata_node::parse(metadata_object)
}
