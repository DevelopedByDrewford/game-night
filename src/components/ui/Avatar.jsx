import { useState } from 'react';
import styled from 'styled-components';
import { StatusDot } from './StatusDot.jsx';

const Wrap = styled.div`
  position: relative;
  display: inline-block;
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
`;

const Circle = styled.div`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  border: ${({ $borderWidth }) => $borderWidth}px solid
    ${({ $borderColor, theme }) => $borderColor || theme.colors.border};
  box-shadow: ${({ $boxShadow }) => $boxShadow || 'none'};
  overflow: hidden;
`;

const Img = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const DotWrap = styled.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
`;

export function Avatar({
  size = 42,
  color,
  imageUrl,
  online,
  showStatus = false,
  statusRingColor,
  borderColor,
  borderWidth = 1.5,
  boxShadow,
  onClick,
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(imageUrl) && !imageFailed;

  return (
    <Wrap $clickable={Boolean(onClick)} onClick={onClick}>
      <Circle
        $size={size}
        $color={color}
        $borderColor={borderColor}
        $borderWidth={borderWidth}
        $boxShadow={boxShadow}
      >
        {showImage && <Img src={imageUrl} alt="" onError={() => setImageFailed(true)} />}
      </Circle>
      {showStatus && (
        <DotWrap>
          <StatusDot
            online={online}
            size={Math.max(12, Math.round(size * 0.33))}
            ringWidth={2}
            ringColor={statusRingColor}
          />
        </DotWrap>
      )}
    </Wrap>
  );
}
