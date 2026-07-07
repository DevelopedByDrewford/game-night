import styled from 'styled-components';

// Reproduces the design's "groovy swoosh" motif: a diagonal 3-color pipe,
// a concentric rounded arch (elbow), and a horizontal pipe continuing from
// the arch's right leg. Pure divs, no SVG/images, fixed behind all content.

const Wrap = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 0.32;
`;

const Pipe = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;

  div {
    height: 12px;
    border-radius: 6px;
  }
`;

const DiagonalPipe = styled(Pipe)`
  position: absolute;
  top: -70px;
  left: 12%;
  width: 1500px;
  height: 44px;
  transform: rotate(20deg);
  transform-origin: top left;
`;

const HorizontalPipe = styled(Pipe)`
  position: absolute;
  left: calc(4% + 98px);
  bottom: 48%;
  right: -10%;
`;

const ArchRing = styled.div`
  position: absolute;
  left: ${({ $left }) => $left};
  bottom: 48%;
  width: ${({ $size }) => $size.w};
  height: ${({ $size }) => $size.h};
  border: 12px solid ${({ $color }) => $color};
  border-bottom: none;
  border-radius: ${({ $radius }) => $radius} ${({ $radius }) => $radius} 0 0;
  box-sizing: border-box;
`;

export function Background() {
  return (
    <Wrap>
      <DiagonalPipe>
        <div style={{ background: '#7C8C4A' }} />
        <div style={{ background: '#C8592F' }} />
        <div style={{ background: '#E3A73E' }} />
      </DiagonalPipe>

      <ArchRing $left="4%" $size={{ w: '130px', h: '130px' }} $radius="88px" $color="#7C8C4A" />
      <ArchRing $left="calc(4% + 16px)" $size={{ w: '98px', h: '114px' }} $radius="66px" $color="#C8592F" />
      <ArchRing $left="calc(4% + 32px)" $size={{ w: '66px', h: '98px' }} $radius="44px" $color="#E3A73E" />

      <HorizontalPipe>
        <div style={{ background: '#7C8C4A' }} />
        <div style={{ background: '#C8592F' }} />
        <div style={{ background: '#E3A73E' }} />
      </HorizontalPipe>
    </Wrap>
  );
}
