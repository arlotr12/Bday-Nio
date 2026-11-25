import React, { useId } from 'react';
import { BOARD_H, BOARD_W, JigsawPiece } from '../utils/jigsaw';

interface JigsawPieceSvgProps {
  piece: JigsawPiece;
  imageUrl: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  showStroke?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  withShadow?: boolean;
}

export const JigsawPieceSvg: React.FC<JigsawPieceSvgProps> = ({
  piece,
  imageUrl,
  width,
  height,
  className = '',
  showStroke = true,
  strokeColor = 'rgba(245, 224, 185, 0.55)',
  strokeWidth = 1.6,
  withShadow = true,
}) => {
  const uid = useId().replace(/:/g, '');
  const clipId = `jigsaw-clip-${piece.id}-${uid}`;
  const shadowId = `jigsaw-shadow-${piece.id}-${uid}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${piece.vbX} ${piece.vbY} ${piece.vbW} ${piece.vbH}`}
      className={className}
      style={{ overflow: 'visible', display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={piece.pathD} />
        </clipPath>
        {withShadow && (
          <filter id={shadowId} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.65" />
          </filter>
        )}
      </defs>

      <g filter={withShadow ? `url(#${shadowId})` : undefined}>
        <image
          href={imageUrl}
          x={0}
          y={0}
          width={BOARD_W}
          height={BOARD_H}
          preserveAspectRatio="xMidYMid slice"
          clipPath={`url(#${clipId})`}
        />
        {showStroke && (
          <path
            d={piece.pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )}
      </g>
    </svg>
  );
};
