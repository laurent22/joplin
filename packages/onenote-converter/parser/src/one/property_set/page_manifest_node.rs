use crate::one::property::PropertyType;
use crate::one::property::object_reference::ObjectReference;
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use crate::shared::exguid::ExGuid;
use parser_utils::errors::{ErrorKind, Result};

/// A page manifest.
///
/// See [\[MS-ONE\] 2.2.34].
///
/// [\[MS-ONE\] 2.2.34]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/284dd0c5-786f-499f-8ca3-454f85091b29
#[derive(Debug)]
pub(crate) struct Data {
    pub(crate) page: ExGuid,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::PageManifestNode.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let page = ObjectReference::parse_vec(PropertyType::ContentChildNodes, object)?
        .and_then(|ids| ids.first().copied())
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("page manifest has no page".into()))?;

    Ok(Data { page })
}
