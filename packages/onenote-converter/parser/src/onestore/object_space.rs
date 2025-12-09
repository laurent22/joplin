use super::object::Object;
use crate::shared::exguid::ExGuid;
use std::rc::Rc;

pub trait ObjectSpace: std::fmt::Debug {
    fn get_object(&self, id: ExGuid) -> Option<Rc<Object>>;
    fn content_root(&self) -> Option<ExGuid>;
    fn metadata_root(&self) -> Option<ExGuid>;
}

pub type ObjectSpaceRef = Rc<dyn ObjectSpace>;
