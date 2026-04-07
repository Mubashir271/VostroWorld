import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";
const NotificationSVG = (props) => (
  <Svg
    id="collecticon-"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    x="0px"
    y="0px"
    width="800px"
    height="800px"
    viewBox="0 0 16 16"
    enableBackground="new 0 0 16 16"
    xmlSpace="preserve"
    {...props}
  >
    <Rect id="svgGrid" y={0} fill="none" width={16} height={16} />
    <Path d="M13,9V6.5c0-2.306-1.759-4.222-4-4.472V1.5c0-0.553-0.447-1-1-1s-1,0.447-1,1v0.528C4.759,2.278,3,4.194,3,6.5V9 c0,1.103-0.897,2-2,2v2h14v-2C13.897,11,13,10.103,13,9z M8,15.5c0.931,0,1.716-0.638,1.938-1.5H6.062 C6.284,14.862,7.069,15.5,8,15.5z" />
  </Svg>
);
export default NotificationSVG;
