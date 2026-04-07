import * as React from "react";
import Svg, { Path } from "react-native-svg";
const BurgerSVG = (props) => (
  <Svg
    width="20px"
    height="20px"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <Path
      d="M5 6H12H19M5 12H19M5 18H19"
      stroke="#000000"
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);
export default BurgerSVG;
