use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::cell_id::CellId;
use crate::parser::fsshttpb::data::exguid::ExGuid;
use crate::parser::fsshttpb::data_element::storage_index::StorageIndex;
use crate::parser::fsshttpb::packaging::OneStorePackaging;
use crate::parser::onestore::object::Object;
use crate::parser::onestore::object_space::GroupData;
use crate::parser::onestore::revision_role::RevisionRole;
use std::collections::HashMap;

/// A OneNote file revision.
///
/// See [\[MS-ONESTOR\] 2.1.8]
///
/// [\[MS-ONESTOR\] 2.1.8]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/a8ca2a90-d92a-4cf7-bf68-ed18ae476a11
#[derive(Debug, Clone)]
pub(crate) struct Revision<'a> {
    objects: HashMap<ExGuid, Object<'a>>,
    roots: HashMap<RevisionRole, ExGuid>,
}

impl<'a, 'b> Revision<'a> {
    #[allow(clippy::too_many_arguments)]
    pub(crate) fn parse(
        revision_manifest_id: ExGuid,
        context_id: ExGuid,
        object_space_id: ExGuid,
        storage_index: &'a StorageIndex,
        packaging: &'a OneStorePackaging,
        revision_cache: &'b mut HashMap<CellId, Revision<'a>>,
        objects: &'b mut HashMap<ExGuid, Object<'a>>,
        roots: &'b mut HashMap<RevisionRole, ExGuid>,
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
                storage_index
                    .find_revision_mapping_id(mapping_id)
                    .ok_or_else(|| {
                        ErrorKind::MalformedOneStoreData("revision mapping not found".into())
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
        packaging: &'a OneStorePackaging,
        objects: &'b mut HashMap<ExGuid, Object<'a>>,
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
