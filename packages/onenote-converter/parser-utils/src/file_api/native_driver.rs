use super::ApiResult;
use super::FileApiDriver;
use super::FileHandle;
use std::fs;
use std::path;
use std::path::Path;

pub struct FileApiDriverImpl {}

impl FileApiDriver for FileApiDriverImpl {
    fn is_directory(&self, path: &str) -> ApiResult<bool> {
        let metadata = fs::metadata(path)?;
        let file_type = metadata.file_type();
        Ok(file_type.is_dir())
    }

    fn read_dir(&self, path: &str) -> ApiResult<Vec<String>> {
        let mut result: Vec<String> = Vec::new();
        for item in fs::read_dir(path)? {
            let item = item?.path();
            result.push(item.to_string_lossy().into())
        }
        Ok(result)
    }

    fn read_file(&self, path: &str) -> ApiResult<Vec<u8>> {
        fs::read(path)
    }

    fn open_file(&self, path: &str) -> ApiResult<Box<dyn FileHandle>> {
        Ok(Box::new(fs::File::open(path)?))
    }

    fn write_file(&self, path: &str, data: &[u8]) -> ApiResult<()> {
        fs::write(path, data)
    }

    fn exists(&self, path: &str) -> ApiResult<bool> {
        fs::exists(path)
    }

    fn make_dir(&self, path: &str) -> ApiResult<()> {
        let result = fs::create_dir(path);
        // Don't fail if it already existed
        if self.exists(path)? { Ok(()) } else { result }
    }

    fn get_file_name(&self, path: &str) -> Option<String> {
        Path::new(path)
            .file_name()
            .map(|name| name.to_string_lossy().into())
    }
    fn get_file_extension(&self, path: &str) -> String {
        match Path::new(path).extension() {
            Some(ext) => {
                let extension = String::from(ext.to_string_lossy());
                String::from(".") + &extension
            }
            None => String::from(""),
        }
    }
    fn get_dir_name(&self, path: &str) -> String {
        match Path::new(path).parent() {
            Some(parent) => parent.to_string_lossy().into(),
            None => String::from(""),
        }
    }
    fn join(&self, path_1: &str, path_2: &str) -> String {
        // Remove the / prefix prior to joining: Match the behavior of the
        // WASM/NodeJS file API.
        let path_2 = if path_2.starts_with(path::MAIN_SEPARATOR) {
            path_2.strip_prefix(path::MAIN_SEPARATOR).unwrap()
        } else {
            path_2
        };
        Path::new(path_1).join(path_2).to_string_lossy().into()
    }
}

impl FileHandle for fs::File {}

#[cfg(test)]
mod test {
    use crate::file_api::FileApiDriver;

    use super::FileApiDriverImpl;

    #[test]
    fn should_split_file_name() {
        let fs_driver = FileApiDriverImpl {};

        assert_eq!(
            fs_driver.split_file_name("a.txt"),
            (String::from("a"), String::from(".txt"))
        );
        assert_eq!(
            fs_driver.split_file_name("a"),
            (String::from("a"), String::from(""))
        );
        assert_eq!(
            fs_driver.split_file_name("a test.a.b"),
            (String::from("a test.a"), String::from(".b"))
        );
    }
}
