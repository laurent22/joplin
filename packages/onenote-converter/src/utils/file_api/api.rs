pub type ApiResult<T> = std::result::Result<T, std::io::Error>;

pub trait FileApiDriver: Send + Sync {
    fn is_directory(&self, path: &str) -> ApiResult<bool>;
    fn read_dir(&self, path: &str) -> ApiResult<Vec<String>>;
    fn read_file(&self, path: &str) -> ApiResult<Vec<u8>>;
    fn write_file(&self, path: &str, data: &[u8]) -> ApiResult<()>;
    fn make_dir(&self, path: &str) -> ApiResult<()>;
    fn exists(&self, path: &str) -> ApiResult<bool>;

    // These functions correspond to the similarly-named
    // path functions.
    fn get_file_name(&self, path: &str) -> Option<String>;
    fn get_file_extension(&self, path: &str) -> String;
    fn get_dir_name(&self, path: &str) -> String;
    fn join(&self, path_1: &str, path_2: &str) -> String;

    fn remove_prefix<'a>(&self, full_path: &'a str, prefix: &str) -> &'a str {
        if full_path.starts_with(prefix) {
            &full_path[prefix.len()..]
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

        if let Some(value) = result {
            if value == "" {
                None
            } else {
                Some(value)
            }
        } else {
            None
        }
    }
}
