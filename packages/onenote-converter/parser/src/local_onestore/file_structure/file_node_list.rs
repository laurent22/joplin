use parser_utils::Reader;
use parser_utils::errors::{ErrorKind, Result};

use crate::local_onestore::common::{FileChunkReference, FileChunkReference64x32};
use crate::local_onestore::file_node::{FileNode, FileNodeData};
use crate::local_onestore::file_structure::{FileNodeListFragment, ParseContext};

#[derive(Debug, Clone, Default)]
pub struct FileNodeList {
    pub file_node_sequence: Vec<FileNode>,
}

impl FileNodeList {
    pub fn parse(reader: Reader, context: &mut ParseContext, size: usize) -> Result<Self> {
        let mut builder = FileNodeListBuilder {
            next_fragment_id: 0,
            file_node_sequence: Vec::new(),
        };

        let mut next_fragment_ref =
            builder.add_fragment(FileNodeListFragment::parse(reader, context, size)?)?;
        while !next_fragment_ref.is_fcr_nil() && !next_fragment_ref.is_fcr_zero() {
            let mut reader = next_fragment_ref.resolve_to_reader(reader)?;
            let fragment =
                FileNodeListFragment::parse(&mut reader, context, next_fragment_ref.cb as usize)?;
            next_fragment_ref = builder.add_fragment(fragment)?;
        }
        Ok(Self {
            file_node_sequence: builder.file_node_sequence,
        })
    }

    /// Iterate over the .fnd fields for all toplevel nodes
    pub fn iter_data<'a>(&'a self) -> FileNodeDataIterator<'a> {
        FileNodeDataIterator::new(self)
    }
}

struct FileNodeListBuilder {
    pub file_node_sequence: Vec<FileNode>,

    // Used for validation during construction
    next_fragment_id: u32,
}

impl FileNodeListBuilder {
    fn add_fragment(&mut self, fragment: FileNodeListFragment) -> Result<FileChunkReference64x32> {
        let fragment_sequence = fragment.header.n_fragment_sequence;
        if fragment_sequence != self.next_fragment_id {
            return Err(ErrorKind::MalformedOneStoreData(
                format!(
                    "Invalid n_fragment_sequence. Was {}, expected {}",
                    fragment_sequence, self.next_fragment_id
                )
                .into(),
            )
            .into());
        }
        self.next_fragment_id = fragment_sequence + 1;

        for item in fragment
            .file_nodes
            .iter()
            .filter(|f| !matches!(f.fnd, FileNodeData::ChunkTerminatorFND))
        {
            self.file_node_sequence.push(item.clone());
        }
        let next_fragment_ref = fragment.next_fragment.clone();
        Ok(next_fragment_ref)
    }
}

pub struct FileNodeDataIterator<'a> {
    data: &'a FileNodeList,
    index: usize,
}

impl<'a> FileNodeDataIterator<'a> {
    fn new(node_list: &'a FileNodeList) -> Self {
        FileNodeDataIterator {
            data: node_list,
            index: 0,
        }
    }

    pub fn peek(&self) -> Option<&'a FileNodeData> {
        let index = self.index;
        if index >= self.data.file_node_sequence.len() {
            None
        } else {
            Some(&self.data.file_node_sequence[index].fnd)
        }
    }

    pub fn get_index(&self) -> usize {
        self.index
    }
}

impl<'a> Iterator for FileNodeDataIterator<'a> {
    type Item = &'a FileNodeData;
    fn next(&mut self) -> Option<Self::Item> {
        let target_index = self.index;
        self.index += 1;
        if target_index >= self.data.file_node_sequence.len() {
            return None;
        }

        let result = &self.data.file_node_sequence[target_index];
        Some(&result.fnd)
    }
}
