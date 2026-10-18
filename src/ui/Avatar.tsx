import { Text, View } from 'react-native';
import { color, font } from './tokens';

/** Initial in a circle: blue for me, orange for the partner. */
export function Avatar({ name, isMe, size = 32 }: { name: string; isMe: boolean; size?: number }) {
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isMe ? color.meTint : color.partnerTint,
      }}
    >
      <Text style={{ fontFamily: font.bodyBold, fontSize: Math.round(size * 0.42), color: isMe ? color.me : color.partnerText }}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
