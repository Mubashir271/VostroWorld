import * as React from "react";
import Svg, { Path } from "react-native-svg";
const RestartSvg = (props) => (
  <Svg
    width={21}
    height={20}
    viewBox="0 0 21 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <Path
      d="M18.74 11.25C18.1366 15.2592 14.6775 18.3333 10.5 18.3333C5.89746 18.3333 2.16663 14.6025 2.16663 9.99999C2.16663 5.39749 5.89746 1.66666 10.5 1.66666C13.9166 1.66666 16.8541 3.72332 18.14 6.66666"
      stroke="black"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14.6666 6.66667H18.3333C18.399 6.66667 18.464 6.65373 18.5246 6.62861C18.5853 6.60348 18.6404 6.56665 18.6868 6.52022C18.7333 6.47379 18.7701 6.41867 18.7952 6.35801C18.8204 6.29734 18.8333 6.23233 18.8333 6.16667V2.5"
      stroke="black"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default RestartSvg;
