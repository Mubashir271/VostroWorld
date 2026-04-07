import * as React from "react";
import Svg, { Path } from "react-native-svg";
const PlusSvg = ({ fill = "rgb(0, 0, 0)", ...props }) => (
  <Svg
    width="800px"
    height="800px"
    viewBox="0 0 24 24"
    id="plus"
    data-name="Flat Color"
    xmlns="http://www.w3.org/2000/svg"
    className="icon flat-color"
    {...props}
  >
    <Path
      id="primary"
      d="M12,20a1,1,0,0,1-1-1V13H5a1,1,0,0,1,0-2h6V5a1,1,0,0,1,2,0v6h6a1,1,0,0,1,0,2H13v6A1,1,0,0,1,12,20Z"
      fill={fill}
    />
  </Svg>
);
export default PlusSvg;
