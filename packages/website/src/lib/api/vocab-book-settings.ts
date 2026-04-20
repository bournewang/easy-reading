import { api } from '@/utils/api';

export type VocabBookSettingsResponse = {
  selectedBookIds: string[];
};

export async function getVocabBookSettings() {
  const response = await api.get<VocabBookSettingsResponse>('/vocab-book-settings');
  return response.data.selectedBookIds || [];
}

export async function replaceVocabBookSettings(selectedBookIds: string[]) {
  const response = await api.put<VocabBookSettingsResponse>('/vocab-book-settings', {
    selectedBookIds,
  });

  return response.data.selectedBookIds || [];
}
