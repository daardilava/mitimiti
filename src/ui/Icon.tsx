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
  cart: (
    <>
      <Circle cx={9} cy={20} r={1.4} />
      <Circle cx={18} cy={20} r={1.4} />
      <Path d="M2.5 3.5h2.8l2.4 11.4a1.6 1.6 0 0 0 1.6 1.3h8.6a1.6 1.6 0 0 0 1.6-1.2L21 8H6" />
    </>
  ),
  food: <Path d="M6 3v6a3 3 0 0 0 6 0V3M9 3v18M18 21V3c-2.2 1.2-3.5 4-3.5 7.5 0 2.3 1.4 3.5 3.5 3.5" />,
  home: <Path d="M3 11l9-7 9 7M5.5 9.5V20h13V9.5M10 20v-5.5h4V20" />,
  bolt: <Path d="M13 2.5L4.5 13.5H11l-1 8 8.5-11H12z" />,
  car: (
    <>
      <Path d="M3.5 16.5V12l2-5.2A2 2 0 0 1 7.4 5.5h9.2a2 2 0 0 1 1.9 1.3l2 5.2v4.5M3.5 12h17M3.5 16.5h17" />
      <Circle cx={7.5} cy={18.5} r={1.5} />
      <Circle cx={16.5} cy={18.5} r={1.5} />
    </>
  ),
  ticket: <Path d="M3 7.5h18V10a2 2 0 0 0 0 4v2.5H3V14a2 2 0 0 0 0-4zM14.5 8v1.5M14.5 11.25v1.5M14.5 14.5V16" />,
  plane: <Path d="M21 15.5v-2l-8-5V4a1.5 1.5 0 0 0-3 0v4.5l-8 5v2l8-2.5V18l-2.5 2v1.5L12 20l3.5 1.5V20L13 18v-5z" />,
  gift: <Path d="M4 8h16a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM5 12v8.5h14V12M12 8v12.5M12 8C10.5 4.5 6.5 4 6.5 6.3 6.5 8 9.5 8 12 8zM12 8c1.5-3.5 5.5-4 5.5-1.7C17.5 8 14.5 8 12 8z" />,
  dots: <Path d="M5.5 12h.01M12 12h.01M18.5 12h.01" strokeWidth={3.6} />,
  swap: <Path d="M4 8h15M15.5 4.5L19 8l-3.5 3.5M20 16H5M8.5 12.5L5 16l3.5 3.5" />,
  trash: <Path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5.5M14 11v5.5" />,
  edit: <Path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  copy: <Path d="M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />,
  share: <Path d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" />,
  bell: <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15zM10 20.5a2 2 0 0 0 4 0" />,
  mail: <Path d="M4 5.5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1zM3.5 7l8.5 6.5L20.5 7" />,
  minus: <Path d="M5 12h14" />,
  user: <Path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.8-3.6 3.7-5.5 7.5-5.5s6.7 1.9 7.5 5.5" />,
  lock: <Path d="M6 10.5h12a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8.5a1 1 0 0 1 1-1zM8 10.5V7.5a4 4 0 0 1 8 0v3M12 15v2.5" />,
  eye: <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  eyeOff: <Path d="M4 4l16 16M10.6 6.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4M6.6 7.6C4 9.3 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M9.9 9.9a3 3 0 0 0 4.2 4.2" />,
};

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, color = 'currentColor' }: { name: IconName; size?: number; color?: ColorValue }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </Svg>
  );
}
