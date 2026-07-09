import './Background.css';

function ArchRing({ left, size, radius, color }) {
  return (
    <div
      className="background-arch"
      style={{
        left,
        width: size.w,
        height: size.h,
        borderColor: color,
        borderRadius: `${radius} ${radius} 0 0`,
      }}
    />
  );
}

export function Background() {
  return (
    <div className="background-wrap">
      <div className="background-pipe background-pipe--diagonal">
        <div style={{ background: '#7C8C4A' }} />
        <div style={{ background: '#C8592F' }} />
        <div style={{ background: '#E3A73E' }} />
      </div>

      <ArchRing left="4%" size={{ w: '130px', h: '130px' }} radius="88px" color="#7C8C4A" />
      <ArchRing left="calc(4% + 16px)" size={{ w: '98px', h: '114px' }} radius="66px" color="#C8592F" />
      <ArchRing left="calc(4% + 32px)" size={{ w: '66px', h: '98px' }} radius="44px" color="#E3A73E" />

      <div className="background-pipe background-pipe--horizontal">
        <div style={{ background: '#7C8C4A' }} />
        <div style={{ background: '#C8592F' }} />
        <div style={{ background: '#E3A73E' }} />
      </div>
    </div>
  );
}
