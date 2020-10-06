interface SearchMarkersOptions {
    searchTimestamp: number;
    selectedIndex: number;
    separateWordSearch: boolean;
}
export interface SearchMarkers {
    keywords: any[];
    options: SearchMarkersOptions;
}
export default function useSearchMarkers(showLocalSearch: boolean, localSearchMarkerOptions: Function, searches: any[], selectedSearchId: string, highlightedWords?: any[]): SearchMarkers;
export {};
