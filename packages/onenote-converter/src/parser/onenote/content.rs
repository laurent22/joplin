use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onenote::embedded_file::{parse_embedded_file, EmbeddedFile};
use crate::parser::onenote::image::{parse_image, Image};
use crate::parser::onenote::ink::{parse_ink, Ink};
use crate::parser::onenote::rich_text::{parse_rich_text, RichText};
use crate::parser::onenote::table::{parse_table, Table};
use crate::parser::onestore::object_space::ObjectSpace;

/// The content of an outline.
#[derive(Clone, Debug)]
pub enum Content {
    /// A rich-text block.
    RichText(RichText),

    /// A table.
    Table(Table),

    /// An embedded image.
    Image(Image),

    /// An embedded file.
    EmbeddedFile(EmbeddedFile),

    /// An ink drawing
    Ink(Ink),

    /// Content of unknown type.
    Unknown,
}

impl Content {
    /// Return the rich-text data if it's a rich-text content block.
    pub fn rich_text(&self) -> Option<&RichText> {
        if let Content::RichText(rich_text) = self {
            Some(rich_text)
        } else {
            None
        }
    }

    /// Return the table data if it's a table content block.
    pub fn table(&self) -> Option<&Table> {
        if let Content::Table(table) = self {
            Some(table)
        } else {
            None
        }
    }

    /// Return the image data if it's a image content block.
    pub fn image(&self) -> Option<&Image> {
        if let Content::Image(image) = self {
            Some(image)
        } else {
            None
        }
    }

    /// Return the embedded file data if it's a embedded file content block.
    pub fn embedded_file(&self) -> Option<&EmbeddedFile> {
        if let Content::EmbeddedFile(file) = self {
            Some(file)
        } else {
            None
        }
    }

    /// Return the ink data if it's an ink content.
    pub fn ink(&self) -> Option<&Ink> {
        if let Content::Ink(ink) = self {
            Some(ink)
        } else {
            None
        }
    }
}

pub(crate) fn parse_content(content_id: ExGuid, space: &ObjectSpace) -> Result<Content> {
    let content_type = space
        .get_object(content_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("page content is missing".into()))?
        .id();
    let id = PropertySetId::from_jcid(content_type).ok_or_else(|| {
        ErrorKind::MalformedOneNoteData(
            format!("invalid property set id: 0x{:X}", content_type.0).into(),
        )
    })?;

    let content = match id {
        PropertySetId::ImageNode => Content::Image(parse_image(content_id, space)?),
        PropertySetId::EmbeddedFileNode => {
            Content::EmbeddedFile(parse_embedded_file(content_id, space)?)
        }
        PropertySetId::RichTextNode => Content::RichText(parse_rich_text(content_id, space)?),
        PropertySetId::TableNode => Content::Table(parse_table(content_id, space)?),
        PropertySetId::InkContainer => Content::Ink(parse_ink(content_id, space)?),
        _ => Content::Unknown,
    };

    Ok(content)
}
