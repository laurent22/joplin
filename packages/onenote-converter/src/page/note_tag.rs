use crate::page::Renderer;
use crate::parser::contents::{NoteTag, OutlineElement};
use crate::parser::property::common::ColorRef;
use crate::parser::property::note_tag::{ActionItemStatus, NoteTagShape};
use crate::utils::StyleSet;
use std::borrow::Cow;

const COLOR_BLUE: &str = "#4673b7";
const COLOR_GREEN: &str = "#369950";
const COLOR_ORANGE: &str = "#dba24d";
const COLOR_PINK: &str = "#f78b9d";
const COLOR_RED: &str = "#db5b4d";
const COLOR_YELLOW: &str = "#ffd678";

const ICON_ARROW_RIGHT: &str = include_str!("../../assets/icons/arrow-right-line.svg");
const ICON_AWARD: &str = include_str!("../../assets/icons/award-line.svg");
const ICON_BOOK: &str = include_str!("../../assets/icons/book-open-line.svg");
const ICON_BUBBLE: &str = include_str!("../../assets/icons/chat-4-line.svg");
const ICON_CHECKBOX_COMPLETE: &str = include_str!("../../assets/icons/checkbox-fill.svg");
const ICON_CHECKBOX_EMPTY: &str = include_str!("../../assets/icons/checkbox-blank-line.svg");
const ICON_CHECK_MARK: &str = include_str!("../../assets/icons/check-line.svg");
const ICON_CIRCLE: &str = include_str!("../../assets/icons/checkbox-blank-circle-fill.svg");
const ICON_CONTACT: &str = include_str!("../../assets/icons/contacts-line.svg");
const ICON_EMAIL: &str = include_str!("../../assets/icons/send-plane-2-line.svg");
const ICON_ERROR: &str = include_str!("../../assets/icons/error-warning-line.svg");
const ICON_FILM: &str = include_str!("../../assets/icons/film-line.svg");
const ICON_FLAG: &str = include_str!("../../assets/icons/flag-fill.svg");
const ICON_HOME: &str = include_str!("../../assets/icons/home-4-line.svg");
const ICON_LIGHT_BULB: &str = include_str!("../../assets/icons/lightbulb-line.svg");
const ICON_LINK: &str = include_str!("../../assets/icons/link.svg");
const ICON_LOCK: &str = include_str!("../../assets/icons/lock-line.svg");
const ICON_MUSIC: &str = include_str!("../../assets/icons/music-fill.svg");
const ICON_PAPER: &str = include_str!("../../assets/icons/file-list-2-line.svg");
const ICON_PEN: &str = include_str!("../../assets/icons/mark-pen-line.svg");
const ICON_PERSON: &str = include_str!("../../assets/icons/user-line.svg");
const ICON_PHONE: &str = include_str!("../../assets/icons/phone-line.svg");
const ICON_QUESTION_MARK: &str = include_str!("../../assets/icons/question-mark.svg");
const ICON_SQUARE: &str = include_str!("../../assets/icons/checkbox-blank-fill.svg");
const ICON_STAR: &str = include_str!("../../assets/icons/star-fill.svg");

#[derive(Debug, Copy, Clone, PartialEq)]
enum IconSize {
    Normal,
    Large,
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
                    let (icon, icon_style) =
                        self.note_tag_icon(def.shape(), note_tag.item_status());
                    let mut icon_classes = vec!["note-tag-icon".to_string()];

                    if icon_style.len() > 0 {
                        let class = self.gen_class("icon");
                        icon_classes.push(class.to_string());

                        self.global_styles
                            .insert(format!(".{} > svg", class), icon_style);
                    }

                    markup.push_str(&format!(
                        "<span class=\"{}\">{}</span>",
                        icon_classes.join(" "),
                        icon
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

    fn note_tag_icon(
        &self,
        shape: NoteTagShape,
        status: ActionItemStatus,
    ) -> (Cow<'static, str>, StyleSet) {
        let mut style = StyleSet::new();

        match shape {
            NoteTagShape::NoIcon => unimplemented!(),
            NoteTagShape::GreenCheckBox => self.icon_checkbox(status, style, COLOR_GREEN),
            NoteTagShape::YellowCheckBox => self.icon_checkbox(status, style, COLOR_YELLOW),
            NoteTagShape::BlueCheckBox => self.icon_checkbox(status, style, COLOR_BLUE),
            NoteTagShape::GreenStarCheckBox => {
                self.icon_checkbox_with_star(status, style, COLOR_GREEN)
            }
            NoteTagShape::YellowStarCheckBox => {
                self.icon_checkbox_with_star(status, style, COLOR_YELLOW)
            }
            NoteTagShape::BlueStarCheckBox => {
                self.icon_checkbox_with_star(status, style, COLOR_BLUE)
            }
            NoteTagShape::GreenExclamationCheckBox => {
                self.icon_checkbox_with_exclamation(status, style, COLOR_GREEN)
            }
            NoteTagShape::YellowExclamationCheckBox => {
                self.icon_checkbox_with_exclamation(status, style, COLOR_YELLOW)
            }
            NoteTagShape::BlueExclamationCheckBox => {
                self.icon_checkbox_with_exclamation(status, style, COLOR_BLUE)
            }
            NoteTagShape::GreenRightArrowCheckBox => {
                self.icon_checkbox_with_right_arrow(status, style, COLOR_GREEN)
            }
            NoteTagShape::YellowRightArrowCheckBox => {
                self.icon_checkbox_with_right_arrow(status, style, COLOR_YELLOW)
            }
            NoteTagShape::BlueRightArrowCheckBox => {
                self.icon_checkbox_with_right_arrow(status, style, COLOR_BLUE)
            }
            NoteTagShape::YellowStar => {
                style.set("fill", COLOR_YELLOW.to_string());

                (
                    Cow::from(ICON_STAR),
                    self.icon_style(IconSize::Normal, style),
                )
            }
            NoteTagShape::BlueFollowUpFlag => unimplemented!(),
            NoteTagShape::QuestionMark => (
                Cow::from(ICON_QUESTION_MARK),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::BlueRightArrow => unimplemented!(),
            NoteTagShape::HighPriority => (
                Cow::from(ICON_ERROR),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::ContactInformation => (
                Cow::from(ICON_PHONE),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::Meeting => unimplemented!(),
            NoteTagShape::TimeSensitive => unimplemented!(),
            NoteTagShape::LightBulb => (
                Cow::from(ICON_LIGHT_BULB),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::Pushpin => unimplemented!(),
            NoteTagShape::Home => (
                Cow::from(ICON_HOME),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::CommentBubble => (
                Cow::from(ICON_BUBBLE),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::SmilingFace => unimplemented!(),
            NoteTagShape::AwardRibbon => (
                Cow::from(ICON_AWARD),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::YellowKey => unimplemented!(),
            NoteTagShape::BlueCheckBox1 => self.icon_checkbox_with_1(status, style, COLOR_BLUE),
            NoteTagShape::BlueCircle1 => unimplemented!(),
            NoteTagShape::BlueCheckBox2 => self.icon_checkbox_with_2(status, style, COLOR_BLUE),
            NoteTagShape::BlueCircle2 => unimplemented!(),
            NoteTagShape::BlueCheckBox3 => self.icon_checkbox_with_3(status, style, COLOR_BLUE),
            NoteTagShape::BlueCircle3 => unimplemented!(),
            NoteTagShape::BlueEightPointStar => unimplemented!(),
            NoteTagShape::BlueCheckMark => self.icon_checkmark(style, COLOR_BLUE),
            NoteTagShape::BlueCircle => self.icon_circle(style, COLOR_BLUE),
            NoteTagShape::BlueDownArrow => unimplemented!(),
            NoteTagShape::BlueLeftArrow => unimplemented!(),
            NoteTagShape::BlueSolidTarget => unimplemented!(),
            NoteTagShape::BlueStar => unimplemented!(),
            NoteTagShape::BlueSun => unimplemented!(),
            NoteTagShape::BlueTarget => unimplemented!(),
            NoteTagShape::BlueTriangle => unimplemented!(),
            NoteTagShape::BlueUmbrella => unimplemented!(),
            NoteTagShape::BlueUpArrow => unimplemented!(),
            NoteTagShape::BlueXWithDots => unimplemented!(),
            NoteTagShape::BlueX => unimplemented!(),
            NoteTagShape::GreenCheckBox1 => self.icon_checkbox_with_1(status, style, COLOR_GREEN),
            NoteTagShape::GreenCircle1 => unimplemented!(),
            NoteTagShape::GreenCheckBox2 => self.icon_checkbox_with_2(status, style, COLOR_GREEN),
            NoteTagShape::GreenCircle2 => unimplemented!(),
            NoteTagShape::GreenCheckBox3 => self.icon_checkbox_with_3(status, style, COLOR_GREEN),
            NoteTagShape::GreenCircle3 => unimplemented!(),
            NoteTagShape::GreenEightPointStar => unimplemented!(),
            NoteTagShape::GreenCheckMark => self.icon_checkmark(style, COLOR_GREEN),
            NoteTagShape::GreenCircle => self.icon_circle(style, COLOR_GREEN),
            NoteTagShape::GreenDownArrow => unimplemented!(),
            NoteTagShape::GreenLeftArrow => unimplemented!(),
            NoteTagShape::GreenRightArrow => unimplemented!(),
            NoteTagShape::GreenSolidArrow => unimplemented!(),
            NoteTagShape::GreenStar => unimplemented!(),
            NoteTagShape::GreenSun => unimplemented!(),
            NoteTagShape::GreenTarget => unimplemented!(),
            NoteTagShape::GreenTriangle => unimplemented!(),
            NoteTagShape::GreenUmbrella => unimplemented!(),
            NoteTagShape::GreenUpArrow => unimplemented!(),
            NoteTagShape::GreenXWithDots => unimplemented!(),
            NoteTagShape::GreenX => unimplemented!(),
            NoteTagShape::YellowCheckBox1 => self.icon_checkbox_with_1(status, style, COLOR_YELLOW),
            NoteTagShape::YellowCircle1 => unimplemented!(),
            NoteTagShape::YellowCheckBox2 => self.icon_checkbox_with_2(status, style, COLOR_YELLOW),
            NoteTagShape::YellowCircle2 => unimplemented!(),
            NoteTagShape::YellowCheckBox3 => self.icon_checkbox_with_3(status, style, COLOR_YELLOW),
            NoteTagShape::YellowCircle3 => unimplemented!(),
            NoteTagShape::YellowEightPointStar => unimplemented!(),
            NoteTagShape::YellowCheckMark => self.icon_checkmark(style, COLOR_YELLOW),
            NoteTagShape::YellowCircle => self.icon_circle(style, COLOR_YELLOW),
            NoteTagShape::YellowDownArrow => unimplemented!(),
            NoteTagShape::YellowLeftArrow => unimplemented!(),
            NoteTagShape::YellowRightArrow => unimplemented!(),
            NoteTagShape::YellowSolidTarget => unimplemented!(),
            NoteTagShape::YellowSun => unimplemented!(),
            NoteTagShape::YellowTarget => unimplemented!(),
            NoteTagShape::YellowTriangle => unimplemented!(),
            NoteTagShape::YellowUmbrella => unimplemented!(),
            NoteTagShape::YellowUpArrow => unimplemented!(),
            NoteTagShape::YellowXWithDots => unimplemented!(),
            NoteTagShape::YellowX => unimplemented!(),
            NoteTagShape::FollowUpTodayFlag => unimplemented!(),
            NoteTagShape::FollowUpTomorrowFlag => unimplemented!(),
            NoteTagShape::FollowUpThisWeekFlag => unimplemented!(),
            NoteTagShape::FollowUpNextWeekFlag => unimplemented!(),
            NoteTagShape::NoFollowUpDateFlag => unimplemented!(),
            NoteTagShape::BluePersonCheckBox => {
                self.icon_checkbox_with_person(status, style, COLOR_BLUE)
            }
            NoteTagShape::YellowPersonCheckBox => {
                self.icon_checkbox_with_person(status, style, COLOR_YELLOW)
            }
            NoteTagShape::GreenPersonCheckBox => {
                self.icon_checkbox_with_person(status, style, COLOR_GREEN)
            }
            NoteTagShape::BlueFlagCheckBox => {
                self.icon_checkbox_with_flag(status, style, COLOR_BLUE)
            }
            NoteTagShape::RedFlagCheckBox => self.icon_checkbox_with_flag(status, style, COLOR_RED),
            NoteTagShape::GreenFlagCheckBox => {
                self.icon_checkbox_with_flag(status, style, COLOR_GREEN)
            }
            NoteTagShape::RedSquare => self.icon_square(style, COLOR_RED),
            NoteTagShape::YellowSquare => self.icon_square(style, COLOR_YELLOW),
            NoteTagShape::BlueSquare => self.icon_square(style, COLOR_BLUE),
            NoteTagShape::GreenSquare => self.icon_square(style, COLOR_GREEN),
            NoteTagShape::OrangeSquare => self.icon_square(style, COLOR_ORANGE),
            NoteTagShape::PinkSquare => self.icon_square(style, COLOR_PINK),
            NoteTagShape::EMailMessage => (
                Cow::from(ICON_EMAIL),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::ClosedEnvelope => unimplemented!(),
            NoteTagShape::OpenEnvelope => unimplemented!(),
            NoteTagShape::MobilePhone => unimplemented!(),
            NoteTagShape::TelephoneWithClock => unimplemented!(),
            NoteTagShape::QuestionBalloon => unimplemented!(),
            NoteTagShape::PaperClip => unimplemented!(),
            NoteTagShape::FrowningFace => unimplemented!(),
            NoteTagShape::InstantMessagingContactPerson => unimplemented!(),
            NoteTagShape::PersonWithExclamationMark => unimplemented!(),
            NoteTagShape::TwoPeople => unimplemented!(),
            NoteTagShape::ReminderBell => unimplemented!(),
            NoteTagShape::Contact => (
                Cow::from(ICON_CONTACT),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::RoseOnAStem => unimplemented!(),
            NoteTagShape::CalendarDateWithClock => unimplemented!(),
            NoteTagShape::MusicalNote => (
                Cow::from(ICON_MUSIC),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::MovieClip => (
                Cow::from(ICON_FILM),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::QuotationMark => unimplemented!(),
            NoteTagShape::Globe => unimplemented!(),
            NoteTagShape::HyperlinkGlobe => (
                Cow::from(ICON_LINK),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::Laptop => unimplemented!(),
            NoteTagShape::Plane => unimplemented!(),
            NoteTagShape::Car => unimplemented!(),
            NoteTagShape::Binoculars => unimplemented!(),
            NoteTagShape::PresentationSlide => unimplemented!(),
            NoteTagShape::Padlock => (
                Cow::from(ICON_LOCK),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::OpenBook => (
                Cow::from(ICON_BOOK),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::NotebookWithClock => unimplemented!(),
            NoteTagShape::BlankPaperWithLines => (
                Cow::from(ICON_PAPER),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::Research => unimplemented!(),
            NoteTagShape::Pen => (
                Cow::from(ICON_PEN),
                self.icon_style(IconSize::Normal, style),
            ),
            NoteTagShape::DollarSign => unimplemented!(),
            NoteTagShape::CoinsWithAWindowBackdrop => unimplemented!(),
            NoteTagShape::ScheduledTask => unimplemented!(),
            NoteTagShape::LightningBolt => unimplemented!(),
            NoteTagShape::Cloud => unimplemented!(),
            NoteTagShape::Heart => unimplemented!(),
            NoteTagShape::Sunflower => unimplemented!(),
        }
    }

    fn icon_checkbox(
        &self,
        status: ActionItemStatus,
        mut style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        style.set("fill", color.to_string());

        if status.completed() {
            (
                Cow::from(ICON_CHECKBOX_COMPLETE),
                self.icon_style(IconSize::Large, style),
            )
        } else {
            (
                Cow::from(ICON_CHECKBOX_EMPTY),
                self.icon_style(IconSize::Large, style),
            )
        }
    }

    fn icon_checkbox_with_person(
        &self,
        status: ActionItemStatus,
        style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        self.icon_checkbox_with(status, style, color, ICON_PERSON)
    }

    fn icon_checkbox_with_right_arrow(
        &self,
        status: ActionItemStatus,
        style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        self.icon_checkbox_with(status, style, color, ICON_ARROW_RIGHT)
    }

    fn icon_checkbox_with_star(
        &self,
        status: ActionItemStatus,
        style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        self.icon_checkbox_with(status, style, color, ICON_STAR)
    }

    fn icon_checkbox_with_flag(
        &self,
        status: ActionItemStatus,
        style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        self.icon_checkbox_with(status, style, color, ICON_FLAG)
    }

    fn icon_checkbox_with_1(
        &self,
        status: ActionItemStatus,
        style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        self.icon_checkbox_with(status, style, color, "<span class=\"content\">1</span>")
    }

    fn icon_checkbox_with_2(
        &self,
        status: ActionItemStatus,
        style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        self.icon_checkbox_with(status, style, color, "<span class=\"content\">2</span>")
    }

    fn icon_checkbox_with_3(
        &self,
        status: ActionItemStatus,
        style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        self.icon_checkbox_with(status, style, color, "<span class=\"content\">3</span>")
    }

    fn icon_checkbox_with_exclamation(
        &self,
        status: ActionItemStatus,
        style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        self.icon_checkbox_with(status, style, color, "<span class=\"content\">!</span>")
    }

    fn icon_checkbox_with(
        &self,
        status: ActionItemStatus,
        mut style: StyleSet,
        color: &'static str,
        secondary_icon: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        style.set("fill", color.to_string());

        let mut content = String::new();
        content.push_str(if status.completed() {
            ICON_CHECKBOX_COMPLETE
        } else {
            ICON_CHECKBOX_EMPTY
        });

        content.push_str(&format!(
            "<span class=\"icon-secondary\">{}</span>",
            secondary_icon
        ));

        (Cow::from(content), self.icon_style(IconSize::Large, style))
    }

    fn icon_checkmark(
        &self,
        mut style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        style.set("fill", color.to_string());

        (
            Cow::from(ICON_CHECK_MARK),
            self.icon_style(IconSize::Large, style),
        )
    }

    fn icon_circle(
        &self,
        mut style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        style.set("fill", color.to_string());

        (
            Cow::from(ICON_CIRCLE),
            self.icon_style(IconSize::Normal, style),
        )
    }

    fn icon_square(
        &self,
        mut style: StyleSet,
        color: &'static str,
    ) -> (Cow<'static, str>, StyleSet) {
        style.set("fill", color.to_string());

        (
            Cow::from(ICON_SQUARE),
            self.icon_style(IconSize::Large, style),
        )
    }

    fn icon_style(&self, size: IconSize, mut style: StyleSet) -> StyleSet {
        match size {
            IconSize::Normal => {
                style.set("height", "16px".to_string());
                style.set("width", "16px".to_string());
            }
            IconSize::Large => {
                style.set("height", "20px".to_string());
                style.set("width", "20px".to_string());
            }
        }

        match (self.in_list, size) {
            (false, IconSize::Normal) => {
                style.set("left", "-23px".to_string());
            }
            (false, IconSize::Large) => {
                style.set("left", "-25px".to_string());
            }
            (true, IconSize::Normal) => {
                style.set("left", "-38px".to_string());
            }
            (true, IconSize::Large) => {
                style.set("left", "-40px".to_string());
            }
        };

        style
    }
}
