use std::{fmt::Debug, rc::Rc};

use crate::{
    local_onestore::{
        file_node::{FileNodeData, file_node::ObjectDeclarationNode},
        file_structure::FileNodeDataIterator,
        objects::parse_context::ParseContext,
    },
    shared::compact_id::CompactId,
};
use parser_utils::errors::Result;

type ExportedObject = crate::onestore::object::Object;

#[derive(Clone)]
pub struct Object {
    pub data: Rc<ExportedObject>,
    pub compact_id: CompactId,
}

impl Debug for Object {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.data.fmt(f)
    }
}

impl Object {
    pub fn try_parse(
        iterator: &mut FileNodeDataIterator,
        context: &ParseContext,
    ) -> Result<Option<Self>> {
        let current = iterator.peek();
        let result = match current {
            Some(FileNodeData::ObjectDeclaration2RefCountFND(data)) => {
                Some(Self::parse_from_declaration(data, context)?)
            }
            Some(FileNodeData::ObjectDeclaration2LargeRefCountFND(data)) => {
                Some(Self::parse_from_declaration(data, context)?)
            }
            Some(FileNodeData::ReadOnlyObjectDeclaration2RefCountFND(data)) => {
                Some(Self::parse_from_declaration(data, context)?)
            }
            Some(FileNodeData::ReadOnlyObjectDeclaration2LargeRefCountFND(data)) => {
                Some(Self::parse_from_declaration(data, context)?)
            }
            Some(FileNodeData::ObjectDeclarationFileData3RefCountFND(data)) => {
                Some(Self::parse_from_declaration(data, context)?)
            }
            Some(FileNodeData::ObjectDeclarationFileData3LargeRefCountFND(data)) => {
                Some(Self::parse_from_declaration(data, context)?)
            }
            Some(FileNodeData::ObjectDeclarationWithRefCountFNDX(data)) => {
                Some(Self::parse_from_declaration(data, context)?)
            }
            Some(_) => None,
            None => None,
        };
        // Ensure that the iterator always advances when parsing
        if result.is_some() {
            iterator.next();
        }
        Ok(result)
    }

    fn parse_from_declaration(
        declaration: &dyn ObjectDeclarationNode,
        context: &ParseContext,
    ) -> Result<Self> {
        let props = declaration.get_props().cloned().unwrap_or_default();
        let data = ExportedObject {
            jc_id: declaration.get_jcid(),
            props,
            mapping: context.id_map.clone(),
            file_data: declaration
                .get_attachment_info()
                .map(|info| context.find_file_data(&info)),
            context_id: context.context_id,
        };
        Ok(Self {
            data: Rc::new(data),
            compact_id: declaration.get_compact_id(),
        })
    }
}
