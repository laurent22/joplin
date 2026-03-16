import { AppType } from '@joplin/lib/models/Setting';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
const filterSettingsByQuery = (
  sections: any[],
  query: string,
  appType: AppType,
): string[] => {
  const matchedKeys: string[] = [];
  for (const section of sections) {
    for (const md of section.metadatas) {
      const label = (typeof md.label === 'function' ? md.label(appType) : md.label) || '';
      const desc = (typeof md.description === 'function' ? md.description(appType) : md.description) || '';
      if (label.toLowerCase().includes(query.toLowerCase()) || desc.toLowerCase().includes(query.toLowerCase())) {
        matchedKeys.push(md.key);
      }
    }
  }
  return matchedKeys;
};

export default filterSettingsByQuery;
