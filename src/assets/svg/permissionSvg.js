import * as React from 'react';
import Svg, {Path} from 'react-native-svg';
const PermissionSvg = props => (
  <Svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}>
    <Path
      d="M6.3998 12L11.1998 16L17.5998 7.99999M11.9998 0.799988L0.799805 7.19999V8.35199C0.79946 11.7078 1.89247 14.9724 3.91335 17.6515C5.93424 20.3307 8.77298 22.2784 11.9998 23.2C15.2266 22.2784 18.0654 20.3307 20.0863 17.6515C22.1071 14.9724 23.2001 11.7078 23.1998 8.35199V7.19999L11.9998 0.799988Z"
      stroke="black"
      strokeLinejoin="round"
    />
  </Svg>
);
export default PermissionSvg;
