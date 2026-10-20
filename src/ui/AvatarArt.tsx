// The avatar characters: flat, round, big-eyed heads on a coloured tile, drawn on a 100 × 100 grid.
// Colours come from avatarArt / avatarTiles in tokens.ts; only the tile changes between light and dark mode.
import { Fragment, type ReactNode } from 'react';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import type { AvatarId } from '@/lib/avatars';
import { avatarArt, avatarTiles } from './tokens';
import { useTheme } from './theme';

const { ink, white, cheek, tongue } = avatarArt;

type Colors = (typeof avatarArt.characters)[AvatarId];

export function AvatarArt({ id, size }: { id: AvatarId; size: number }) {
  const { scheme } = useTheme();
  const c = avatarArt.characters[id];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <Rect x={0} y={0} width={100} height={100} fill={avatarTiles[scheme][id]} />
      {draw[id](c)}
    </Svg>
  );
}

// ─── Shared pieces ────────────────────────────────────────────────────────

/** The top of the body, cut off by the tile's bottom edge. */
const Shoulders = ({ fill }: { fill: string }) => <Ellipse cx={50} cy={112} rx={36} ry={28} fill={fill} />;

function Eyes({ y = 54, dx = 12, r = 8.5 }: { y?: number; dx?: number; r?: number }) {
  const pupil = r * 0.6;
  return (
    <>
      {[50 - dx, 50 + dx].map((x) => (
        <Fragment key={x}>
          <Circle cx={x} cy={y} r={r} fill={white} />
          <Circle cx={x + r * 0.12} cy={y + r * 0.12} r={pupil} fill={ink} />
          <Circle cx={x + r * 0.32} cy={y - r * 0.2} r={pupil * 0.36} fill={white} />
        </Fragment>
      ))}
    </>
  );
}

const Cheeks = ({ y = 66, dx = 22 }: { y?: number; dx?: number }) => (
  <>
    <Ellipse cx={50 - dx} cy={y} rx={5} ry={3.5} fill={cheek} opacity={0.55} />
    <Ellipse cx={50 + dx} cy={y} rx={5} ry={3.5} fill={cheek} opacity={0.55} />
  </>
);

const Stroke = ({ d, color = ink, width = 2.6 }: { d: string; color?: string; width?: number }) => (
  <Path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
);

const Whiskers = ({ y }: { y: number }) => (
  <>
    {[
      [30, y, 15, y - 3],
      [30, y + 4, 16, y + 7],
      [70, y, 85, y - 3],
      [70, y + 4, 84, y + 7],
    ].map(([x1, y1, x2, y2]) => (
      <Line key={`${x1}-${y1}-${x2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={1.6} strokeLinecap="round" opacity={0.55} />
    ))}
  </>
);

// ─── Characters ───────────────────────────────────────────────────────────

const draw: Record<AvatarId, (c: Colors) => ReactNode> = {
  fox: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Ellipse cx={50} cy={104} rx={16} ry={16} fill={c.light} />
      <Path d="M24 46 L26 12 L48 32 Z" fill={c.fur} />
      <Path d="M76 46 L74 12 L52 32 Z" fill={c.fur} />
      <Path d="M29 38 L30 20 L42 31 Z" fill={c.accent} />
      <Path d="M71 38 L70 20 L58 31 Z" fill={c.accent} />
      <Ellipse cx={50} cy={58} rx={31} ry={27} fill={c.fur} />
      <Path d="M50 56 C42 62 30 64 20 60 C24 76 38 86 50 86 C62 86 76 76 80 60 C70 64 58 62 50 56 Z" fill={c.light} />
      <Eyes y={52} dx={13} />
      <Ellipse cx={50} cy={68} rx={4.5} ry={3.2} fill={c.detail} />
      <Stroke d="M45 74 Q50 78 55 74" />
      <Cheeks y={66} dx={23} />
    </>
  ),

  cat: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Path d="M22 50 L24 16 L46 34 Z" fill={c.fur} />
      <Path d="M78 50 L76 16 L54 34 Z" fill={c.fur} />
      <Path d="M27 42 L28 24 L40 35 Z" fill={c.detail} />
      <Path d="M73 42 L72 24 L60 35 Z" fill={c.detail} />
      <Ellipse cx={50} cy={58} rx={31} ry={28} fill={c.fur} />
      <Stroke d="M50 32 L50 40" color={c.accent} width={3.5} />
      <Stroke d="M42 33 L44 40" color={c.accent} width={3.5} />
      <Stroke d="M58 33 L56 40" color={c.accent} width={3.5} />
      <Ellipse cx={44} cy={71} rx={8} ry={6} fill={c.light} />
      <Ellipse cx={56} cy={71} rx={8} ry={6} fill={c.light} />
      <Eyes y={54} dx={12} />
      <Path d="M46 65 L54 65 L50 69.5 Z" fill={c.detail} stroke={c.detail} strokeWidth={1.5} strokeLinejoin="round" />
      <Stroke d="M44 72.5 Q47 75.5 50 72.5 Q53 75.5 56 72.5" width={2.2} />
      <Whiskers y={68} />
      <Cheeks y={65} dx={23} />
    </>
  ),

  bear: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Circle cx={27} cy={34} r={12} fill={c.fur} />
      <Circle cx={73} cy={34} r={12} fill={c.fur} />
      <Circle cx={27} cy={34} r={6.5} fill={c.accent} />
      <Circle cx={73} cy={34} r={6.5} fill={c.accent} />
      <Circle cx={50} cy={59} r={30} fill={c.fur} />
      <Ellipse cx={50} cy={71} rx={14} ry={11} fill={c.light} />
      <Eyes y={54} dx={12} r={7.5} />
      <Ellipse cx={50} cy={66} rx={5} ry={3.6} fill={c.detail} />
      <Stroke d="M50 69.5 L50 73 M45 74.5 Q50 79 55 74.5" color={c.detail} width={2.4} />
      <Cheeks y={66} dx={23} />
    </>
  ),

  panda: (c) => (
    <>
      <Shoulders fill={c.accent} />
      <Circle cx={27} cy={33} r={11} fill={c.accent} />
      <Circle cx={73} cy={33} r={11} fill={c.accent} />
      <Ellipse cx={50} cy={59} rx={31} ry={29} fill={c.fur} />
      <Ellipse cx={37} cy={56} rx={9} ry={11.5} fill={c.accent} transform="rotate(30 37 56)" />
      <Ellipse cx={63} cy={56} rx={9} ry={11.5} fill={c.accent} transform="rotate(-30 63 56)" />
      <Eyes y={55} dx={12} r={6} />
      <Ellipse cx={50} cy={68} rx={4.5} ry={3.2} fill={c.detail} />
      <Stroke d="M45.5 73 Q50 77 54.5 73" />
      <Cheeks y={69} dx={22} />
    </>
  ),

  owl: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Ellipse cx={50} cy={106} rx={18} ry={18} fill={c.light} />
      <Path d="M20 44 L22 16 L40 32 Z" fill={c.accent} />
      <Path d="M80 44 L78 16 L60 32 Z" fill={c.accent} />
      <Ellipse cx={50} cy={58} rx={32} ry={28} fill={c.fur} />
      <Circle cx={37} cy={54} r={13} fill={c.light} />
      <Circle cx={63} cy={54} r={13} fill={c.light} />
      <Eyes y={54} dx={13} r={9.5} />
      <Stroke d="M24 40 Q37 34 50 44 Q63 34 76 40" color={c.accent} width={4} />
      <Path d="M44 66 L56 66 L50 75 Z" fill={c.detail} stroke={c.detail} strokeWidth={2} strokeLinejoin="round" />
      <Cheeks y={72} dx={24} />
    </>
  ),

  frog: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Ellipse cx={50} cy={106} rx={20} ry={16} fill={c.light} />
      <Circle cx={33} cy={38} r={14} fill={c.fur} />
      <Circle cx={67} cy={38} r={14} fill={c.fur} />
      <Ellipse cx={50} cy={62} rx={36} ry={25} fill={c.fur} />
      <Ellipse cx={50} cy={74} rx={24} ry={11} fill={c.light} />
      <Eyes y={37} dx={17} r={9.5} />
      <Circle cx={46} cy={57} r={1.5} fill={c.detail} />
      <Circle cx={54} cy={57} r={1.5} fill={c.detail} />
      <Stroke d="M32 66 Q50 80 68 66" color={c.detail} width={3} />
      <Cheeks y={64} dx={27} />
    </>
  ),

  bunny: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Ellipse cx={37} cy={24} rx={9} ry={22} fill={c.fur} transform="rotate(-10 37 24)" />
      <Ellipse cx={63} cy={24} rx={9} ry={22} fill={c.fur} transform="rotate(10 63 24)" />
      <Ellipse cx={37} cy={26} rx={4.5} ry={15} fill={c.detail} transform="rotate(-10 37 26)" />
      <Ellipse cx={63} cy={26} rx={4.5} ry={15} fill={c.detail} transform="rotate(10 63 26)" />
      <Ellipse cx={50} cy={60} rx={30} ry={27} fill={c.fur} />
      <Ellipse cx={45} cy={69} rx={7} ry={5.5} fill={c.accent} />
      <Ellipse cx={55} cy={69} rx={7} ry={5.5} fill={c.accent} />
      <Rect x={46.5} y={72} width={7} height={7} rx={1.5} fill={white} stroke={c.accent} strokeWidth={1} />
      <Line x1={50} y1={72.5} x2={50} y2={78.5} stroke={c.accent} strokeWidth={1} />
      <Eyes y={54} dx={12} />
      <Ellipse cx={50} cy={65.5} rx={3.8} ry={2.8} fill={c.detail} />
      <Cheeks y={66} dx={22} />
    </>
  ),

  penguin: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Ellipse cx={50} cy={106} rx={20} ry={18} fill={c.light} />
      <Circle cx={50} cy={58} r={31} fill={c.fur} />
      <Path d="M50 44 C44 34 24 36 24 56 C24 74 38 84 50 84 C62 84 76 74 76 56 C76 36 56 34 50 44 Z" fill={c.light} />
      <Eyes y={56} dx={11} r={8} />
      <Path d="M43 66 Q50 62 57 66 Q50 74 43 66 Z" fill={c.detail} />
      <Cheeks y={70} dx={19} />
    </>
  ),

  pig: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Path d="M22 44 L26 18 L44 34 Z" fill={c.fur} />
      <Path d="M78 44 L74 18 L56 34 Z" fill={c.fur} />
      <Path d="M27 37 L29 25 L38 33 Z" fill={c.accent} />
      <Path d="M73 37 L71 25 L62 33 Z" fill={c.accent} />
      <Ellipse cx={50} cy={59} rx={31} ry={28} fill={c.fur} />
      <Eyes y={52} dx={13} r={7.5} />
      <Ellipse cx={50} cy={69} rx={11} ry={8} fill={c.light} stroke={c.accent} strokeWidth={2} />
      <Ellipse cx={46} cy={69} rx={2} ry={3} fill={c.detail} />
      <Ellipse cx={54} cy={69} rx={2} ry={3} fill={c.detail} />
      <Stroke d="M45 80 Q50 83 55 80" color={c.detail} />
      <Cheeks y={64} dx={24} />
    </>
  ),

  tiger: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Circle cx={26} cy={35} r={10} fill={c.fur} />
      <Circle cx={74} cy={35} r={10} fill={c.fur} />
      <Circle cx={26} cy={35} r={5} fill={c.light} />
      <Circle cx={74} cy={35} r={5} fill={c.light} />
      <Ellipse cx={50} cy={59} rx={32} ry={28} fill={c.fur} />
      <Stroke d="M50 32 L50 40" color={c.accent} width={3.5} />
      <Stroke d="M43 33 L45 39" color={c.accent} width={3.5} />
      <Stroke d="M57 33 L55 39" color={c.accent} width={3.5} />
      <Stroke d="M19 55 L28 57 M19.5 63 L28 63" color={c.accent} width={3.5} />
      <Stroke d="M81 55 L72 57 M80.5 63 L72 63" color={c.accent} width={3.5} />
      <Ellipse cx={44} cy={72} rx={9} ry={7} fill={c.light} />
      <Ellipse cx={56} cy={72} rx={9} ry={7} fill={c.light} />
      <Eyes y={53} dx={13} />
      <Path d="M45.5 65 L54.5 65 L50 69.5 Z" fill={c.detail} stroke={c.detail} strokeWidth={1.5} strokeLinejoin="round" />
      <Stroke d="M44 73.5 Q47 76.5 50 73.5 Q53 76.5 56 73.5" width={2.2} />
    </>
  ),

  dog: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Ellipse cx={50} cy={58} rx={29} ry={28} fill={c.fur} />
      <Ellipse cx={22} cy={56} rx={10} ry={20} fill={c.accent} transform="rotate(15 22 56)" />
      <Ellipse cx={78} cy={56} rx={10} ry={20} fill={c.accent} transform="rotate(-15 78 56)" />
      <Ellipse cx={50} cy={70} rx={15} ry={12} fill={c.light} />
      <Eyes y={52} dx={12} />
      <Path d="M46.5 74 Q46.5 82 50 82 Q53.5 82 53.5 74 Z" fill={tongue} />
      <Ellipse cx={50} cy={64} rx={5.5} ry={4} fill={c.detail} />
      <Stroke d="M50 68 L50 71 M44 72 Q50 77 56 72" width={2.4} />
    </>
  ),

  mouse: (c) => (
    <>
      <Shoulders fill={c.fur} />
      <Circle cx={25} cy={34} r={15} fill={c.fur} />
      <Circle cx={75} cy={34} r={15} fill={c.fur} />
      <Circle cx={25} cy={34} r={9} fill={c.accent} />
      <Circle cx={75} cy={34} r={9} fill={c.accent} />
      <Ellipse cx={50} cy={60} rx={28} ry={26} fill={c.fur} />
      <Ellipse cx={50} cy={72} rx={12} ry={9} fill={c.light} />
      <Eyes y={56} dx={11} r={7.5} />
      <Circle cx={50} cy={68} r={3.5} fill={c.detail} />
      <Stroke d="M46 75 Q50 78 54 75" width={2.2} />
      <Whiskers y={70} />
      <Cheeks y={67} dx={20} />
    </>
  ),
};
