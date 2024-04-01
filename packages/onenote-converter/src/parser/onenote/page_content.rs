use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onenote::embedded_file::{parse_embedded_file, EmbeddedFile};
use crate::parser::onenote::image::{parse_image, Image};
use crate::parser::onenote::ink::{parse_ink, Ink};
use crate::parser::onenote::outline::{parse_outline, Outline};
use crate::parser::onestore::object_space::ObjectSpace;

/// The contents of a page.
#[allow(missing_docs)]
#[derive(Clone, Debug)]
pub enum PageContent {
    Outline(Outline),
    Image(Image),
    EmbeddedFile(EmbeddedFile),
    Ink(Ink),
    Unknown,
}

impl PageContent {
    /// Return the outline data if it's an outline content.
    pub fn outline(&self) -> Option<&Outline> {
        if let PageContent::Outline(outline) = self {
            Some(outline)
        } else {
            None
        }
    }

    /// Return the image data if it's an image content.
    pub fn image(&self) -> Option<&Image> {
        if let PageContent::Image(image) = self {
            Some(image)
        } else {
            None
        }
    }

    /// Return the embedded file data if it's an embedded file content.
    pub fn embedded_file(&self) -> Option<&EmbeddedFile> {
        if let PageContent::EmbeddedFile(embedded_file) = self {
            Some(embedded_file)
        } else {
            None
        }
    }

    /// Return the ink data if it's an ink content.
    pub fn ink(&self) -> Option<&Ink> {
        if let PageContent::Ink(ink) = self {
            Some(ink)
        } else {
            None
        }
    }
}

pub(crate) fn parse_page_content(content_id: ExGuid, space: &ObjectSpace) -> Result<PageContent> {
    let content_type = space
        .get_object(content_id)
        .ok_or_else(|| ErrorKind::MalformedOneNoteData("page content is missing".into()))?
        .id();
    let id = PropertySetId::from_jcid(content_type).ok_or_else(|| {
        ErrorKind::MalformedOneNoteData(
            format!("invalid property set id: {:?}", content_type).into(),
        )
    })?;

    let content = match id {
        PropertySetId::ImageNode => PageContent::Image(parse_image(content_id, space)?),
        PropertySetId::EmbeddedFileNode => {
            PageContent::EmbeddedFile(parse_embedded_file(content_id, space)?)
        }
        PropertySetId::OutlineNode => PageContent::Outline(parse_outline(content_id, space)?),
        PropertySetId::InkContainer => PageContent::Ink(parse_ink(content_id, space)?),
        _ => PageContent::Unknown,
    };

    Ok(content)
}
