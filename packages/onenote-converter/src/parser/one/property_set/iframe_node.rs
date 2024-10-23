use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// An ink data container.
pub(crate) struct Data {
    pub(crate) embed_type: Option<u32>,
    pub(crate) source_url: String,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::IFrameNode.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let embed_type = simple::parse_u32(PropertyType::ImageEmbedType, object)?;
    let source_url = simple::parse_string(PropertyType::ImageEmbeddedUrl, object)?
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("iframe has no source URL".into()))?;

    Ok(Data {
        embed_type,
        source_url,
    })
}
