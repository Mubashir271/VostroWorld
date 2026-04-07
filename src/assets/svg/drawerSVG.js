import * as React from "react";
import Svg, { Path } from "react-native-svg";
const DrawerSvg = (props) => (
  <Svg
    width="800px"
    height="800px"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    {...props}
  >
    <Path
      stroke="#000000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 6H20M4 12H20M4 18H20"
    />
  </Svg>
);
export default DrawerSvg;
