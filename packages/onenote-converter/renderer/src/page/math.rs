use crate::page::Renderer;
use crate::utils::{StyleSet, html_entities};
use color_eyre::Result;
use parser::property::rich_text::MathExpression;


impl<'a> Renderer<'a> {
    pub(crate) fn render_math(&mut self, math: &MathExpression, style: &StyleSet) -> Result<String> {
        let rendered = format!("{}", html_entities(&math.latex));

        let opening = if math.is_math_start {
            format!(
                "<span class=\"joplin-editable\"><span class=\"joplin-source\" data-joplin-language=\"katex\" data-joplin-source-open=\"$\" data-joplin-source-close=\"$\" {}>{}{}{}{}",
                style.to_html_attr(),
                r"\def\matInt#1#2#3{\int_{#1}^{#2}{#3}}",
                r"\def\inParens#1{\left( {#1} \right)}",
                r"\def\fnCall#1#2{\textsf{#1}\ {#2}}",
                r"\def\pow#1#2{{#1}^{#2}}",
            )
        } else { "".into() };
        let closing = if math.is_math_end {
            "</pre></span>"
        } else {
            ""
        };
        Ok(format!("{opening}{rendered}{closing}"))
    }
}
