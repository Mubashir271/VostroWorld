import * as React from "react";
import Svg, { Path } from "react-native-svg";
const UndoSvg = (props) => (
  <Svg
    width={18}
    height={16}
    viewBox="0 0 18 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <Path
      d="M1.5 5H12C12 5 17 5 17 9.706C17 15 12 15 12 15H3.286"
      stroke="#777E90"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.5 8.5L1 5L4.5 1.5"
      stroke="#777E90"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default UndoSvg;
