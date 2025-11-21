use crate::templates::notebook::Toc;
use crate::{section, templates};
use color_eyre::eyre::Result;
use palette::rgb::Rgb;
use palette::{Alpha, ConvertFrom, Hsl, Saturate, Shade, Srgb};
use parser::notebook::Notebook;
use parser::property::common::Color;
use parser::section::{Section, SectionEntry};
use parser_utils::{fs_driver, log};

pub(crate) type RgbColor = Alpha<Rgb<palette::encoding::Srgb, u8>, f32>;

pub(crate) struct Renderer;

impl Renderer {
    pub fn new() -> Self {
        Renderer
    }

    pub fn render(&mut self, notebook: &Notebook, name: &str, output_dir: &str) -> Result<()> {
        log!("Notebook name: {:?} {:?}", name, output_dir);
        fs_driver().make_dir(output_dir)?;

        // let notebook_dir = unsafe { join_path(output_dir, sanitize_filename::sanitize(name).as_str()) }.unwrap().as_string().unwrap();
        let notebook_dir = output_dir.to_owned();

        fs_driver().make_dir(&notebook_dir)?;

        let mut toc = Vec::new();

        for entry in notebook.entries() {
            match entry {
                SectionEntry::Section(section) => {
                    toc.push(Toc::Section(self.render_section(
                        section,
                        notebook_dir.clone(),
                        output_dir.into(),
                    )?));
                }
                SectionEntry::SectionGroup(group) => {
                    let dir_name = sanitize_filename::sanitize(group.display_name());
                    let section_group_dir =
                        fs_driver().join(notebook_dir.as_str(), dir_name.as_str());

                    log!("Section group directory: {:?}", section_group_dir);
                    fs_driver().make_dir(section_group_dir.as_str())?;

                    let mut entries = Vec::new();

                    for entry in group.entries() {
                        if let SectionEntry::Section(section) = entry {
                            entries.push(self.render_section(
                                section,
                                section_group_dir.clone(),
                                output_dir.to_owned(),
                            )?);
                        }
                    }

                    toc.push(templates::notebook::Toc::SectionGroup(
                        group.display_name().to_string(),
                        entries,
                    ))
                }
            }
        }

        templates::notebook::render(name, &toc)?;

        Ok(())
    }

    fn render_section(
        &mut self,
        section: &Section,
        notebook_dir: String,
        base_dir: String,
    ) -> Result<templates::notebook::Section> {
        let mut renderer = section::Renderer::new();
        let rendered_section = renderer.render(section, notebook_dir)?;
        let section_path = &rendered_section.section_dir;
        log!("section_path: {:?}", section_path);

        let path_from_base_dir = String::from(fs_driver().remove_prefix(section_path, &base_dir));
        log!("path_from_base_dir: {:?}", path_from_base_dir);
        Ok(templates::notebook::Section {
            name: section.display_name().to_string(),
            path: path_from_base_dir,
            color: section.color().map(prepare_color),
        })
    }
}

fn prepare_color(color: Color) -> RgbColor {
    Alpha {
        alpha: color.alpha() as f32 / 255.0,
        color: Srgb::convert_from(
            Hsl::convert_from(Srgb::new(
                color.r() as f32 / 255.0,
                color.g() as f32 / 255.0,
                color.b() as f32 / 255.0,
            ))
            .darken(0.2)
            .saturate(1.0),
        )
        .into_format(),
    }
}
