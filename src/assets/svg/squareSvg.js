import * as React from "react";
import Svg, { Rect } from "react-native-svg";
const SquareSvg = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#000000"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
  </Svg>
);
export default SquareSvg;
