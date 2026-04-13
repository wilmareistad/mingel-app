import { useState, useMemo } from "react";
import UsersLobby from "./UsersLobby";
import styles from "./Lobby.module.css";

const FIRST_NAMES = [
  "Alex", "Jordan", "Sam", "Casey", "Morgan", "Riley", "Taylor", "Quinn",
  "Jamie", "Avery", "Blake", "Drew", "Cameron", "Parker", "Skyler", "River",
  "Sage", "Dakota", "Hunter", "Finley", "Rowan", "Reese", "Emerson", "Bellamy",
  "Bailey", "Harley", "Peyton", "Rory", "Tatum", "Sloan", "London", "Phoenix",
  "Sydney", "Harper", "Devon", "Marley", "Cassidy", "Shea", "Haven", "Sutton",
  "Vaughn", "Zephyr", "Storm", "Ocean", "Sky", "Moon", "Star", "Aurora",
  "Nova", "Iris", "Sage", "Willow"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
  "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
  "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Young",
  "Diaz", "Allen", "King", "Wright", "Scott", "Torres", "Peterson", "Phillips",
  "Campbell", "Parker", "Edwards", "Collins", "Reeves", "Morris", "Rogers", "Morgan",
  "Peterson", "Cooper", "Reed", "Cook"
];

const ROLES = [
  "Manager", "Developer", "Designer", "Product Owner", "Analyst", "Engineer",
  "Coordinator", "Specialist", "Consultant", "Director", "Lead", "Architect",
  "Strategist", "Supervisor", "Administrator", "Executive", "Officer", "Chief",
  "Coach", "Mentor", "Facilitator", "Organizer", "Planner", "Investor"
];

export default function LobbyTest() {
  const [participantCount, setParticipantCount] = useState(10);

  // Generate fake users
  const fakeUsers = useMemo(() => {
    const users = [];
    const usedNames = new Set();

    for (let i = 0; i < participantCount; i++) {
      let firstName, lastName, name;
      
      // Generate unique name
      do {
        firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        name = `${firstName} ${lastName}`;
      } while (usedNames.has(name));
      
      usedNames.add(name);

      const user = {
        userId: `user-${i}`,
        name: name,
        avatar: {
          baseIndex: Math.floor(Math.random() * 5),
          hairIndex: Math.floor(Math.random() * 10),
          eyeIndex: Math.floor(Math.random() * 8),
          noseIndex: Math.floor(Math.random() * 6),
          mouthIndex: Math.floor(Math.random() * 7),
          clothesIndex: 0,
        },
        // 50% of users have a role
        ...(Math.random() > 0.5 && {
          role: ROLES[Math.floor(Math.random() * ROLES.length)]
        })
      };

      users.push(user);
    }

    return users;
  }, [participantCount]);

  return (
    <div>
      <h1>Lobby Test</h1>

      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <p>Test the lobby layout with different participant counts:</p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setParticipantCount(10)}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: participantCount === 10 ? "#001A52" : "#ccc",
              color: participantCount === 10 ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600"
            }}
          >
            10 People
          </button>
          <button
            onClick={() => setParticipantCount(50)}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: participantCount === 50 ? "#001A52" : "#ccc",
              color: participantCount === 50 ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600"
            }}
          >
            50 People
          </button>
          <button
            onClick={() => setParticipantCount(100)}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: participantCount === 100 ? "#001A52" : "#ccc",
              color: participantCount === 100 ? "white" : "black",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
              fontWeight: "600"
            }}
          >
            100 People
          </button>
        </div>
      </div>

      <p><strong>Room Name:</strong> Test Event</p>
      <p><strong>Room Code:</strong> TEST123</p>
      <p><strong>Status:</strong> lobby</p>
      <p style={{ marginTop: "1rem", color: "#666" }}>
        Showing {fakeUsers.length} participants ({fakeUsers.filter(u => u.role).length} with roles)
      </p>

      <UsersLobby users={fakeUsers} />
    </div>
  );
}
