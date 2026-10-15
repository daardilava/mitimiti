import type { ColorValue } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// Ported from Icon.dc.html on the canvas: 24×24, 1.8 stroke, round caps. The rest of the 31 icons come next.
const paths: Record<string, React.ReactNode> = {
  house: <Path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  list: <Path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  chart: <Path d="M5 20V11M10.5 20V5M16 20v-6M21 20H3" />,
  settings: (
    <>
      <Path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <Circle cx={15} cy={7} r={2.2} />
      <Circle cx={9} cy={17} r={2.2} />
    </>
  ),
  back: <Path d="M15 5l-7 7 7 7" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, color = 'currentColor' }: { name: IconName; size?: number; color?: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </Svg>
  );
}
