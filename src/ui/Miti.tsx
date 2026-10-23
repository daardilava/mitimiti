// The MitiMiti logo in the app: Miti (the mascot) and the two-colour wordmark.
import { Text } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { mitiSvg } from '@/lib/miti';
import { font } from './tokens';
import { useTheme } from './theme';

/** Miti, decorative: the wordmark or a title next to it carries the name. */
export function Miti({ size }: { size: number }) {
  return (
    <SvgXml xml={mitiSvg(size)} width={size} height={size} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
  );
}

/** "MitiMiti" in Fredoka, green then coral, for the dark brand and hero surfaces (Welcome). */
export function Wordmark({ size = 28 }: { size?: number }) {
  const { color } = useTheme();
  return (
    <Text accessibilityRole="header" accessibilityLabel="MitiMiti" style={{ fontFamily: font.brand, fontSize: size, lineHeight: size * 1.2 }}>
      <Text style={{ color: color.wordmarkGreen }}>Miti</Text>
      <Text style={{ color: color.wordmarkCoral }}>Miti</Text>
    </Text>
  );
}
