use super::ApiResult;
use super::FileApiDriver;
use std::fs;
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
        Ok(fs::read(path)?)
    }

    fn write_file(&self, path: &str, data: &[u8]) -> ApiResult<()> {
        Ok(fs::write(path, data)?)
    }

    fn exists(&self, path: &str) -> ApiResult<bool> {
        Ok(fs::exists(path)?)
    }

    fn make_dir(&self, path: &str) -> ApiResult<()> {
        Ok(fs::create_dir(path)?)
    }

    fn get_file_name(&self, path: &str) -> Option<String> {
        match Path::new(path).file_name() {
            Some(name) => Some(name.to_string_lossy().into()),
            None => None,
        }
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
        Path::new(path_1).join(path_2).to_string_lossy().into()
    }
}
