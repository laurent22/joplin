export interface SharedData {
    title?: string;
    text?: string;
    resources?: string[];
}
declare const ShareExtension: {
    data: () => any;
    close: () => any;
};
export default ShareExtension;
