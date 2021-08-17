export interface MasterKeyEntity {
  id?: string | null;
  created_time?: number;
  updated_time?: number;
  source_application?: string;
  encryption_method?: number;
  checksum?: string;
  content?: string;
  type_?: number;
  enabled?: number;
}
