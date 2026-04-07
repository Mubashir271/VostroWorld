// components/CloseSVG.tsx
import React from 'react';
import Svg, { Line } from 'react-native-svg';

interface CloseSVGProps {
  width?: number;
  height?: number;
  color?: string;
}

const CrossSVG: React.FC<CloseSVGProps> = ({ width = 24, height = 24, color = '#E63946' }) => {
  return (
    <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
      <Line
        x1="4"
        y1="4"
        x2="20"
        y2="20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1="20"
        y1="4"
        x2="4"
        y2="20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
};

export default CrossSVG;
