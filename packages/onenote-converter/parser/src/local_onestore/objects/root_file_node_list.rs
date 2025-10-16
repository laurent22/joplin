use std::rc::Rc;

use super::file_data_store::FileDataStore;
use crate::local_onestore::{
    file_node::FileNodeData,
    file_structure::FileNodeDataIterator,
    objects::{object_space::ObjectSpace, parse_context::ParseContext},
};
use parser_utils::errors::Result;

// See
// - [MS-ONESTORE 2.1.14](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/28e21c1f-94b6-4f98-9d81-2e1278ebefc6)
// - [MS-ONESTORE 1.3.2](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/e3f4f871-f674-4198-9cb8-d67e1eeac2f3)
#[derive(Debug)]
pub struct RootFileNodeList {
    pub root_object_space: Rc<ObjectSpace>,
    pub object_spaces: Vec<Rc<ObjectSpace>>,
    pub file_data_store: Option<Rc<FileDataStore>>,
}

impl RootFileNodeList {
    pub fn parse(iterator: &mut FileNodeDataIterator, context: &ParseContext) -> Result<Self> {
        let mut object_spaces = Vec::new();
        let mut file_data_store = None;
        let mut root_object_space_id = None;

        let mut last_index: usize = iterator.get_index();
        while let Some(current) = iterator.peek() {
            if let Some(object_space) = ObjectSpace::try_parse(iterator, context)? {
                object_spaces.push(Rc::new(object_space));
            } else if let Some(data_store) = FileDataStore::try_parse(iterator)? {
                if file_data_store.is_some() {
                    return Err(onestore_parse_error!(
                        "Only one file_data_store can exist in the root node list"
                    )
                    .into());
                }
                file_data_store = Some(Rc::new(data_store));
            } else if let FileNodeData::ObjectSpaceManifestRootFND(data) = current {
                iterator.next();
                root_object_space_id = Some(data.gosid_root);
            } else {
                return Err(onestore_parse_error!(
                    "Unexpected entry in the root file node list: {:?}",
                    current
                )
                .into());
            }

            let index = iterator.get_index();
            if index == last_index {
                println!(
                    "Indexes equal: {} = {}. Parsing: {:?}",
                    index, index, current
                )
            }
            assert_ne!(index, last_index);
            last_index = index;
        }

        let root_object_space_id = root_object_space_id.ok_or_else(|| {
            onestore_parse_error!("Root file node list did not contain a node with the root ID")
        })?;
        let root_object_space = object_spaces
            .iter()
            .find(|space| space.id == root_object_space_id)
            .ok_or_else(|| onestore_parse_error!("Should have a default object space"))?
            .clone();

        Ok(Self {
            root_object_space,
            file_data_store,
            object_spaces,
        })
    }
}
