// Receipt photo for quick entry (docs/QUICK_ENTRY.md, slice 5): take or pick a photo, shrink it on the phone, and
// hand back JPEG base64 for parse-expense. The photo is never stored (not on the phone by us, not on the server).
// Both modules are in Expo Go.
import { SaveFormat, ImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

/** Long side of the image sent: enough to read a receipt's total, small enough to send fast. */
const MAX_SIDE = 1024;

export type ReceiptPick = { kind: 'image'; base64: string } | { kind: 'cancelled' } | { kind: 'denied' } | { kind: 'failed' };

export async function pickReceipt(from: 'camera' | 'library'): Promise<ReceiptPick> {
  try {
    if (from === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { kind: 'denied' };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false };
    const picked = from === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (picked.canceled || !picked.assets?.[0]) return { kind: 'cancelled' };

    const { uri, width, height } = picked.assets[0];
    const context = ImageManipulator.manipulate(uri);
    if (Math.max(width, height) > MAX_SIDE) {
      context.resize(width >= height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
    }
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
    return saved.base64 ? { kind: 'image', base64: saved.base64 } : { kind: 'failed' };
  } catch {
    return { kind: 'failed' };
  }
}
