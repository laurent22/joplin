macro_rules! guid {
    ({ $p0:tt - $p1:tt - $p2:tt - $p3:tt - $p4:tt }) => {
        crate::parser::shared::guid::Guid::from_str(concat!(
            stringify!($p0),
            '-',
            stringify!($p1),
            '-',
            stringify!($p2),
            '-',
            stringify!($p3),
            '-',
            stringify!($p4),
        ))
        .unwrap()
    };
}

macro_rules! exguid {
    ({$guid:tt , $n:literal}) => {
        crate::parser::fsshttpb::data::exguid::ExGuid::from_guid(guid!($guid), $n)
    };
}

#[cfg(test)]
mod test {
    use crate::parser::fsshttpb::data::exguid::ExGuid;
    use crate::parser::shared::guid::Guid;

    #[test]
    fn parse_guid() {
        let guid = guid!({ 1A5A319C - C26B - 41AA - B9C5 - 9BD8C44E07D4 });

        assert_eq!(
            guid,
            Guid::from_str("1A5A319C-C26B-41AA-B9C5-9BD8C44E07D4").unwrap()
        );
    }

    #[test]
    fn parse_exguid() {
        let guid = exguid!({{1A5A319C-C26B-41AA-B9C5-9BD8C44E07D4}, 1});

        assert_eq!(
            guid,
            ExGuid::from_guid(
                Guid::from_str("1A5A319C-C26B-41AA-B9C5-9BD8C44E07D4").unwrap(),
                1
            )
        );
    }
}
