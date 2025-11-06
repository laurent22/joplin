use std::fmt::Debug;
use std::rc::Rc;

#[derive(Clone, Default, Eq, PartialEq, PartialOrd)]
pub struct FileBlob(pub Rc<Vec<u8>>);

impl Debug for FileBlob {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let len = self.0.len();
        write!(f, "FileBlob [ {:?} KiB ]", len / 1024)
    }
}

impl FileBlob {
    pub fn as_ref(&self) -> &[u8] {
        &self.0
    }
}

impl From<Vec<u8>> for FileBlob {
    fn from(value: Vec<u8>) -> Self {
        Self(Rc::new(value))
    }
}

impl From<&[u8]> for FileBlob {
    fn from(value: &[u8]) -> Self {
        Self(Rc::new(Vec::from(value)))
    }
}
