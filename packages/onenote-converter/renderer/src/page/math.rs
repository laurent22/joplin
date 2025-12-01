use crate::page::Renderer;
use crate::utils::{StyleSet, html_entities};
use color_eyre::Result;
use parser::property::rich_text::MathExpression;


impl<'a> Renderer<'a> {
    pub(crate) fn render_math(&mut self, math: &MathExpression, style: &StyleSet) -> Result<String> {
        let source_opening_html = format!(
            "<pre class=\"joplin-source\" data-joplin-language=\"katex\" data-joplin-source-open=\"$$&#10;\" data-joplin-source-close=\"&#10;$$&#10;\" {}>",
            style.to_html_attr(),
        );
        let rendered = format!("{}", html_entities(&math.latex).escape_default());

        let opening = if math.is_math_start { source_opening_html } else { "".into() };
        let closing = if math.is_math_end { "</pre>" } else { "" };
        Ok(format!("{opening}{rendered}{closing}"))
    }
}
