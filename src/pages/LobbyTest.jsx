import { useState, useMemo } from "react";
import UsersLobby from "./UsersLobby";
import EventQRCodeDisplay from "../components/QRCodeDisplay";

const FIRST_NAMES = [
  "John", "Rickard", "Benita", "Robin", "Emma", "Olof", "Vanessa", "Ida",
  "Alexandru", "Anton", "Tim", "Patricia", "Marie", "Elsa", "Eddie", "Hanna",
  "Laura", "Malin", "Wilma", "Nathalie", "Daniella", "Emelie", "Maria", "Olivia",
  "Hans", "Rune", "Ishmael", "Leopold", "K", "Brutus", "PistolWhip", "Ringo",
  "Notorious", "Sylvia", "Coco", "Mynta", "Cixin", "Aureliano", "Knugen", "Godzilla",
  "Conny med K", "Pläd", "Livsnjutarn", "Linux", "Legolas", "Billie", "Bulle", "Lilla Bommen",
  "Kenny", "Smaug", "Wanda", "R2", "Crazy Frog"
];

const LAST_NAMES = [
  "Karenina", "Johnson", "Ahlenhed", "Almroth", "Backman", "Andersson", "Börnfelt", "Finnsisjön", "Hårdisksson",
  "Steinbeck", "Holiday", "Sin Carne", "Buendía", "Olsson", "Alm", "Giraldo",
  "Johansson", "Persson", "Moore", "Rosie", "Reistad", "Rosenkvist", "Saadon", "Tedeman",
  "Töreland", "", "Vrethammar", "LaBeouf", "Snusson", "Guryan", "Simone", "Aronofsky", "Panda",
  "Bergman", "McCalla", "Pastrami", "Taco", "D2", "de Ripper", "Filibuster", "Tolstoj",
  "Hyvönen", "Hurula", "Waits", "Lamar", "Swayze", "Crumb", "McDermot", "Carmichael",
  "Sagan", "Cooper", "Bovary", "Ingmarsson", "", "", "", "", "", "", "", "", ""
];

const ROLES = [
  "Manager", "Developer", "Student", "Product Owner", "Analyst", "Engineer",
  "Coordinator", "Student", "Consultant", "Director", "Lead", "Homeless",
  "Strategist", "Supervisor", "Administrator", "Executive", "Officer", "Chef",
  "Coach", "Mentor", "Facilitator", "Daydreamer", "Planner", "Investor"
];

// Test wrapper component that provides fake event data to AdminLobby
function AdminLobbyTest({ participantCount, onParticipantCountChange }) {
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
          baseIndex: Math.floor(Math.random() * 13),
          hairIndex: Math.floor(Math.random() * 26),
          eyeIndex: Math.floor(Math.random() * 16),
          noseIndex: Math.floor(Math.random() * 11),
          mouthIndex: Math.floor(Math.random() * 19),
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
    <>
      <h1>Lobby Test</h1>
      <EventQRCodeDisplay eventCode="TEST1" />
      <UsersLobby users={fakeUsers} />
      <div style={{ display: "flex", flexDirection: "row", gap: "0.5rem", marginTop: "1.5rem", justifyContent: "center", width: "100%" }}>
        <button
          onClick={() => onParticipantCountChange(10)}
          style={{
            padding: "0.4rem 0.8rem",
            backgroundColor: participantCount === 10 ? "#001A52" : "#ccc",
            color: participantCount === 10 ? "white" : "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: "600"
          }}
        >
          10 People
        </button>
        <button
          onClick={() => onParticipantCountChange(50)}
          style={{
            padding: "0.4rem 0.8rem",
            backgroundColor: participantCount === 50 ? "#001A52" : "#ccc",
            color: participantCount === 50 ? "white" : "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: "600"
          }}
        >
          50 People
        </button>
        <button
          onClick={() => onParticipantCountChange(100)}
          style={{
            padding: "0.4rem 0.8rem",
            backgroundColor: participantCount === 100 ? "#001A52" : "#ccc",
            color: participantCount === 100 ? "white" : "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.85rem",
            fontWeight: "600"
          }}
        >
          100 People
        </button>
      </div>
    </>
  );
}

export default function LobbyTest() {
  const [participantCount, setParticipantCount] = useState(10);

  return <AdminLobbyTest participantCount={participantCount} onParticipantCountChange={setParticipantCount} />;
}
