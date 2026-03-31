import { ApiKey, ApiKeyCreatedResponse, CreateApiKeyDto } from '@/types/api';
import { del, get, post } from './api';

export const apiKeysApi = {
  list: () => get<ApiKey[]>('/partner/keys'),

  create: (dto: CreateApiKeyDto) => post<ApiKeyCreatedResponse>('/partner/keys', dto),

  revoke: (id: string) => del<void>(`/partner/keys/${id}`),

  rotate: (id: string) => post<ApiKeyCreatedResponse>(`/partner/keys/${id}/rotate`, {}),

  usage: (id: string) => get<ApiKey>(`/partner/keys/${id}/usage`),
};
