use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::compact_u64::CompactU64;
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::fsshttpb::data::object_types::ObjectType;
use crate::parser::fsshttpb::data::serial_number::SerialNumber;
use crate::parser::fsshttpb::data::stream_object::ObjectHeader;
use crate::parser::fsshttpb::data_element::data_element_fragment::DataElementFragment;
use crate::parser::fsshttpb::data_element::object_data_blob::ObjectDataBlob;
use crate::parser::fsshttpb::data_element::object_group::ObjectGroup;
use crate::parser::fsshttpb::data_element::revision_manifest::RevisionManifest;
use crate::parser::fsshttpb::data_element::storage_index::StorageIndex;
use crate::parser::fsshttpb::data_element::storage_manifest::StorageManifest;
use crate::parser::Reader;
use std::collections::HashMap;
use std::fmt::Debug;

pub(crate) mod cell_manifest;
pub(crate) mod data_element_fragment;
pub(crate) mod object_data_blob;
pub(crate) mod object_group;
pub(crate) mod revision_manifest;
pub(crate) mod storage_index;
pub(crate) mod storage_manifest;

/// A FSSHTTPB data element package.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.12].
///
/// [\[MS-FSSHTTPB\] 2.2.1.12]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/99a25464-99b5-4262-a964-baabed2170eb
#[derive(Debug)]
pub(crate) struct DataElementPackage {
    pub(crate) storage_indexes: HashMap<ExGuid, StorageIndex>,
    pub(crate) storage_manifests: HashMap<ExGuid, StorageManifest>,
    pub(crate) cell_manifests: HashMap<ExGuid, ExGuid>,
    pub(crate) revision_manifests: HashMap<ExGuid, RevisionManifest>,
    pub(crate) object_groups: HashMap<ExGuid, ObjectGroup>,
    pub(crate) data_element_fragments: HashMap<ExGuid, DataElementFragment>,
    pub(crate) object_data_blobs: HashMap<ExGuid, ObjectDataBlob>,
}

impl DataElementPackage {
    pub(crate) fn parse(reader: Reader) -> Result<DataElementPackage> {
        ObjectHeader::try_parse_16(reader, ObjectType::DataElementPackage)?;

        if reader.get_u8()? != 0 {
            return Err(ErrorKind::MalformedFssHttpBData("invalid padding byte".into()).into());
        }

        let mut package = DataElementPackage {
            storage_indexes: Default::default(),
            storage_manifests: Default::default(),
            cell_manifests: Default::default(),
            revision_manifests: Default::default(),
            object_groups: Default::default(),
            data_element_fragments: Default::default(),
            object_data_blobs: Default::default(),
        };

        loop {
            if ObjectHeader::has_end_8(reader, ObjectType::DataElementPackage)? {
                break;
            }

            DataElement::parse(reader, &mut package)?
        }

        ObjectHeader::try_parse_end_8(reader, ObjectType::DataElementPackage)?;

        Ok(package)
    }

    /// Look up the object groups referenced by a cell.
    pub(crate) fn find_objects(
        &self,
        cell: ExGuid,
        storage_index: &StorageIndex,
    ) -> Result<Vec<&ObjectGroup>> {
        let revision_id = self
            .find_cell_revision_id(cell)
            .ok_or_else(|| ErrorKind::MalformedFssHttpBData("cell revision id not found".into()))?;
        let revision_mapping_id = storage_index
            .find_revision_mapping_id(revision_id)
            .ok_or_else(|| {
                ErrorKind::MalformedFssHttpBData("revision mapping id not found".into())
            })?;
        let revision_manifest = self
            .find_revision_manifest(revision_mapping_id)
            .ok_or_else(|| {
                ErrorKind::MalformedFssHttpBData("revision manifest not found".into())
            })?;

        revision_manifest
            .group_references
            .iter()
            .map(|reference| {
                self.find_object_group(*reference).ok_or_else(|| {
                    ErrorKind::MalformedFssHttpBData("object group not found".into()).into()
                })
            })
            .collect::<Result<_>>()
    }

    /// Look up a blob by its ID.
    pub(crate) fn find_blob(&self, id: ExGuid) -> Option<&[u8]> {
        self.object_data_blobs.get(&id).map(|blob| blob.value())
    }

    /// Find the first storage index.
    pub(crate) fn find_storage_index(&self) -> Option<&StorageIndex> {
        self.storage_indexes.values().next()
    }

    /// Find the first storage manifest.
    pub(crate) fn find_storage_manifest(&self) -> Option<&StorageManifest> {
        self.storage_manifests.values().next()
    }

    /// Look up a cell revision ID by the cell's manifest ID.
    pub(crate) fn find_cell_revision_id(&self, id: ExGuid) -> Option<ExGuid> {
        self.cell_manifests.get(&id).copied()
    }

    /// Look up a revision manifest by its ID.
    pub(crate) fn find_revision_manifest(&self, id: ExGuid) -> Option<&RevisionManifest> {
        self.revision_manifests.get(&id)
    }

    /// Look up an object group by its ID.
    pub(crate) fn find_object_group(&self, id: ExGuid) -> Option<&ObjectGroup> {
        self.object_groups.get(&id)
    }
}

/// A parser for a single data element.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.12.1]
///
/// [\[MS-FSSHTTPB\] 2.2.1.12.1]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/f0901ac0-4f26-413f-805b-a6830781f64c
#[derive(Debug)]
pub(crate) struct DataElement;

impl DataElement {
    pub(crate) fn parse(reader: Reader, package: &mut DataElementPackage) -> Result<()> {
        ObjectHeader::try_parse_16(reader, ObjectType::DataElement)?;

        let id = ExGuid::parse(reader)?;
        let _serial = SerialNumber::parse(reader)?;
        let element_type = CompactU64::parse(reader)?;

        match element_type.value() {
            0x01 => {
                package
                    .storage_indexes
                    .insert(id, Self::parse_storage_index(reader)?);
            }
            0x02 => {
                package
                    .storage_manifests
                    .insert(id, Self::parse_storage_manifest(reader)?);
            }
            0x03 => {
                package
                    .cell_manifests
                    .insert(id, Self::parse_cell_manifest(reader)?);
            }
            0x04 => {
                package
                    .revision_manifests
                    .insert(id, Self::parse_revision_manifest(reader)?);
            }
            0x05 => {
                package
                    .object_groups
                    .insert(id, Self::parse_object_group(reader)?);
            }
            0x06 => {
                package
                    .data_element_fragments
                    .insert(id, Self::parse_data_element_fragment(reader)?);
            }
            0x0A => {
                package
                    .object_data_blobs
                    .insert(id, Self::parse_object_data_blob(reader)?);
            }
            x => {
                return Err(ErrorKind::MalformedFssHttpBData(
                    format!("invalid element type: 0x{:X}", x).into(),
                )
                .into())
            }
        }

        Ok(())
    }
}
