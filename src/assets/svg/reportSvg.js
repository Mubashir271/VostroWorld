import * as React from 'react';
import Svg, {Path} from 'react-native-svg';
import {colors} from '../../util/color';
const ReportSvg = ({stroke, ...props}) => (
  <Svg
    width={18}
    height={21}
    viewBox="0 0 18 21"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <Path
      d="M13.1666 1.25H5.16663C3.23363 1.25 1.66663 2.817 1.66663 4.75V16.25C1.66663 18.183 3.23363 19.75 5.16663 19.75H13.1666C15.0996 19.75 16.6666 18.183 16.6666 16.25V4.75C16.6666 2.817 15.0996 1.25 13.1666 1.25Z"
      stroke={stroke || '#777E90'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5.66663 5.25488H12.6666M5.66663 9.25488H12.6666M5.66663 13.2549H9.16663"
      stroke={stroke || '#777E90'}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);
export default ReportSvg;
