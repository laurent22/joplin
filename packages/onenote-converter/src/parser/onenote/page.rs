use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::layout_alignment::LayoutAlignment;
use crate::parser::one::property_set::{page_manifest_node, page_metadata, page_node, title_node};
use crate::parser::onenote::outline::{parse_outline, Outline};
use crate::parser::onenote::page_content::{parse_page_content, PageContent};
use crate::parser::onestore::object_space::ObjectSpace;

/// A page.
///
/// See [\[MS-ONE\] 1.3.2] and [\[MS-ONE\] 2.2.19].
///
/// [\[MS-ONE\] 1.3.2]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/2dd687ac-f36b-4723-b959-4d60c8a90ca9
/// [\[MS-ONE\] 2.2.19]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e381b7c7-b434-43a2-ba23-0d08bafd281a
#[derive(Clone, Debug)]
pub struct Page {
    title: Option<Title>,
    level: i32,
    author: Option<String>,
    height: Option<f32>,
    contents: Vec<PageContent>,
}

impl Page {
    /// The page's title element.
    ///
    /// See [\[MS-ONE\] 2.2.64].
    ///
    /// [\[MS-ONE\] 2.2.64]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/00f0b68b-db49-4aea-9ad9-7c8e68e5c95d
    pub fn title(&self) -> Option<&Title> {
        self.title.as_ref()
    }

    /// The page's level in the section page tree.
    ///
    /// See [\[MS-ONE\] 2.3.74].
    ///
    /// [\[MS-ONE\] 2.3.74]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/a8632c90-e74a-4ef6-8852-707d4c8817cd
    pub fn level(&self) -> i32 {
        self.level
    }

    /// The page's author.
    pub fn author(&self) -> Option<&str> {
        self.author.as_deref()
    }

    /// The page's height.
    ///
    /// See [\[MS-ONE\] 2.3.7].
    ///
    /// [\[MS-ONE\] 2.3.7]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e5d0b5e0-0702-42af-8299-0e27c895ba7e
    pub fn height(&self) -> Option<f32> {
        self.height
    }

    /// The page contents.
    pub fn contents(&self) -> &[PageContent] {
        &self.contents
    }

    /// The page's title text.
    ///
    /// This is calculated using a heuristic similar to the one OneNote uses.
    pub fn title_text(&self) -> Option<&str> {
        self.title
            .as_ref()
            .and_then(|title| title.contents.first())
            .and_then(Self::outline_text)
            .or_else(|| {
                self.contents
                    .iter()
                    .filter_map(|page_content| page_content.outline())
                    .filter_map(Self::outline_text)
                    .next()
            })
    }

    fn outline_text(outline: &Outline) -> Option<&str> {
        outline
            .items
            .first()
            .and_then(|outline_item| outline_item.element())
            .and_then(|outline_element| outline_element.contents.first())
            .and_then(|content| content.rich_text())
            .and_then(|text| Some(&*text.text).filter(|s| !s.is_empty()))
    }
}

/// A page title.
///
/// See [\[MS-ONE\] 2.2.29].
///
/// [\[MS-ONE\] 2.2.29]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/08bd4fd5-59fb-4568-9c82-d2d5280eced8

#[derive(Clone, Debug)]
pub struct Title {
    pub(crate) contents: Vec<Outline>,
    pub(crate) offset_horizontal: f32,
    pub(crate) offset_vertical: f32,
    pub(crate) layout_alignment_in_parent: Option<LayoutAlignment>,
    pub(crate) layout_alignment_self: Option<LayoutAlignment>,
}

impl Title {
    /// The title contents.
    pub fn contents(&self) -> &[Outline] {
        &self.contents
    }

    /// The horizontal offset from the page origin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.18].
    ///
    /// [\[MS-ONE\] 2.3.18]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/5fb9e84a-c9e9-4537-ab14-e5512f24669a
    pub fn offset_horizontal(&self) -> f32 {
        self.offset_horizontal
    }

    /// The vertical offset from the page origin in half-inch increments.
    ///
    /// See [\[MS-ONE\] 2.3.19].
    ///
    /// [\[MS-ONE\] 2.3.19]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/5c4992ba-1db5-43e9-83dd-7299c562104d
    pub fn offset_vertical(&self) -> f32 {
        self.offset_vertical
    }

    /// The title's alignment relative to the containing outline element (if present).
    ///
    /// See [\[MS-ONE\] 2.3.27].
    ///
    /// [\[MS-ONE\] 2.3.27]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/61fa50be-c355-4b8d-ac01-761a2f7f66c0
    pub fn layout_alignment_in_parent(&self) -> Option<LayoutAlignment> {
        self.layout_alignment_in_parent
    }

    /// The title's alignment.
    ///
    /// See [\[MS-ONE\] 2.3.33].
    ///
    /// [\[MS-ONE\] 2.3.33]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/4e7fe9db-2fdb-4239-b291-dc4b909c94ad
    pub fn layout_alignment_self(&self) -> Option<LayoutAlignment> {
        self.layout_alignment_self
    }
}

pub(crate) fn parse_page(page_space: &ObjectSpace) -> Result<Page> {
    let metadata = parse_metadata(page_space)?;
    let manifest = parse_manifest(page_space)?;

    let data = parse_data(manifest, page_space)?;

    let title = data
        .title
        .map(|id| parse_title(id, page_space))
        .transpose()?;
    let level = metadata.page_level;

    let contents = data
        .content
        .into_iter()
        .map(|content_id| parse_page_content(content_id, page_space))
        .collect::<Result<_>>()?;

    Ok(Page {
        title,
        level,
        author: data.author.map(|author| author.into_value()),
        height: data.page_height,
        contents,
    })
}

fn parse_title(title_id: ExGuid, space: &ObjectSpace) -> Result<Title> {
    let title_object = space
        .get_object(title_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("title object is missing".into()))?;
    let title = title_node::parse(title_object)?;
    let contents = title
        .children
        .into_iter()
        .map(|outline_id| parse_outline(outline_id, space))
        .collect::<Result<_>>()?;

    Ok(Title {
        contents,
        offset_horizontal: title.offset_horizontal,
        offset_vertical: title.offset_vertical,
        layout_alignment_in_parent: title.layout_alignment_in_parent,
        layout_alignment_self: title.layout_alignment_self,
    })
}

fn parse_data(manifest: page_manifest_node::Data, space: &ObjectSpace) -> Result<page_node::Data> {
    let page_id = manifest.page;
    let page_object = space
        .get_object(page_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("page object is missing".into()))?;

    page_node::parse(page_object)
}

fn parse_manifest(space: &ObjectSpace) -> Result<page_manifest_node::Data> {
    let page_manifest_id = space
        .content_root()
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("page content id is missing".into()))?;
    let page_manifest_object = space
        .get_object(page_manifest_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("page object is missing".into()))?;

    page_manifest_node::parse(page_manifest_object)
}

fn parse_metadata(space: &ObjectSpace) -> Result<page_metadata::Data> {
    let metadata_id = space
        .metadata_root()
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("page metadata id is missing".into()))?;
    let metadata_object = space
        .get_object(metadata_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("page metadata object is missing".into()))?;

    page_metadata::parse(metadata_object)
}
