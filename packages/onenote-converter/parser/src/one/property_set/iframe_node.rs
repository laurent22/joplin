use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use parser_utils::errors::{ErrorKind, Result};

/// An ink data container.
pub(crate) struct Data {
    pub(crate) embed_type: Option<u32>,
    pub(crate) source_url: String,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::IFrameNode.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let embed_type = simple::parse_u32(PropertyType::ImageEmbedType, object)?;
    let source_url = simple::parse_string(PropertyType::ImageEmbeddedUrl, object)?
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("iframe has no source URL".into()))?;

    Ok(Data {
        embed_type,
        source_url,
    })
}
