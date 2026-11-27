import React, { useEffect, useRef } from 'react';
import './DataStreamConveyor.css';

const PITCH = 51;
const SPEED = 85;
const GATE_Y = 126;
const TRAY_Y = 356;

function rounded(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function gradient(ctx, x, y, endX, endY, stops) {
  const fill = ctx.createLinearGradient(x, y, endX, endY);
  stops.forEach(([position, color]) => fill.addColorStop(position, color));
  return fill;
}

function tile(ctx, x, y, rejected, checked, angle, blur) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  if (blur > 0) ctx.filter = `blur(${blur}px)`;
  const rim = rejected ? '#fe9660' : '#a9c6ff';
  const face = gradient(ctx, -18, 18, 17, -19, rejected
    ? [[0, '#ff6427'], [.18, '#a12c14'], [.58, '#6e1c15'], [.85, '#d54b25'], [1, '#ffa66d']]
    : [[0, '#88a9ef'], [.12, '#45638f'], [.36, '#1d2d4c'], [.62, '#283c5c'], [.86, '#526c9a'], [1, '#c4d9ff']]);
  ctx.lineWidth = 1;
  rounded(ctx, -19, -19, 38, 38, 7, face, rim);
  rounded(ctx, -16, -16, 32, 31, 5, gradient(ctx, -16, -16, 16, 15,
    [[0, '#ffffff30'], [.48, '#ffffff00'], [.8, '#040c201c'], [1, '#ffffff36']]));
  if (checked) {
    ctx.strokeStyle = '#d4ff3a';
    ctx.lineWidth = 4;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.shadowColor = '#c4ff35';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(-3, 6);
    ctx.lineTo(9, -7);
    ctx.stroke();
  }
  ctx.restore();
}

function scanner(ctx) {
  ctx.save();
  ctx.shadowColor = '#245aff';
  ctx.shadowBlur = 23;
  const glass = gradient(ctx, -11, 0, 11, 0, [[0, '#859cff'], [.17, '#2857ce'], [.48, '#102978'], [.72, '#357bff'], [.89, '#a0f9ff'], [1, '#3271ff']]);
  rounded(ctx, -11, 20, 22, 215, 10, glass, '#7aafff');
  rounded(ctx, 1, 22, 6, 209, 3, gradient(ctx, 0, 20, 0, 235,
    [[0, '#e2ffff'], [.1, '#619bff42'], [.85, '#388aff33'], [1, '#a2fcff']]));
  ctx.restore();
}

function tray(ctx) {
  ctx.save();
  const reflection = ctx.createRadialGradient(0, TRAY_Y + 25, 2, 0, TRAY_Y + 25, 105);
  reflection.addColorStop(0, '#da573644');
  reflection.addColorStop(.4, '#305edb36');
  reflection.addColorStop(1, '#15307700');
  ctx.fillStyle = reflection;
  ctx.fillRect(-110, TRAY_Y - 80, 220, 210);
  ctx.shadowColor = '#3e6bff';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(-111, TRAY_Y - 8);
  ctx.lineTo(111, TRAY_Y - 8);
  ctx.lineTo(102, TRAY_Y + 13);
  ctx.quadraticCurveTo(100, TRAY_Y + 18, 90, TRAY_Y + 18);
  ctx.lineTo(-90, TRAY_Y + 18);
  ctx.quadraticCurveTo(-100, TRAY_Y + 18, -102, TRAY_Y + 13);
  ctx.closePath();
  ctx.fillStyle = gradient(ctx, -111, 0, 111, 0, [[0, '#96c4ff'], [.11, '#26468b99'], [.5, '#334e7566'], [.88, '#132c6299'], [1, '#95c6ff']]);
  ctx.fill();
  ctx.strokeStyle = '#668dff';
  ctx.stroke();
  rounded(ctx, -111, TRAY_Y - 17, 222, 13, 6, '#19367288', '#86adff');
  ctx.restore();
}

function render(ctx, width, height, time) {
  const scale = height / 440;
  const half = width / (2 * scale);
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, 0);
  ctx.scale(scale, scale);
  const distance = time * SPEED;
  const centerIndex = Math.floor(distance / PITCH);
  const count = Math.ceil(half / PITCH) + 2;
  for (let i = centerIndex - count; i <= centerIndex + count; i++) {
    const x = distance - i * PITCH;
    const rejected = i % 6 === 0;
    const blur = Math.max(0, (Math.abs(x) / half - .72) * 15);
    if (x <= 0 || !rejected) {
      tile(ctx, x, GATE_Y, rejected, x > 0, x < 0 ? -.035 * Math.sin(i * 2) : 0, blur);
    } else {
      const t = x / SPEED / 4.2;
      if (t <= 1) {
        const fallX = -40 * Math.sin(Math.PI * t);
        const fallY = GATE_Y + (TRAY_Y - 24 - GATE_Y) * t * t;
        ctx.save();
        ctx.globalAlpha = .14;
        tile(ctx, fallX - 2, fallY - 16 * t, true, false, -.6 * t, 3);
        ctx.restore();
        tile(ctx, fallX, fallY, true, false, -.8 * t, 0);
      }
    }
  }
  scanner(ctx);
  tray(ctx);
  ctx.restore();
}

export default function DataStreamConveyor() {
  const canvas = useRef(null);
  useEffect(() => {
    const element = canvas.current;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    let visible = true;
    let time = 4.05;
    let previous;
    function draw(now) {
      const { clientWidth: width, clientHeight: height } = element;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (element.width !== Math.round(width * ratio) || element.height !== Math.round(height * ratio)) {
        element.width = Math.round(width * ratio);
        element.height = Math.round(height * ratio);
      }
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      if (previous !== undefined && !motion.matches) time += Math.min(now - previous, 100) / 1000;
      previous = now;
      if (width && height) render(ctx, width, height, motion.matches ? 4.05 : time);
      if (visible && !motion.matches) frame = requestAnimationFrame(draw);
    }
    function restart() {
      cancelAnimationFrame(frame);
      previous = undefined;
      if (visible) draw(performance.now());
    }
    const resize = new ResizeObserver(restart);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      restart();
    });
    resize.observe(element);
    observer.observe(element);
    motion.addEventListener('change', restart);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      motion.removeEventListener('change', restart);
    };
  }, []);
  return (
    <figure className="row-conveyor" aria-label="Rows pass through a scanner. Failed rows drop into quarantine.">
      <canvas ref={canvas} aria-hidden="true" />
      <figcaption>
        <span className="rows-in">1,420 rows in</span>
        <span className="rows-clean">1,267 written clean</span>
        <span className="rows-held">153 held, each with a reason</span>
      </figcaption>
    </figure>
  );
}
