use crate::page::Renderer;
use crate::parser::contents::EmbeddedFile;
use crate::parser::property::embedded_file::FileType;
use crate::utils::utils::log;
use crate::utils::{join_path, write_file};
use color_eyre::eyre::ContextCompat;
use color_eyre::Result;
use std::path::PathBuf;

impl<'a> Renderer<'a> {
    pub(crate) fn render_embedded_file(&mut self, file: &EmbeddedFile) -> Result<String> {
        let content;

        let filename = self.determine_filename(file.filename())?;
        let path = unsafe { join_path(self.output.as_str(), filename.as_str()) }
            .unwrap()
            .as_string()
            .unwrap();
        log!("Rendering embedded file: {:?}", path);
        let _ = unsafe { write_file(path.as_str(), file.data()) };

        let file_type = Self::guess_type(file);

        match file_type {
            FileType::Audio => content = format!("<audio controls src=\"{}\"></audio>", filename),
            FileType::Video => content = format!("<video controls src=\"{}\"></video>", filename),
            FileType::Unknown => {
                content = format!(
                    "<p style=\"font-size: 11pt; line-height: 17px;\"><a href=\"{}\">{}</a></p>",
                    filename, filename
                )
            }
        };

        Ok(self.render_with_note_tags(file.note_tags(), content))
    }

    fn guess_type(file: &EmbeddedFile) -> FileType {
        match file.file_type() {
            FileType::Audio => return FileType::Audio,
            FileType::Video => return FileType::Video,
            _ => {}
        };

        let filename = file.filename();

        if let Some(mime) = mime_guess::from_path(filename).first() {
            if mime.type_() == "audio" {
                return FileType::Audio;
            }

            if mime.type_() == "video" {
                return FileType::Video;
            }
        }
        FileType::Unknown
    }

    pub(crate) fn determine_filename(&mut self, filename: &str) -> Result<String> {
        let mut i = 0;
        let mut current_filename = filename.to_string();

        loop {
            if !self.section.files.contains(&current_filename) {
                self.section.files.insert(current_filename.clone());

                return Ok(current_filename);
            }

            let path = PathBuf::from(filename);
            let ext = path
                .extension()
                .unwrap_or_default();
            let base = path
                .as_os_str()
                .to_str()
                .wrap_err("Embedded file name is non utf-8")?
                .strip_suffix(ext.to_string_lossy().as_ref())
                .wrap_err("Failed to strip extension from file name")?
                .trim_matches('.');

            current_filename = format!("{}-{}.{}", base, i, ext.to_string_lossy());

            i += 1;
        }
    }
}
