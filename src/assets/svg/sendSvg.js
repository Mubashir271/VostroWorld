import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SendSvg = (props) => (
  <Svg
    width={19}
    height={17}
    viewBox="0 0 19 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <Path
      d="M0 16.5V0.5L19 8.5L0 16.5ZM2 13.5L13.85 8.5L2 3.5V7L8 8.5L2 10V13.5Z"
      fill="black"
    />
  </Svg>
);
export default SendSvg;
