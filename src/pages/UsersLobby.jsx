import { useEffect, useState, useRef, useMemo } from "react";
import UserAvatarCard from "../components/UserAvatarCard";
import styles from "../styles/UsersLobby.module.css";

export default function UsersLobby({ users }) {
  const [renderPositions, setRenderPositions] = useState({});
  const physicsRef = useRef({});

  const avatarSize = useMemo(() => {
    const n = users.length;
    if (n <= 5)  return "large";
    if (n <= 15) return "medium";
    if (n <= 30) return "small";
    if (n <= 75) return "tiny";
    return "micro";
  }, [users.length]);

  const containerHeight = useMemo(() => {
    const n = users.length;
    if (n <= 15) return "50vh";
    if (n <= 50) return "70vh";
    return "90vh";
  }, [users.length]);

  // Initialize physics state when user list changes
  useEffect(() => {
    const n = users.length;
    const cols = Math.ceil(Math.sqrt(n * 1.2));
    const rows = Math.ceil(n / cols);
    const cellW = 80 / cols;
    const cellH = 70 / rows;

    const gridPositions = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        gridPositions.push({ r, c });

    // Shuffle
    for (let i = gridPositions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gridPositions[i], gridPositions[j]] = [gridPositions[j], gridPositions[i]];
    }

      const next = {};
      users.forEach((user, i) => {
        const existing = physicsRef.current[user.userId];
        if (existing) {
          // Keep existing physics state for users already in the lobby
          next[user.userId] = existing;
          return;
        }
        const { r, c } = gridPositions[i] || { r: 0, c: 0 };
        const x = 10 + c * cellW + cellW / 2 + (Math.random() - 0.5) * cellW * 0.3;
        const y = 5  + r * cellH + cellH / 2 + (Math.random() - 0.5) * cellH * 0.3;
        next[user.userId] = {
x: Math.max(8,  Math.min(92, x)),   // symmetric: 8% padding on left/right
y: Math.max(8,  Math.min(92, y)),   // symmetric: 8% padding on top/bottom
          vx: 0,
          vy: 0,
        };
      });    physicsRef.current = next;
  }, [users]);

  // Animation loop — never torn down/recreated
  useEffect(() => {
    const MIN_DIST = 18;
    const MAX_SPEED = 0.55;
    const WANDER = 0.025;      // small random nudge per frame
    const DAMPING = 0.92;      // velocity bleeds off smoothly
    const CENTER_X = 50;
    const CENTER_Y = 40;
    const CENTER_PULL_RADIUS = 40;
    const CENTER_PULL_FORCE = 0.006;

    const interval = setInterval(() => {
      const p = physicsRef.current;
      const ids = Object.keys(p);
      if (ids.length === 0) return;

      // 1. Apply wander + damping + centering to velocities
      ids.forEach((id) => {
        const u = p[id];
        u.vx = u.vx * DAMPING + (Math.random() - 0.5) * WANDER;
        u.vy = u.vy * DAMPING + (Math.random() - 0.5) * WANDER;

        const dx = u.x - CENTER_X;
        const dy = u.y - CENTER_Y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > CENTER_PULL_RADIUS) {
          u.vx -= (dx / dist) * CENTER_PULL_FORCE;
          u.vy -= (dy / dist) * CENTER_PULL_FORCE;
        }

        // Clamp speed
        const speed = Math.sqrt(u.vx * u.vx + u.vy * u.vy);
        if (speed > MAX_SPEED) {
          u.vx = (u.vx / speed) * MAX_SPEED;
          u.vy = (u.vy / speed) * MAX_SPEED;
        }

        u.x += u.vx;
        u.y += u.vy;
      });

      // 2. Separation — push velocity, not position
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = p[ids[i]];
          const b = p[ids[j]];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MIN_DIST && dist > 0.01) {
            const force = ((MIN_DIST - dist) / MIN_DIST) * 0.04;
            const nx = dx / dist;
            const ny = dy / dist;
            a.vx -= nx * force;
            a.vy -= ny * force;
            b.vx += nx * force;
            b.vy += ny * force;
          }
        }
      }

      // 3. Boundary bounce - symmetric padding (8% on all sides)
      ids.forEach((id) => {
        const u = p[id];
    if (u.x <  8) { u.x =  8; u.vx =  Math.abs(u.vx); }
    if (u.x > 92) { u.x = 92; u.vx = -Math.abs(u.vx); }
    if (u.y <  8) { u.y =  8; u.vy =  Math.abs(u.vy); }
    if (u.y > 92) { u.y = 92; u.vy = -Math.abs(u.vy); }
      });     

      // 4. Sync a snapshot to React state for rendering
      setRenderPositions(
        Object.fromEntries(ids.map((id) => [id, { x: p[id].x, y: p[id].y }]))
      );
    }, 50);

    return () => clearInterval(interval);
  }, []); // ← empty deps: runs once, never restarts

  return (
    <div
      className={styles.usersLobby}
      data-avatar-size={avatarSize}
      style={{ height: containerHeight }}
    >
      {users.map((user) => {
        const pos = renderPositions[user.userId] ?? { x: 50, y: 40 };
        return (
          <UserAvatarCard
            key={user.userId}
            user={{
              userId: user.userId,
              name: user.name,
              avatar: user.avatar || {},
              role: user.role,
            }}
            size={avatarSize}
            position={pos}
          />
        );
      })}
    </div>
  );
}