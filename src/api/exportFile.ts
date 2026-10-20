// Exportar movimientos: writes the file to the app's cache and opens the system share sheet (save to Files, Drive,
// email, WhatsApp…). The cache is the OS's to clear, so nothing piles up. On web (development only) there is no file
// system, so the browser downloads it instead.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const TYPES = {
  csv: { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' },
} as const;

export type ExportKind = keyof typeof TYPES;

export async function shareTextFile(name: string, contents: string, kind: ExportKind, dialogTitle: string): Promise<void> {
  const { mimeType, UTI } = TYPES[kind];
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([contents], { type: `${mimeType};charset=utf-8` }));
    const link = Object.assign(document.createElement('a'), { href: url, download: name });
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(contents);
  if (!(await Sharing.isAvailableAsync())) throw new Error('sharing_unavailable');
  await Sharing.shareAsync(file.uri, { mimeType, UTI, dialogTitle });
}
