declare type rationale = {
    title: string;
    message: string;
    buttonPositive: string;
    buttonNegative?: string;
    buttonNeutral?: string;
};
declare const _default: (permissions: string, rationale?: rationale) => Promise<boolean>;
export default _default;
