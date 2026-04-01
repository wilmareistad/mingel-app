import { useState, useEffect } from "react";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { nanoid } from "nanoid";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addParticipant } from "../features/event/eventService";
import ToggleButton from "../components/ToggleButton";
import AvatarViewer from "../components/AvatarViewer";
import AvatarSVG from "../assets/avatar.svg";
import styles from "../styles/Join.module.css";

export default function Join() {
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [searchParams] = useSearchParams();
  const [baseIndex, setBaseIndex] = useState(0);
  const [hairIndex, setHairIndex] = useState(0);
  const [eyeIndex, setEyeIndex] = useState(0);
  const [noseIndex, setNoseIndex] = useState(0);
  const [mouthIndex, setMouthIndex] = useState(0);
  const [clothesIndex, setClothesIndex] = useState(0);
  const [layerCounts, setLayerCounts] = useState({});

  const navigate = useNavigate();

  // Function to dynamically count layers from Avatar.svg
  const countLayersFromSVG = async () => {
    try {
      const response = await fetch(AvatarSVG);
      const svgText = await response.text();
      
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
      
      const counts = {};
      
      // Get all group elements
      const groups = svgDoc.querySelectorAll("g[id]");
      groups.forEach((group) => {
        const groupId = group.getAttribute("id");
        if (groupId === "Avatar") return; // Skip the main Avatar group
        
        // Count direct children of this group
        const childCount = group.children.length;
        if (childCount > 0) {
          counts[groupId] = childCount;
        }
      });
      
      return counts;
    } catch (error) {
      console.error("Error counting layers:", error);
      return {};
    }
  };

  // Initialize layer counts on mount and randomize avatar
  useEffect(() => {
    const initializeAvatar = async () => {
      const counts = await countLayersFromSVG();
      setLayerCounts(counts);
      randomizeAvatar(counts);
    };
    
    initializeAvatar();
  }, []);

  // Function to randomize all avatar layers
  const randomizeAvatar = (counts = layerCounts) => {
    if (Object.keys(counts).length === 0) return; // Wait for counts to be set
    
    setBaseIndex(Math.floor(Math.random() * counts.Bases));
    setHairIndex(Math.floor(Math.random() * counts.Hairs));
    setEyeIndex(Math.floor(Math.random() * counts.Eyes));
    setNoseIndex(Math.floor(Math.random() * counts.Noses));
    setMouthIndex(Math.floor(Math.random() * counts.Mouths));
    setClothesIndex(Math.floor(Math.random() * counts.Clothes));
  };

  // Helper function to cycle through layers
  const cycleLayer = (currentIndex, setter, layerCount, direction) => {
    if (layerCount <= 1) return; // Don't cycle if only 1 layer
    if (direction === "left") {
      // Go to previous option, wrap to end if at start
      setter((currentIndex - 1 + layerCount) % layerCount);
    } else {
      // Go to next option, wrap to start if at end
      setter((currentIndex + 1) % layerCount);
    }
  };

  const handleBaseChange = (direction) => {
    cycleLayer(baseIndex, setBaseIndex, layerCounts["Bases"], direction);
  };

  const handleHairChange = (direction) => {
    cycleLayer(hairIndex, setHairIndex, layerCounts["Hairs"], direction);
  };

  const handleEyeChange = (direction) => {
    cycleLayer(eyeIndex, setEyeIndex, layerCounts["Eyes"], direction);
  };

  const handleNoseChange = (direction) => {
    cycleLayer(noseIndex, setNoseIndex, layerCounts["Noses"], direction);
  };

  const handleMouthChange = (direction) => {
    cycleLayer(mouthIndex, setMouthIndex, layerCounts["Mouths"], direction);
  };

  const handleClothesChange = (direction) => {
    cycleLayer(clothesIndex, setClothesIndex, layerCounts["Clothes"], direction);
  };

  // On mount, check if code is in URL params
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, [searchParams]);

  const handleJoin = async () => {
    if (!code || !username) {
      return setMessage("Enter code and username");
    }

    try {
      const cleanCode = code.trim().toUpperCase();

      const q = query(collection(db, "events"), where("code", "==", cleanCode));

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return setMessage("Event not found");
      }

      const eventDoc = snapshot.docs[0];
      const eventId = eventDoc.id;

      const userId = nanoid();

      // Set document with userId as the document ID in users collection (for legacy compatibility)
      await setDoc(doc(db, "users", userId), {
        username,
        eventId,
        createdAt: serverTimestamp(),
      });

      // Also add as participant in event sub-collection (new structure)
      const avatarConfig = {
        baseIndex,
        hairIndex,
        eyeIndex,
        noseIndex,
        mouthIndex,
        clothesIndex,
      };
      await addParticipant(eventId, userId, username, avatarConfig);

      localStorage.setItem("userDocId", userId);
      localStorage.setItem("userId", userId);
      localStorage.setItem("eventId", eventId);
      localStorage.setItem("username", username);
      localStorage.setItem("avatar", JSON.stringify(avatarConfig));

      navigate(`/lobby/${eventId}`);
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong");
    }
  };

  return (
    <div>
      <div className={styles.avatarCreator}>
        <div className={styles.avatarControlsWrapper}>
          {/* Left controls */}
          <div className={styles.leftControls}>
            <ToggleButton size="small" direction="left" label="Previous Hair" onClick={() => handleHairChange("left")} />
            <ToggleButton size="small" direction="left" label="Previous Eyes" onClick={() => handleEyeChange("left")} />
            <ToggleButton size="small" direction="left" label="Previous Nose" onClick={() => handleNoseChange("left")} />
            <ToggleButton size="small" direction="left" label="Previous Mouth" onClick={() => handleMouthChange("left")} />
            <ToggleButton size="small" direction="left" label="Previous Base" onClick={() => handleBaseChange("left")} />
            <ToggleButton size="small" direction="left" label="Previous Clothes" onClick={() => handleClothesChange("left")} />
          </div>

          {/* Center image */}
          <div className={styles.avatarView}>
            <AvatarViewer
              baseIndex={baseIndex}
              hairIndex={hairIndex}
              eyeIndex={eyeIndex}
              noseIndex={noseIndex}
              mouthIndex={mouthIndex}
              clothesIndex={clothesIndex}
              layerCounts={layerCounts}
            />
          </div>

          {/* Right controls */}
          <div className={styles.rightControls}>
            <ToggleButton size="small" direction="right" label="Next Hair" onClick={() => handleHairChange("right")} />
            <ToggleButton size="small" direction="right" label="Next Eyes" onClick={() => handleEyeChange("right")} />
            <ToggleButton size="small" direction="right" label="Next Nose" onClick={() => handleNoseChange("right")} />
            <ToggleButton size="small" direction="right" label="Next Mouth" onClick={() => handleMouthChange("right")} />
            <ToggleButton size="small" direction="right" label="Next Base" onClick={() => handleBaseChange("right")} />
            <ToggleButton size="small" direction="right" label="Next Clothes" onClick={() => handleClothesChange("right")} />
          </div>
        </div>

        <button className={styles.randomizeButton} onClick={() => randomizeAvatar()}>
          Randomize
        </button>
      </div>

      <input
        type="text"
        placeholder="Event code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <input
        type="text"
        placeholder="Your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <button onClick={handleJoin}>Join</button>

      {message && <p>{message}</p>}
    </div>
  );
}
