use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::cell_id::CellId;
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::fsshttpb::data::object_types::ObjectType;
use crate::parser::fsshttpb::data::serial_number::SerialNumber;
use crate::parser::fsshttpb::data::stream_object::ObjectHeader;
use crate::parser::fsshttpb::data_element::DataElement;
use crate::parser::Reader;
use std::collections::HashMap;

/// A storage index.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.12.2]
///
/// [\[MS-FSSHTTPB\] 2.2.1.12.2]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/f5724986-bd0f-488d-9b85-7d5f954d8e9a
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct StorageIndex {
    pub(crate) manifest_mappings: Vec<StorageIndexManifestMapping>,
    pub(crate) cell_mappings: HashMap<CellId, StorageIndexCellMapping>,
    pub(crate) revision_mappings: HashMap<ExGuid, StorageIndexRevisionMapping>,
}

impl StorageIndex {
    pub(crate) fn find_cell_mapping_id(&self, cell_id: CellId) -> Option<ExGuid> {
        self.cell_mappings.get(&cell_id).map(|mapping| mapping.id)
    }

    pub(crate) fn find_revision_mapping_id(&self, id: ExGuid) -> Option<ExGuid> {
        self.revision_mappings
            .get(&id)
            .map(|mapping| mapping.revision_mapping)
    }
}

/// A storage indexes manifest mapping.
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct StorageIndexManifestMapping {
    pub(crate) mapping_id: ExGuid,
    pub(crate) serial: SerialNumber,
}

/// A storage indexes cell mapping.
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct StorageIndexCellMapping {
    pub(crate) cell_id: CellId,
    pub(crate) id: ExGuid,
    pub(crate) serial: SerialNumber,
}

/// A storage indexes revision mapping.
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct StorageIndexRevisionMapping {
    pub(crate) revision_mapping: ExGuid,
    pub(crate) serial: SerialNumber,
}

impl DataElement {
    pub(crate) fn parse_storage_index(reader: Reader) -> Result<StorageIndex> {
        let mut manifest_mappings = vec![];
        let mut cell_mappings = HashMap::new();
        let mut revision_mappings = HashMap::new();

        loop {
            if ObjectHeader::has_end_8(reader, ObjectType::DataElement)? {
                break;
            }

            let object_header = ObjectHeader::parse_16(reader)?;
            match object_header.object_type {
                ObjectType::StorageIndexManifestMapping => {
                    manifest_mappings.push(Self::parse_storage_index_manifest_mapping(reader)?)
                }
                ObjectType::StorageIndexCellMapping => {
                    let (id, mapping) = Self::parse_storage_index_cell_mapping(reader)?;

                    cell_mappings.insert(id, mapping);
                }
                ObjectType::StorageIndexRevisionMapping => {
                    let (id, mapping) = Self::parse_storage_index_revision_mapping(reader)?;

                    revision_mappings.insert(id, mapping);
                }
                _ => {
                    return Err(ErrorKind::MalformedFssHttpBData(
                        format!("unexpected object type: {:x}", object_header.object_type).into(),
                    )
                    .into())
                }
            }
        }

        ObjectHeader::try_parse_end_8(reader, ObjectType::DataElement)?;

        Ok(StorageIndex {
            manifest_mappings,
            cell_mappings,
            revision_mappings,
        })
    }

    fn parse_storage_index_manifest_mapping(reader: Reader) -> Result<StorageIndexManifestMapping> {
        let mapping_id = ExGuid::parse(reader)?;
        let serial = SerialNumber::parse(reader)?;

        Ok(StorageIndexManifestMapping { mapping_id, serial })
    }

    fn parse_storage_index_cell_mapping(
        reader: Reader,
    ) -> Result<(CellId, StorageIndexCellMapping)> {
        let cell_id = CellId::parse(reader)?;
        let id = ExGuid::parse(reader)?;
        let serial = SerialNumber::parse(reader)?;

        let mapping = StorageIndexCellMapping {
            cell_id,
            id,
            serial,
        };

        Ok((cell_id, mapping))
    }

    fn parse_storage_index_revision_mapping(
        reader: Reader,
    ) -> Result<(ExGuid, StorageIndexRevisionMapping)> {
        let id = ExGuid::parse(reader)?;
        let revision_mapping = ExGuid::parse(reader)?;
        let serial = SerialNumber::parse(reader)?;

        let mapping = StorageIndexRevisionMapping {
            revision_mapping,
            serial,
        };

        Ok((id, mapping))
    }
}
