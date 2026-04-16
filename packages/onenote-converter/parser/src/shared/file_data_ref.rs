use std::fmt::Debug;
use std::rc::Rc;

use parser_utils::Result;
use parser_utils::reader::ReaderDataRef;

#[derive(Clone)]
pub struct FileBlob {
    // File blobs can be huge. Lazy-load the data and only keep it as long
    // as necessary.
    loader: Rc<dyn FileDataLoader>,
    size: usize,
}

impl PartialEq for FileBlob {
    fn eq(&self, other: &Self) -> bool {
        self.size == other.size && Rc::ptr_eq(&self.loader, &other.loader)
    }
}

pub trait FileDataLoader {
    fn load(&self) -> Result<Vec<u8>>;
}

impl FileDataLoader for Vec<u8> {
    fn load(&self) -> Result<Vec<u8>> {
        Ok(self.clone())
    }
}

impl FileDataLoader for ReaderDataRef {
    fn load(&self) -> Result<Vec<u8>> {
        self.bytes()
    }
}

impl Default for FileBlob {
    fn default() -> Self {
        Self {
            loader: Rc::new(vec![]),
            size: 0,
        }
    }
}

impl Debug for FileBlob {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "FileBlob [ {:?} KiB ]", self.size / 1024)
    }
}

impl FileBlob {
    pub fn new(on_load: Box<dyn FileDataLoader>, size: usize) -> Self {
        Self {
            loader: on_load.into(),
            size,
        }
    }

    pub fn len(&self) -> usize {
        self.size
    }

    pub fn load(&self) -> Result<Vec<u8>> {
        self.loader.load()
    }
}
