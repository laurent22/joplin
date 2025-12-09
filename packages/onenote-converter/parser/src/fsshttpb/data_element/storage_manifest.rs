use crate::fsshttpb::data::object_types::ObjectType;
use crate::fsshttpb::data::stream_object::ObjectHeader;
use crate::fsshttpb::data_element::DataElement;
use crate::shared::cell_id::CellId;
use crate::shared::exguid::ExGuid;
use crate::shared::guid::Guid;
use parser_utils::Reader;
use parser_utils::errors::Result;
use parser_utils::parse::ParseHttpb;
use std::collections::HashMap;

/// A storage manifest.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.12.3]
///
/// [\[MS-FSSHTTPB\] 2.2.1.12.3]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/a681199b-45f3-4378-b929-fb13e674ac5c
#[derive(Debug)]
pub(crate) struct StorageManifest {
    pub(crate) id: Guid,
    pub(crate) roots: HashMap<ExGuid, CellId>,
}

impl DataElement {
    pub(crate) fn parse_storage_manifest(reader: Reader) -> Result<StorageManifest> {
        ObjectHeader::try_parse_16(reader, ObjectType::StorageManifest)?;

        let id = Guid::parse(reader)?;

        let mut roots = HashMap::new();

        loop {
            if ObjectHeader::has_end_8(reader, ObjectType::DataElement)? {
                break;
            }

            ObjectHeader::try_parse_16(reader, ObjectType::StorageManifestRoot)?;

            let root_manifest = <ExGuid as ParseHttpb>::parse(reader)?;
            let cell = CellId::parse(reader)?;

            roots.insert(root_manifest, cell);
        }

        ObjectHeader::try_parse_end_8(reader, ObjectType::DataElement)?;

        Ok(StorageManifest { id, roots })
    }
}
