// Keyboard + mouse input: WASD, sprint, jump, fire, wheel, radio, pause.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set(); // edge-triggered, consumed by pollPressed()
  let mouseDX = 0, mouseDY = 0;
  let firing = false;
  let locked = false;

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys.add(e.code);
    pressed.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); firing = false; });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) firing = true;
    if (!locked && document.pointerLockElement !== canvas) {
      try { canvas.requestPointerLock(); } catch { /* pointer lock optional */ }
    }
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) firing = false; });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; });
  document.addEventListener('mousemove', (e) => {
    if (locked) { mouseDX += e.movementX; mouseDY += e.movementY; }
  });

  function down(c) { return keys.has(c); }
  function pollPressed(c) {
    if (pressed.has(c)) { pressed.delete(c); return true; }
    return false;
  }
  function consumeMouse() { const d = { dx: mouseDX, dy: mouseDY }; mouseDX = 0; mouseDY = 0; return d; }
  function axis() {
    let x = 0, z = 0;
    if (down('KeyW') || down('ArrowUp')) z -= 1;
    if (down('KeyS') || down('ArrowDown')) z += 1;
    if (down('KeyA') || down('ArrowLeft')) x -= 1;
    if (down('KeyD') || down('ArrowRight')) x += 1;
    return { x, z };
  }
  return {
    down, pollPressed, consumeMouse, axis,
    get firing() { return firing; },
    get sprint() { return down('ShiftLeft') || down('ShiftRight'); },
    clearPressed() { pressed.clear(); },
  };
}
