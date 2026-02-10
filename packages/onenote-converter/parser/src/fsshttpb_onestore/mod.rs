//! Parsing specific to on-server .one and .onetoc2 files. This is usually the format of OneNote files
//! when downloaded from OneDrive or SharePoint.
//! See [\[MS-ONESTORE\] 2.8](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/c65f7aa8-4f0e-45dc-aabd-96db97cedbd4).

use self::packaging::OneStorePackaging;
use crate::fsshttpb::data_element::storage_index::StorageIndex;
use crate::fsshttpb::data_element::storage_manifest::StorageManifest;
use crate::fsshttpb_onestore::header::StoreHeader;
use crate::fsshttpb_onestore::object_space::ObjectSpace;
use crate::fsshttpb_onestore::revision::Revision;
use crate::onestore::OneStoreType;
use crate::onestore::object_space::ObjectSpaceRef;
use crate::shared::guid::Guid;
use crate::{onestore::OneStore, shared::cell_id::CellId};
use parser_utils::errors::{ErrorKind, Result};
use std::collections::{HashMap, HashSet};
use std::rc::Rc;

pub(crate) mod header;
pub(crate) mod mapping_table;
pub(crate) mod object;
pub(crate) mod object_space;
pub(crate) mod packaging;
pub(crate) mod revision;
mod revision_role;

#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct FssHttpbOneStore {
    schema: Guid,
    header: StoreHeader,
    data_root: Rc<ObjectSpace>,
    object_spaces: HashMap<CellId, Rc<ObjectSpace>>,
}

impl FssHttpbOneStore {
    pub fn is_onetoc2(&self) -> bool {
        self.schema == guid!({ E4DBFD38 - E5C7 - 408B - A8A1 - 0E7B421E1F5F })
    }

    pub fn is_onestore(&self) -> bool {
        self.schema == guid!({ 1F937CB4 - B26F - 445F - B9F8 - 17E20160E461 })
    }
}

impl OneStore for FssHttpbOneStore {
    fn get_type(&self) -> OneStoreType {
        if self.is_onestore() {
            OneStoreType::Section
        } else {
            OneStoreType::TableOfContents
        }
    }

    fn data_root(&self) -> ObjectSpaceRef {
        self.data_root.clone()
    }

    fn object_space(&self, id: CellId) -> Option<ObjectSpaceRef> {
        if let Some(result) = self.object_spaces.get(&id) {
            Some(result.clone())
        } else {
            None
        }
    }
}

pub(crate) fn parse_store(package: &OneStorePackaging) -> Result<FssHttpbOneStore> {
    let mut parsed_object_spaces = HashSet::new();

    // [ONESTORE] 2.7.1: Parse storage manifest
    let storage_index = package
        .data_element_package
        .find_storage_index_by_id(package.storage_index)
        .or_else(|| package.data_element_package.find_storage_index())
        .ok_or_else(|| ErrorKind::MalformedOneStoreData("storage index is missing".into()))?;
    let storage_manifest = package
        .data_element_package
        .find_storage_manifest()
        .ok_or_else(|| ErrorKind::MalformedOneStoreData("storage manifest is missing".into()))?;

    let header_cell_id = find_header_cell_id(storage_manifest)?;

    let header_cell_mapping_id = storage_index
        .find_cell_mapping_id(header_cell_id)
        .ok_or_else(|| {
            ErrorKind::MalformedOneStoreData("header cell mapping id not found".into())
        })?;

    // [ONESTORE] 2.7.2: Parse header cell
    let header_cell = package
        .data_element_package
        .find_objects(header_cell_mapping_id, &storage_index)?
        .into_iter()
        .next()
        .ok_or_else(|| {
            ErrorKind::MalformedOneStoreData("no header object in header cell".into())
        })?;

    let header = StoreHeader::parse(header_cell)?;

    parsed_object_spaces.insert(header_cell_id);

    // FIXME: document revision cache
    let mut revision_cache = HashMap::new();

    // Parse data root

    let data_root_cell_id = find_data_root_cell_id(storage_manifest)?;
    let (_, data_root) = parse_object_space(
        data_root_cell_id,
        storage_index,
        &package,
        &mut revision_cache,
    )?;

    parsed_object_spaces.insert(data_root_cell_id);

    // Parse other object spaces

    let mut object_spaces = HashMap::new();

    for mapping in storage_index.cell_mappings.values() {
        if mapping.id.is_nil() {
            continue;
        }

        if parsed_object_spaces.contains(&mapping.cell_id) {
            continue;
        }

        let (id, group) = parse_object_space(
            mapping.cell_id,
            storage_index,
            &package,
            &mut revision_cache,
        )?;
        object_spaces.insert(id, Rc::new(group));
    }

    let result = FssHttpbOneStore {
        schema: storage_manifest.id,
        header,
        data_root: Rc::new(data_root),
        object_spaces,
    };
    if !result.is_onestore() && !result.is_onetoc2() {
        Err(parser_error!(
            MalformedOneNoteData,
            "File's GUID matches the expected type for neither onetoc2 nor onestore"
        )
        .into())
    } else {
        Ok(result)
    }
}

fn parse_object_space<'a, 'b>(
    cell_id: CellId,
    storage_index: &'a StorageIndex,
    package: &'a OneStorePackaging,
    revision_cache: &'b mut HashMap<CellId, Revision>,
) -> Result<(CellId, ObjectSpace)> {
    let mapping = storage_index
        .cell_mappings
        .get(&cell_id)
        .ok_or_else(|| ErrorKind::MalformedOneStoreData("cell mapping not found".into()))?;

    ObjectSpace::parse(mapping, storage_index, package, revision_cache)
}

fn find_header_cell_id(manifest: &StorageManifest) -> Result<CellId> {
    manifest
        .roots
        .get(&exguid!({{1A5A319C-C26B-41AA-B9C5-9BD8C44E07D4}, 1}))
        .copied()
        .ok_or_else(|| ErrorKind::MalformedOneStoreData("no header cell root".into()).into())
}

fn find_data_root_cell_id(manifest: &StorageManifest) -> Result<CellId> {
    manifest
        .roots
        .get(&exguid!({{84DEFAB9-AAA3-4A0D-A3A8-520C77AC7073}, 2}))
        .copied()
        .ok_or_else(|| ErrorKind::MalformedOneStoreData("no header cell root".into()).into())
}
