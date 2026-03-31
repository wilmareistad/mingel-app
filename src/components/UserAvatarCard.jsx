import AvatarDisplay from "./AvatarDisplay";
import styles from "../styles/UserAvatarCard.module.css";

export default function UserAvatarCard({
  user,
  size = "medium",
  position = null,
}) {
  const sizeConfig = {
    large: { desktop: 100, mobile: 80, initial: 12, fontSize: 48 },
    medium: { desktop: 80, mobile: 60, initial: 10, fontSize: 36 },
    small: { desktop: 60, mobile: 45, initial: 8, fontSize: 28 },
    tiny: { desktop: 45, mobile: 35, initial: 6, fontSize: 20 },
  };

  const config = sizeConfig[size];

  // Determine if we have a custom avatar
  const hasAvatar = user.avatar && Object.keys(user.avatar).length > 0;

  const containerStyle = {
    gap: `${config.initial}px`,
  };

  // Add positioning if provided
  if (position) {
    containerStyle.left = `${position.x}%`;
    containerStyle.top = `${position.y}%`;
  }

  return (
    <div
      className={styles.userAvatarContainer}
      style={containerStyle}
    >
      <div
        className={styles.userAvatar}
        style={{
          width: `${config.desktop}px`,
          height: `${config.desktop}px`,
        }}
      >
        {hasAvatar ? (
          <AvatarDisplay
            baseIndex={user.avatar.baseIndex || 0}
            hairIndex={user.avatar.hairIndex || 0}
            eyeIndex={user.avatar.eyeIndex || 0}
            noseIndex={user.avatar.noseIndex || 0}
            mouthIndex={user.avatar.mouthIndex || 0}
            clothesIndex={user.avatar.clothesIndex || 0}
          />
        ) : (
          <span
            className={styles.avatarInitial}
            style={{
              fontSize: `${config.fontSize}px`,
            }}
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p className={styles.userName}>{user.name}</p>
    </div>
  );
}
