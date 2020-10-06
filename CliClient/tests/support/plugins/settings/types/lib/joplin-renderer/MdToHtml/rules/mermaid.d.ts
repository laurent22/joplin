declare function style(): ({
    name: string;
    inline?: undefined;
    text?: undefined;
    mime?: undefined;
} | {
    inline: boolean;
    text: string;
    mime: string;
    name?: undefined;
})[];
declare const _default: {
    install: (context: any, ruleOptions: any) => (md: any, mdOptions: any) => void;
    style: typeof style;
};
export default _default;
