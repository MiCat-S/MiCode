import type { Icon, IconProps } from "@tabler/icons-react-native/types";
import { forwardRef } from "react";
import Svg, { Path } from "react-native-svg";

const SPARKLE =
  "M17.5 1.5C17.9 4.6 19.4 6.1 22.5 6.5 19.4 6.9 17.9 8.4 17.5 11.5 17.1 8.4 15.6 6.9 12.5 6.5 15.6 6.1 17.1 4.6 17.5 1.5Z";

/** Prompt enhancement: lines of text with a sparkle, drawn on Tabler's outline grid. */
export const IconTextEnhance: Icon = forwardRef<Svg, IconProps>(function IconTextEnhance(
  { color = "currentColor", size = 24, strokeWidth = 2, ...rest },
  ref,
) {
  return (
    <Svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <Path d="M3 6h5" />
      <Path d="M3 12h8" />
      <Path d="M3 18h18" />
      <Path d={SPARKLE} fill={color} strokeWidth={1} />
    </Svg>
  );
});
