//! The property sets describing OneNote objects we can parse.
//!
//! See [\[MS-ONE\] 2.1.13] for the list of properties the OneNote file format specifies.
//!
//! [\[MS-ONE\] 2.1.13]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/73d98105-f194-4c05-a795-09840a6d24bf

use crate::parser::onestore::types::jcid::JcId;
use enum_primitive_derive::Primitive;
use num_traits::FromPrimitive;

pub(crate) mod embedded_file_container;
pub(crate) mod embedded_file_node;
pub(crate) mod embedded_ink_container;
pub(crate) mod iframe_node;
pub(crate) mod image_node;
pub(crate) mod ink_container;
pub(crate) mod ink_data_node;
pub(crate) mod ink_stroke_node;
pub(crate) mod note_tag_container;
pub(crate) mod note_tag_shared_definition_container;
pub(crate) mod number_list_node;
pub(crate) mod outline_element_node;
pub(crate) mod outline_group;
pub(crate) mod outline_node;
pub(crate) mod page_manifest_node;
pub(crate) mod page_metadata;
pub(crate) mod page_node;
pub(crate) mod page_series_node;
pub(crate) mod paragraph_style_object;
pub(crate) mod picture_container;
pub(crate) mod rich_text_node;
pub(crate) mod section_metadata_node;
pub(crate) mod section_node;
pub(crate) mod stroke_properties_node;
pub(crate) mod table_cell_node;
pub(crate) mod table_node;
pub(crate) mod table_row_node;
pub(crate) mod title_node;
pub(crate) mod toc_container;

#[derive(Debug, Copy, Clone, Primitive)]
pub(crate) enum PropertySetId {
    AuthorContainer = 0x00120001,
    EmbeddedFileContainer = 0x00080036,
    EmbeddedFileNode = 0x00060035,
    ImageNode = 0x00060011,
    NoteTagSharedDefinitionContainer = 0x00120043,
    NumberListNode = 0x00060012,
    OutlineElementNode = 0x0006000D,
    OutlineGroup = 0x00060019,
    OutlineNode = 0x0006000C,
    PageManifestNode = 0x00060037,
    PageMetadata = 0x00020030,
    PageNode = 0x0006000B,
    PageSeriesNode = 0x00060008,
    ParagraphStyleObject = 0x0012004D,
    PictureContainer = 0x00080039,
    RevisionMetadata = 0x00020044,
    RichTextNode = 0x0006000E,
    SectionMetadata = 0x00020031,
    SectionNode = 0x00060007,
    TableCellNode = 0x00060024,
    TableNode = 0x00060022,
    TableRowNode = 0x00060023,
    TitleNode = 0x0006002C,
    TocContainer = 0x00020001,

    // Undocumented:
    XpsContainer = 0x0008003A,
    InkContainer = 0x00060014,
    InkDataNode = 0x0002003B,
    InkStrokeNode = 0x00020047,
    StrokePropertiesNode = 0x00120048,
    IFrameNode = 0x00060058,
}

impl PropertySetId {
    pub(crate) fn as_jcid(&self) -> JcId {
        JcId(*self as u32)
    }

    pub(crate) fn from_jcid(id: JcId) -> Option<PropertySetId> {
        PropertySetId::from_u32(id.0)
    }
}
