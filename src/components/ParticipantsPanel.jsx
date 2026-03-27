import styles from './ParticipantsPanel.module.css';

/**
 * ParticipantsPanel - Displays and manages event participants
 * @param {Array} participants - List of participant objects
 * @param {boolean} isKickMode - Whether kick mode is active
 * @param {function} onToggleKickMode - Callback to toggle kick mode
 * @param {function} onKickClick - Callback when kicking a participant
 */
export default function ParticipantsPanel({ 
  participants, 
  isKickMode, 
  onToggleKickMode, 
  onKickClick 
}) {
  return (
    <div className={styles.section}>
      <div className={styles.participantsHeader}>
        <h3>Participants ({participants.length})</h3>
        <button 
          className={`${styles.kickBtn} ${isKickMode ? styles.active : ''}`}
          onClick={onToggleKickMode}
        >
          {isKickMode ? 'Cancel Kick' : 'Kick Player'}
        </button>
      </div>

      {participants.length === 0 ? (
        <p className={styles.empty}>No participants yet. Waiting for players to join...</p>
      ) : (
        <div className={styles.participantsList}>
          {participants.map((participant) => (
            <div 
              key={participant.id}
              className={`${styles.participantCard} ${isKickMode ? styles.kickMode : ''}`}
              onClick={() => isKickMode && onKickClick(participant)}
              role="button"
              tabIndex={isKickMode ? 0 : -1}
            >
              <span className={styles.name}>{participant.name}</span>
              {isKickMode && (
                <button 
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onKickClick(participant);
                  }}
                  aria-label={`Kick ${participant.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
