import * as React from 'react';
import Svg, {Path} from 'react-native-svg';
const DotReportSVG = props => (
  <Svg
    width={18}
    height={22}
    viewBox="0 0 18 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <Path
      d="M8.3445 1.3175H0.75V17.6825H14.25V7.046M8.3445 1.3175L14.25 7.046M8.3445 1.3175V7.046H14.25M3.75 20.75H17.25V10.25M3 10.25H12M3 6.5H6M3 14H12"
      stroke="#1C1E24"
      strokeLinejoin="round"
    />
  </Svg>
);
export default DotReportSVG;
