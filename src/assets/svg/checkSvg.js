import * as React from "react";
import Svg, { Polyline } from "react-native-svg";
const CheckSvg = (props) => (
  <Svg
    fill="#fff"
    width="800px"
    height="800px"
    viewBox="0 0 24 24"
    id="check"
    data-name="Line Color"
    xmlns="http://www.w3.org/2000/svg"
    className="icon line-color"
    {...props}
  >
    <Polyline
      id="primary"
      points="5 12 10 17 19 8"
      style={{
        fill: "none",
        stroke: "#fff",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeWidth: 3,
      }}
    />
  </Svg>
);
export default CheckSvg;
