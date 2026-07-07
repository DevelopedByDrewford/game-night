<!-- update to this logo -->  /* 3. Ziggurat — stepped pyramid, screen-print poster feel */
  .ziggurat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  .ziggurat div {
    height: 12px;
    border-radius: 3px;
  }
  .ziggurat .z1 { width: 28px; background: var(--terracotta); }
  .ziggurat .z2 { width: 48px; background: var(--mustard); }
  .ziggurat .z3 { width: 68px; background: var(--avocado); }
  .ziggurat .z4 { width: 88px; background: var(--terracotta); opacity: .55; }
 
  /* 4. Ribbon wave — asymmetric blob, layered flowing shape */
  .ribbon {
    position: relative;
    width: 96px;
    height: 72px;
  }
  .ribbon div {
    position: absolute;
    width: 96px;
    height: 40px;
    border-radius: 60% 40% 55% 45% / 70% 60% 40% 30%;
  }
  .ribbon .r1 { background: var(--terracotta); top: 0; }
  .ribbon .r2 { background: var(--mustard); top: 16px; opacity: .92; }
  .ribbon .r3 { background: var(--avocado); top: 32px; opacity: .85; }