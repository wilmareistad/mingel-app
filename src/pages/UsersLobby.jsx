import { useEffect, useState, useMemo } from "react";
import UserAvatarCard from "../components/UserAvatarCard";
import styles from "../styles/UsersLobby.module.css";

export default function UsersLobby({ users }) {
  const [positions, setPositions] = useState({});

  // Calculate responsive avatar size based on user count
  const avatarSize = useMemo(() => {
    const userCount = users.length;
    if (userCount <= 5) return "large"; // 100px desktop, 80px mobile
    if (userCount <= 15) return "medium"; // 80px desktop, 60px mobile
    if (userCount <= 30) return "small"; // 60px desktop, 45px mobile
    return "tiny"; // 45px desktop, 35px mobile
  }, [users.length]);

  useEffect(() => {
    // Initialize random positions for each user
    const initialPositions = {};
    users.forEach((user) => {
      initialPositions[user.userId] = {
        x: Math.random() * 80,
        y: Math.random() * 80,
      };
    });
    setPositions(initialPositions);
  }, [users]);

  useEffect(() => {
    if (Object.keys(positions).length === 0) return;

    // Animate positions slowly with collision detection
    const interval = setInterval(() => {
      setPositions((prev) => {
        const updated = { ...prev };
        const minDistance = 20; // Minimum distance between avatars (%)
        const avatarSize = 10; // Avatar size as percentage of container

        // First pass: move all avatars
        Object.keys(updated).forEach((userId) => {
          updated[userId].x += (Math.random() - 0.5) * 1.2;
          updated[userId].y += (Math.random() - 0.5) * 1.2;

          // Keep within visible bounds (with padding for avatar + name)
          updated[userId].x = Math.max(10, Math.min(90, updated[userId].x));
          updated[userId].y = Math.max(5, Math.min(75, updated[userId].y));
        });

        // Second pass: collision detection and separation
        const userIds = Object.keys(updated);
        for (let i = 0; i < userIds.length; i++) {
          for (let j = i + 1; j < userIds.length; j++) {
            const user1 = updated[userIds[i]];
            const user2 = updated[userIds[j]];

            const dx = user2.x - user1.x;
            const dy = user2.y - user1.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
              // Push avatars apart
              const angle = Math.atan2(dy, dx);
              const pushDistance = (minDistance - distance) / 2 + 0.5;

              user1.x -= Math.cos(angle) * pushDistance;
              user1.y -= Math.sin(angle) * pushDistance;
              user2.x += Math.cos(angle) * pushDistance;
              user2.y += Math.sin(angle) * pushDistance;

              // Keep within bounds
              user1.x = Math.max(10, Math.min(90, user1.x));
              user1.y = Math.max(5, Math.min(75, user1.y));
              user2.x = Math.max(10, Math.min(90, user2.x));
              user2.y = Math.max(5, Math.min(75, user2.y));
            }
          }
        }

        return updated;
      });
    }, 1200); // Update every 1.2 seconds for faster movement

    return () => clearInterval(interval);
  }, [positions]);

  return (
    <div className={styles.usersLobby} data-avatar-size={avatarSize}>
      {users.map((user) => {
        let pos = positions[user.userId] || { x: 0, y: 0 };
        
        // Adjust position to keep avatar and name within bounds
        pos = {
          x: Math.max(10, Math.min(90, pos.x)),
          y: Math.max(5, Math.min(75, pos.y)),
        };
        
        return (
          <UserAvatarCard
            key={user.userId}
            user={{
              userId: user.userId,
              name: user.name,
              avatar: user.avatar || {},
            }}
            size={avatarSize}
            position={pos}
          />
        );
      })}
    </div>
  );
}
