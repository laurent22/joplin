use std::io::{Read, Seek};

pub type ApiResult<T> = std::result::Result<T, std::io::Error>;
pub trait FileHandle: Read + Seek {}

pub trait FileApiDriver: Send + Sync {
    fn is_directory(&self, path: &str) -> ApiResult<bool>;
    fn read_dir(&self, path: &str) -> ApiResult<Vec<String>>;
    fn read_file(&self, path: &str) -> ApiResult<Vec<u8>>;
    fn write_file(&self, path: &str, data: &[u8]) -> ApiResult<()>;
    fn make_dir(&self, path: &str) -> ApiResult<()>;
    fn exists(&self, path: &str) -> ApiResult<bool>;
    fn open_file(&self, path: &str) -> ApiResult<Box<dyn FileHandle>>;

    // These functions correspond to the similarly-named
    // NodeJS path functions and should behave like the NodeJS
    // functions (rather than the corresponding Rust functions).
    fn get_file_name(&self, path: &str) -> Option<String>;
    fn get_file_extension(&self, path: &str) -> String;
    fn get_dir_name(&self, path: &str) -> String;
    /// This function should behave like NodeJS's `path.join` function.
    /// As a result, unlike Rust's `Path::join`, if `path_2` starts with "/",
    /// `path_2` is still appended to `path_1`.
    fn join(&self, path_1: &str, path_2: &str) -> String;

    /// Splits filename into (base, extension).
    fn split_file_name(&self, filename: &str) -> (String, String) {
        let ext = self.get_file_extension(filename);
        let base = filename.strip_suffix(&ext).unwrap_or(filename);
        (base.into(), ext)
    }
    fn remove_prefix<'a>(&self, full_path: &'a str, prefix: &str) -> &'a str {
        if let Some(without_prefix) = full_path.strip_prefix(prefix) {
            without_prefix
        } else {
            full_path
        }
    }
    fn get_output_path(&self, input_dir: &str, output_dir: &str, file_path: &str) -> String {
        let base_path = self.remove_prefix(file_path, input_dir);
        let rebased_output = self.join(output_dir, base_path);
        self.get_dir_name(&rebased_output)
    }

    fn get_parent_dir(&self, path: &str) -> Option<String> {
        let dir_name = self.get_dir_name(path);
        let result = self.get_file_name(&dir_name);

        result.filter(|value| !value.is_empty())
    }
}
