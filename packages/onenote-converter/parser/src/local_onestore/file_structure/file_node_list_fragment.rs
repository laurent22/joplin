use super::parse_context::ParseContext;
use crate::local_onestore::{
    common::FileChunkReference64x32,
    file_node::{FileNode, FileNodeData},
};
use parser_utils::{errors::ErrorKind, log_warn, parse::Parse};

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct FileNodeListFragment {
    pub header: FileNodeListHeader,
    pub file_nodes: Vec<FileNode>,
    pub next_fragment: FileChunkReference64x32,
    pub footer: u64,
}

impl FileNodeListFragment {
    pub fn parse(
        reader: parser_utils::Reader,
        context: &mut ParseContext,
        size: usize,
    ) -> parser_utils::Result<Self> {
        let header = FileNodeListHeader::parse(reader)?;
        let mut file_nodes: Vec<FileNode> = Vec::new();
        let mut file_node_size: usize = 0;

        let remaining_0 = reader.remaining();

        // Sometimes, the node count is specified externally
        let mut maximum_node_count = match context.get_file_node_count(&header) {
            Some(count) => count,
            None => {
                log_warn!("No node count found.");
                usize::MAX
            }
        };

        while size - 36 - file_node_size >= 4 && maximum_node_count > 0 {
            let file_node = FileNode::parse(reader, context)?;
            file_node_size += file_node.size;

            if !matches!(
                file_node.fnd,
                FileNodeData::ChunkTerminatorFND | FileNodeData::Null
            ) {
                maximum_node_count -= 1;
            }
            if !matches!(file_node.fnd, FileNodeData::Null) {
                file_nodes.push(file_node);
            }

            assert_eq!(remaining_0 - reader.remaining(), file_node_size);
        }

        context.update_remaining_nodes_in_fragment(&header, maximum_node_count);

        let padding_length = size - 36 - file_node_size;
        reader.advance(padding_length)?;

        let next_fragment = FileChunkReference64x32::parse(reader)?;

        let footer = reader.get_u64()?;
        if footer != 0x8BC215C38233BA4B {
            return Err(ErrorKind::MalformedOneStoreData(
                format!("Invalid footer: {:#0x}", footer).into(),
            )
            .into());
        }

        Ok(Self {
            header,
            file_nodes,
            next_fragment,
            footer,
        })
    }
}

#[derive(Debug, Parse, Clone)]
#[validate(magic == 0xA4567AB1F5F7F4C4)]
#[validate(file_node_list_id >= 0x0010)]
#[allow(dead_code)]
pub struct FileNodeListHeader {
    magic: u64,
    pub file_node_list_id: u32,
    pub n_fragment_sequence: u32,
}
