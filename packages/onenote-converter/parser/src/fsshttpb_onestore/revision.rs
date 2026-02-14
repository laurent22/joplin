use super::object::Object;
use super::object_space::GroupData;
use super::packaging::OneStorePackaging;
use super::revision_role::RevisionRole;
use crate::fsshttpb::data_element::storage_index::StorageIndex;
use crate::shared::cell_id::CellId;
use crate::shared::exguid::ExGuid;
use parser_utils::errors::{ErrorKind, Result};
use std::collections::HashMap;

/// A OneNote file revision.
///
/// See [\[MS-ONESTOR\] 2.1.8]
///
/// [\[MS-ONESTOR\] 2.1.8]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/a8ca2a90-d92a-4cf7-bf68-ed18ae476a11
#[derive(Debug, Clone)]
pub(crate) struct Revision {
    objects: HashMap<ExGuid, Object>,
    roots: HashMap<RevisionRole, ExGuid>,
}

impl Revision {
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn parse(
        revision_manifest_id: ExGuid,
        context_id: ExGuid,
        object_space_id: ExGuid,
        storage_index: &StorageIndex,
        packaging: &OneStorePackaging,
        revision_cache: &mut HashMap<CellId, Revision>,
        objects: &mut HashMap<ExGuid, Object>,
        roots: &mut HashMap<RevisionRole, ExGuid>,
    ) -> Result<Option<ExGuid>> {
        let revision_manifest = packaging
            .data_element_package
            .find_revision_manifest(revision_manifest_id)
            .ok_or_else(|| {
                ErrorKind::MalformedOneStoreData("revision manifest not found".into())
            })?;

        let base_rev = revision_manifest
            .base_rev_id
            .as_option()
            .map(|mapping_id| {
                packaging
                    .data_element_package
                    .resolve_revision_manifest_id(storage_index, mapping_id)
                    .ok_or_else(|| {
                        ErrorKind::MalformedOneStoreData("revision manifest id not found".into())
                    })
            })
            .transpose()?;

        if let Some(rev) = revision_cache.get(&CellId(context_id, revision_manifest.rev_id)) {
            roots.extend(rev.roots.iter());
            objects.extend(rev.objects.clone().into_iter());

            return Ok(base_rev);
        }

        roots.extend(
            revision_manifest
                .root_declare
                .iter()
                .map(|root| Ok((RevisionRole::parse(root.root_id)?, root.object_id)))
                .collect::<Result<Vec<_>>>()?
                .into_iter(),
        );

        for group_id in revision_manifest.group_references.iter() {
            Self::parse_group(context_id, *group_id, object_space_id, packaging, objects)?
        }

        Ok(base_rev)
    }

    fn parse_group(
        context_id: ExGuid,
        group_id: ExGuid,
        object_space_id: ExGuid,
        packaging: &OneStorePackaging,
        objects: &mut HashMap<ExGuid, Object>,
    ) -> Result<()> {
        let group = packaging
            .data_element_package
            .find_object_group(group_id)
            .ok_or_else(|| ErrorKind::MalformedOneStoreData("object group not found".into()))?;

        let object_ids: Vec<_> = group.declarations.iter().map(|o| o.object_id()).collect();

        let group_objects: GroupData = group
            .declarations
            .iter()
            .zip(group.objects.iter())
            .map(|(decl, data)| ((decl.object_id(), decl.partition_id()), data))
            .collect();

        for object_id in object_ids {
            if objects.contains_key(&object_id) {
                continue;
            }

            if group.declarations.len() != group.objects.len() {
                return Err(ErrorKind::MalformedOneStoreData(
                    "object declaration/data counts do not match".into(),
                )
                .into());
            }

            let object = Object::parse(
                object_id,
                context_id,
                object_space_id,
                &group_objects,
                packaging,
            )?;

            objects.insert(object_id, object);
        }

        Ok(())
    }
}
