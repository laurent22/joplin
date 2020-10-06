interface Term {
    name: string;
    value: string;
    negated: boolean;
}
export default function queryBuilder(terms: Term[], fuzzy: boolean): {
    query: string;
    params: string[];
};
export {};
