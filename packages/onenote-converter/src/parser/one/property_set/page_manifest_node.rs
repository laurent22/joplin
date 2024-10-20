use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::one::property::object_reference::ObjectReference;
use crate::parser::one::property::PropertyType;
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

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
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let page = ObjectReference::parse_vec(PropertyType::ContentChildNodes, object)?
        .and_then(|ids| ids.first().copied())
        .ok_or_else(|| ErrorKind::MalformedOneNoteFileData("page manifest has no page".into()))?;

    Ok(Data { page })
}
