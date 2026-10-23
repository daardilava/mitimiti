import { Text, View } from 'react-native';
import type { AvatarId } from '@/lib/avatars';
import { AvatarArt } from './AvatarArt';
import { font } from './tokens';
import { useTheme } from './theme';

/**
 * The character the person picked in Ajustes, or, until they pick one, their initial in a circle: blue for me,
 * coral for the partner. Decorative: the name always sits next to it.
 */
export function Avatar({ name, isMe, avatar, size = 32 }: { name: string; isMe: boolean; avatar?: AvatarId | null; size?: number }) {
  const { color } = useTheme();
  return (
    <View
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isMe ? color.meTint : color.partnerTint,
      }}
    >
      {avatar ? (
        <AvatarArt id={avatar} size={size} />
      ) : (
        <Text style={{ fontFamily: font.bodyBold, fontSize: Math.round(size * 0.42), color: isMe ? color.me : color.partnerText }}>
          {name.charAt(0).toUpperCase()}
        </Text>
      )}
    </View>
  );
}
