use crate::page::Renderer;
use crate::utils::{AttributeSet, StyleSet};
use parser::contents::{NoteTag, OutlineElement};
use parser::property::common::ColorRef;
use parser::property::note_tag::{ActionItemStatus, NoteTagShape};
use parser_utils::log_warn;
use std::borrow::Cow;

const COLOR_BLUE: &str = "#4673b7";
const COLOR_GREEN: &str = "#369950";
const COLOR_RED: &str = "#db5b4d";
const COLOR_YELLOW: &str = "#ffd678";

const ICON_ARROW_RIGHT: &str = "→";
const ICON_AWARD: &str = "🎖️";
const ICON_BOOK: &str = "📖";
const ICON_BUBBLE: &str = "🗨️";
const ICON_CHECKBOX_COMPLETE: &str = "☑";
const ICON_CHECKBOX_EMPTY: &str = "☐";
const ICON_CHECK_MARK: &str = "✓";
const ICON_CIRCLE_BLUE: &str = "🔵";
const ICON_CIRCLE_GREEN: &str = "🟢";
const ICON_CIRCLE_ORANGE: &str = "🟠";
const ICON_CONTACT: &str = "👥";
const ICON_EMAIL: &str = "📨";
const ICON_ERROR: &str = "❗";
const ICON_FILM: &str = "🎞️";
const ICON_FLAG: &str = "🚩";
const ICON_HOME: &str = "🏠";
const ICON_LIGHT_BULB: &str = "💡";
const ICON_LINK: &str = "🔗";
const ICON_LOCK: &str = "🔒";
const ICON_MUSIC: &str = "🎵";
const ICON_PAPER: &str = "📄";
const ICON_PEN: &str = "🖊️";
const ICON_PERSON: &str = "👤";
const ICON_PHONE: &str = "📞";
const ICON_QUESTION_MARK: &str = "❓";
const ICON_SQUARE_RED: &str = "🟥";
const ICON_SQUARE_YELLOW: &str = "🟨";
const ICON_SQUARE_ORANGE: &str = "🟧";
const ICON_SQUARE_GREEN: &str = "🟩";
const ICON_SQUARE_BLUE: &str = "🟦";
const ICON_SQUARE_PURPLE: &str = "🟪";
const ICON_STAR: &str = "🟊";
const ICON_YELLOW_STAR: &str = "⭐";

#[derive(Debug, Copy, Clone, PartialEq)]
enum IconSize {
    Normal,
    Large,
}

struct NoteTagIcon {
    emoji_html: Cow<'static, str>,
    size: IconSize,
    styles: StyleSet,
    is_checkbox: bool,
}

impl From<(Cow<'static, str>, IconSize)> for NoteTagIcon {
    fn from((html, size): (Cow<'static, str>, IconSize)) -> Self {
        Self {
            emoji_html: html,
            size,
            styles: StyleSet::new(),
            is_checkbox: false,
        }
    }
}

impl From<(Cow<'static, str>, IconSize, StyleSet)> for NoteTagIcon {
    fn from((html, size, styles): (Cow<'static, str>, IconSize, StyleSet)) -> Self {
        Self {
            emoji_html: html,
            size,
            styles,
            is_checkbox: false,
        }
    }
}

impl<'a> Renderer<'a> {
    pub(crate) fn render_with_note_tags(
        &mut self,
        note_tags: &[NoteTag],
        content: String,
    ) -> String {
        if let Some((markup, styles)) = self.render_note_tags(note_tags) {
            let mut contents = String::new();
            contents.push_str(&format!("<div style=\"{}\">{}", styles, markup));
            contents.push_str(&content);
            contents.push_str("</div>");

            contents
        } else {
            content
        }
    }

    fn build_note_tag_class_names(&mut self, icon: &NoteTagIcon) -> Vec<String> {
        let mut icon_classes = vec!["note-tag-icon".to_string()];

        if icon.styles.len() > 0 {
            let class = self.gen_class("icon");
            icon_classes.push(class.to_string());

            self.global_styles
                .insert(format!(".{} > .text", class), icon.styles.clone());
        }

        if icon.is_checkbox {
            icon_classes.push("-checkbox".into());
        }

        if icon.size == IconSize::Large {
            icon_classes.push("-large".into());
        } else if icon.size == IconSize::Normal {
            icon_classes.push("-normal".into());
        }

        icon_classes
    }

    fn get_note_tag_attrs(
        &mut self,
        icon: &NoteTagIcon,
        status: ActionItemStatus,
        class_names: &[String],
    ) -> AttributeSet {
        let mut attrs = AttributeSet::new();
        attrs.set("class", class_names.join(" "));

        if icon.is_checkbox {
            attrs.set("role", "checkbox".into());
            attrs.set(
                "aria-checked",
                if status.completed() { "true" } else { "false" }.into(),
            );
            attrs.set("aria-disabled", "true".into());
        }

        attrs
    }

    pub(crate) fn render_note_tags(&mut self, note_tags: &[NoteTag]) -> Option<(String, StyleSet)> {
        let mut markup = String::new();
        let mut styles = StyleSet::new();

        if note_tags.is_empty() {
            return None;
        }

        for note_tag in note_tags {
            if let Some(def) = note_tag.definition() {
                if let Some(ColorRef::Manual { r, g, b }) = def.highlight_color() {
                    styles.set("background-color", format!("rgb({},{},{})", r, g, b));
                }

                if let Some(ColorRef::Manual { r, g, b }) = def.text_color() {
                    styles.set("color", format!("rgb({},{},{})", r, g, b));
                }

                if def.shape() != NoteTagShape::NoIcon {
                    let icon = self.note_tag_icon(def.shape(), note_tag.item_status());
                    let icon_classes = self.build_note_tag_class_names(&icon);
                    let attrs =
                        self.get_note_tag_attrs(&icon, note_tag.item_status(), &icon_classes);

                    markup.push_str(&format!(
                        "<span {}><span class=\"text\">{}</span></span>",
                        attrs, icon.emoji_html
                    ));
                }
            }
        }

        Some((markup, styles))
    }

    pub(crate) fn has_note_tag(&self, element: &OutlineElement) -> bool {
        element
            .contents()
            .iter()
            .flat_map(|element| element.rich_text())
            .any(|text| !text.note_tags().is_empty())
    }

    fn note_tag_icon(&self, shape: NoteTagShape, status: ActionItemStatus) -> NoteTagIcon {
        match shape {
            NoteTagShape::GreenCheckBox => self.icon_checkbox(status, COLOR_GREEN),
            NoteTagShape::YellowCheckBox => self.icon_checkbox(status, COLOR_YELLOW),
            NoteTagShape::BlueCheckBox => self.icon_checkbox(status, COLOR_BLUE),
            NoteTagShape::GreenStarCheckBox => self.icon_checkbox_with_star(status, COLOR_GREEN),
            NoteTagShape::YellowStarCheckBox => {
                self.icon_checkbox_with(status, COLOR_YELLOW, ICON_YELLOW_STAR)
            }
            NoteTagShape::BlueStarCheckBox => self.icon_checkbox_with_star(status, COLOR_BLUE),
            NoteTagShape::GreenExclamationCheckBox => {
                self.icon_checkbox_with_exclamation(status, COLOR_GREEN)
            }
            NoteTagShape::YellowExclamationCheckBox => {
                self.icon_checkbox_with_exclamation(status, COLOR_YELLOW)
            }
            NoteTagShape::BlueExclamationCheckBox => {
                self.icon_checkbox_with_exclamation(status, COLOR_BLUE)
            }
            NoteTagShape::GreenRightArrowCheckBox => {
                self.icon_checkbox_with_right_arrow(status, COLOR_GREEN)
            }
            NoteTagShape::YellowRightArrowCheckBox => {
                self.icon_checkbox_with_right_arrow(status, COLOR_YELLOW)
            }
            NoteTagShape::BlueRightArrowCheckBox => {
                self.icon_checkbox_with_right_arrow(status, COLOR_BLUE)
            }
            NoteTagShape::YellowStar => {
                let mut style = StyleSet::new();
                style.set("color", COLOR_YELLOW.to_string());

                (Cow::from(ICON_YELLOW_STAR), IconSize::Normal, style).into()
            }

            NoteTagShape::QuestionMark => (Cow::from(ICON_QUESTION_MARK), IconSize::Normal).into(),

            NoteTagShape::HighPriority => (Cow::from(ICON_ERROR), IconSize::Normal).into(),
            NoteTagShape::ContactInformation => (Cow::from(ICON_PHONE), IconSize::Normal).into(),

            NoteTagShape::LightBulb => (Cow::from(ICON_LIGHT_BULB), IconSize::Normal).into(),

            NoteTagShape::Home => (Cow::from(ICON_HOME), IconSize::Normal).into(),
            NoteTagShape::CommentBubble => (Cow::from(ICON_BUBBLE), IconSize::Normal).into(),

            NoteTagShape::AwardRibbon => (Cow::from(ICON_AWARD), IconSize::Normal).into(),

            NoteTagShape::BlueCheckBox1 => self.icon_checkbox_with_1(status, COLOR_BLUE),

            NoteTagShape::BlueCheckBox2 => self.icon_checkbox_with_2(status, COLOR_BLUE),

            NoteTagShape::BlueCheckBox3 => self.icon_checkbox_with_3(status, COLOR_BLUE),

            NoteTagShape::BlueCheckMark => self.icon_checkmark(COLOR_BLUE),
            NoteTagShape::BlueCircle => self.normal_icon(ICON_CIRCLE_BLUE),

            NoteTagShape::GreenCheckBox1 => self.icon_checkbox_with_1(status, COLOR_GREEN),

            NoteTagShape::GreenCheckBox2 => self.icon_checkbox_with_2(status, COLOR_GREEN),

            NoteTagShape::GreenCheckBox3 => self.icon_checkbox_with_3(status, COLOR_GREEN),

            NoteTagShape::GreenCheckMark => self.icon_checkmark(COLOR_GREEN),
            NoteTagShape::GreenCircle => self.normal_icon(ICON_CIRCLE_GREEN),

            NoteTagShape::YellowCheckBox1 => self.icon_checkbox_with_1(status, COLOR_YELLOW),

            NoteTagShape::YellowCheckBox2 => self.icon_checkbox_with_2(status, COLOR_YELLOW),

            NoteTagShape::YellowCheckBox3 => self.icon_checkbox_with_3(status, COLOR_YELLOW),

            NoteTagShape::YellowCheckMark => self.icon_checkmark(COLOR_YELLOW),
            // This icon is more orange than yellow in OneNote
            NoteTagShape::YellowCircle => self.normal_icon(ICON_CIRCLE_ORANGE),

            NoteTagShape::BluePersonCheckBox => self.icon_checkbox_with_person(status, COLOR_BLUE),
            NoteTagShape::YellowPersonCheckBox => {
                self.icon_checkbox_with_person(status, COLOR_YELLOW)
            }
            NoteTagShape::GreenPersonCheckBox => {
                self.icon_checkbox_with_person(status, COLOR_GREEN)
            }
            NoteTagShape::BlueFlagCheckBox => self.icon_checkbox_with_flag(status, COLOR_BLUE),
            NoteTagShape::RedFlagCheckBox => self.icon_checkbox_with_flag(status, COLOR_RED),
            NoteTagShape::GreenFlagCheckBox => self.icon_checkbox_with_flag(status, COLOR_GREEN),
            NoteTagShape::RedSquare => self.normal_icon(ICON_SQUARE_RED),
            NoteTagShape::YellowSquare => self.normal_icon(ICON_SQUARE_YELLOW),
            NoteTagShape::BlueSquare => self.normal_icon(ICON_SQUARE_BLUE),
            NoteTagShape::GreenSquare => self.normal_icon(ICON_SQUARE_GREEN),
            NoteTagShape::OrangeSquare => self.normal_icon(ICON_SQUARE_ORANGE),
            // The pink square is labelled "pink" in OneNote, but displays purple:
            NoteTagShape::PinkSquare => self.normal_icon(ICON_SQUARE_PURPLE),
            NoteTagShape::EMailMessage => (Cow::from(ICON_EMAIL), IconSize::Normal).into(),

            NoteTagShape::Contact => (Cow::from(ICON_CONTACT), IconSize::Normal).into(),

            NoteTagShape::MusicalNote => (Cow::from(ICON_MUSIC), IconSize::Normal).into(),
            NoteTagShape::MovieClip => (Cow::from(ICON_FILM), IconSize::Normal).into(),

            NoteTagShape::HyperlinkGlobe => (Cow::from(ICON_LINK), IconSize::Normal).into(),

            NoteTagShape::Padlock => (Cow::from(ICON_LOCK), IconSize::Normal).into(),
            NoteTagShape::OpenBook => (Cow::from(ICON_BOOK), IconSize::Normal).into(),

            NoteTagShape::BlankPaperWithLines => (Cow::from(ICON_PAPER), IconSize::Normal).into(),

            NoteTagShape::Pen => (Cow::from(ICON_PEN), IconSize::Normal).into(),

            shape => self.icon_fallback(shape),
        }
    }

    fn icon_fallback(&self, shape: NoteTagShape) -> NoteTagIcon {
        log_warn!("Unsupported icon type: {:?}", shape);

        (Cow::from(ICON_QUESTION_MARK), IconSize::Normal).into()
    }

    fn icon_checkbox(&self, status: ActionItemStatus, color: &'static str) -> NoteTagIcon {
        let mut styles = StyleSet::new();
        styles.set("color", color.to_string());

        let html = if status.completed() {
            Cow::from(ICON_CHECKBOX_COMPLETE)
        } else {
            Cow::from(ICON_CHECKBOX_EMPTY)
        };

        NoteTagIcon {
            emoji_html: html,
            size: IconSize::Large,
            styles,
            is_checkbox: true,
        }
    }

    fn icon_checkbox_with_person(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, ICON_PERSON)
    }

    fn icon_checkbox_with_right_arrow(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, ICON_ARROW_RIGHT)
    }

    fn icon_checkbox_with_star(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, ICON_STAR)
    }

    fn icon_checkbox_with_flag(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, ICON_FLAG)
    }

    fn icon_checkbox_with_1(&self, status: ActionItemStatus, color: &'static str) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, "1")
    }

    fn icon_checkbox_with_2(&self, status: ActionItemStatus, color: &'static str) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, "2")
    }

    fn icon_checkbox_with_3(&self, status: ActionItemStatus, color: &'static str) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, "3")
    }

    fn icon_checkbox_with_exclamation(
        &self,
        status: ActionItemStatus,
        color: &'static str,
    ) -> NoteTagIcon {
        self.icon_checkbox_with(status, color, "!")
    }

    fn icon_checkbox_with(
        &self,
        status: ActionItemStatus,
        color: &'static str,
        secondary_icon: &'static str,
    ) -> NoteTagIcon {
        let mut style = StyleSet::new();
        style.set("color", color.to_string());

        let mut content = String::new();
        content.push_str(if status.completed() {
            ICON_CHECKBOX_COMPLETE
        } else {
            ICON_CHECKBOX_EMPTY
        });

        // The secondary icon's styles expect a content element to allow the
        // icon to be overlayed
        let secondary_icon = format!("<span class=\"content\">{secondary_icon}</span>");

        content.push_str(&format!(
            "<span class=\"icon-secondary\">{}</span>",
            secondary_icon
        ));

        NoteTagIcon {
            emoji_html: Cow::from(content),
            size: IconSize::Large,
            styles: style,
            is_checkbox: true,
        }
    }

    fn icon_checkmark(&self, color: &'static str) -> NoteTagIcon {
        let mut style = StyleSet::new();
        style.set("color", color.to_string());

        NoteTagIcon {
            is_checkbox: true,
            emoji_html: Cow::from(ICON_CHECK_MARK),
            size: IconSize::Large,
            styles: style,
        }
    }

    fn normal_icon(&self, icon_html: &'static str) -> NoteTagIcon {
        (Cow::from(icon_html), IconSize::Normal).into()
    }
}
