pub mod api;
pub use api::ApiResult;
pub use api::FileApiDriver;
pub use api::FileHandle;
use lazy_static::lazy_static;
use std::sync::Arc;

#[cfg(target_arch = "wasm32")]
mod wasm_driver;
#[cfg(target_arch = "wasm32")]
use wasm_driver::FileApiDriverImpl;

#[cfg(not(target_arch = "wasm32"))]
mod native_driver;
#[cfg(not(target_arch = "wasm32"))]
use native_driver::FileApiDriverImpl;

lazy_static! {
    static ref FS_DRIVER: Arc<dyn FileApiDriver> = Arc::new(FileApiDriverImpl {});
}

pub fn fs_driver() -> Arc<dyn FileApiDriver> {
    FS_DRIVER.clone()
}
