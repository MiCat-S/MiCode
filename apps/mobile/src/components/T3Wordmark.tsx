import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";

const ThemedPath = withUniwind(Path);

export function T3Wordmark(props: {
  readonly height: number;
  readonly color?: ColorValue;
  readonly colorClassName?: string;
}) {
  const aspectRatio = 88 / 54;
  return (
    <Svg
      accessibilityLabel="MI"
      height={props.height}
      width={props.height * aspectRatio}
      viewBox="0 0 88 54"
    >
      <ThemedPath
        d="M0 54L0 0L10 0L27 25L44 0L54 0L54 54L42 54L42 21L27 43L12 21L12 54ZM65 0L88 0L88 10L82 10L82 44L88 44L88 54L65 54L65 44L71 44L71 10L65 10Z"
        color={props.color}
        colorClassName={props.colorClassName}
        fill="currentColor"
      />
    </Svg>
  );
}
