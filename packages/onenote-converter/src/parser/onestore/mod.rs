use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::cell_id::CellId;
use crate::parser::fsshttpb::data_element::storage_index::StorageIndex;
use crate::parser::fsshttpb::data_element::storage_manifest::StorageManifest;
use crate::parser::fsshttpb::packaging::OneStorePackaging;
use crate::parser::onestore::header::StoreHeader;
use crate::parser::onestore::object_space::ObjectSpace;
use crate::parser::onestore::revision::Revision;
use crate::parser::shared::guid::Guid;
use std::collections::{HashMap, HashSet};

pub(crate) mod header;
pub(crate) mod mapping_table;
pub(crate) mod object;
pub(crate) mod object_space;
pub(crate) mod revision;
mod revision_role;
pub(crate) mod types;

#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct OneStore<'a> {
    schema: Guid,
    header: StoreHeader,
    data_root: ObjectSpace<'a>,
    object_spaces: HashMap<CellId, ObjectSpace<'a>>,
}

impl<'a> OneStore<'a> {
    pub fn schema_guid(&self) -> Guid {
        self.schema
    }

    pub(crate) fn data_root(&'a self) -> &'a ObjectSpace {
        &self.data_root
    }

    pub(crate) fn object_space(&'a self, space_id: CellId) -> Option<&'a ObjectSpace<'a>> {
        self.object_spaces.get(&space_id)
    }
}

pub(crate) fn parse_store(package: &OneStorePackaging) -> Result<OneStore> {
    let mut parsed_object_spaces = HashSet::new();

    // [ONESTORE] 2.7.1: Parse storage manifest
    let storage_index = package
        .data_element_package
        .find_storage_index()
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
        object_spaces.insert(id, group);
    }

    Ok(OneStore {
        schema: storage_manifest.id,
        header,
        data_root,
        object_spaces,
    })
}

fn parse_object_space<'a, 'b>(
    cell_id: CellId,
    storage_index: &'a StorageIndex,
    package: &'a OneStorePackaging,
    revision_cache: &'b mut HashMap<CellId, Revision<'a>>,
) -> Result<(CellId, ObjectSpace<'a>)> {
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
