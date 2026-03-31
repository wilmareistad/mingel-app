import { useState, useEffect } from "react";
import { collection, query, where, getDocs, setDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";
import { nanoid } from "nanoid";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addParticipant } from "../features/event/eventService";
import ToggleButton from "../components/ToggleButton";
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
  const [layerCounts, setLayerCounts] = useState({});

  const navigate = useNavigate();

  // Initialize all layers and count them on mount
  useEffect(() => {
    const parts = ["Bases", "Hairs", "Eyes", "Noses", "Mouths"];
    const counts = {};

    parts.forEach((part) => {
      const group = document.getElementById(part);
      if (!group) return;

      // Select only direct children (not nested), handles Mout02 typo for mouths
      let layers = group.children; // This gets direct children only
      const validLayers = Array.from(layers).filter((layer) => {
        const id = layer.getAttribute("id");
        if (part === "Mouths") {
          return id && (id.startsWith("Mouth") || id.startsWith("Mout"));
        } else {
          const singular = part.slice(0, -1); // Remove 's' to get singular form
          return id && id.startsWith(singular);
        }
      });

      counts[part] = validLayers.length;
      console.log(`Found ${part}:`, validLayers.length);

      // Initialize visibility - show first, hide rest
      validLayers.forEach((layer, index) => {
        layer.style.display = index === 0 ? "block" : "none";
      });
    });

    setLayerCounts(counts);
  }, []);

  // Helper function to update layer visibility
  const updateLayerVisibility = (groupId, singularForm, index) => {
    const group = document.getElementById(groupId);
    if (!group) return;

    // Select only direct children
    let layers = group.children;
    const validLayers = Array.from(layers).filter((layer) => {
      const id = layer.getAttribute("id");
      if (groupId === "Mouths") {
        return id && (id.startsWith("Mouth") || id.startsWith("Mout"));
      } else {
        return id && id.startsWith(singularForm);
      }
    });

    validLayers.forEach((layer, layerIndex) => {
      layer.style.display = layerIndex === index ? "block" : "none";
    });
  };

  // Update visibility when base index changes
  useEffect(() => {
    updateLayerVisibility("Bases", "Base", baseIndex);
  }, [baseIndex]);

  // Update visibility when hair index changes
  useEffect(() => {
    updateLayerVisibility("Hairs", "Hair", hairIndex);
  }, [hairIndex]);

  // Update visibility when eye index changes
  useEffect(() => {
    updateLayerVisibility("Eyes", "Eye", eyeIndex);
  }, [eyeIndex]);

  // Update visibility when nose index changes
  useEffect(() => {
    updateLayerVisibility("Noses", "Nose", noseIndex);
  }, [noseIndex]);

  // Update visibility when mouth index changes
  useEffect(() => {
    updateLayerVisibility("Mouths", "Mouth", mouthIndex);
  }, [mouthIndex]);

  // Helper function to cycle through layers
  const cycleLayer = (currentIndex, setter, layerCount) => {
    if (layerCount <= 1) return; // Don't cycle if only 1 layer
    setter((currentIndex + 1) % layerCount);
  };

  const handleBaseChange = (direction) => {
    cycleLayer(baseIndex, setBaseIndex, layerCounts["Bases"]);
  };

  const handleHairChange = (direction) => {
    cycleLayer(hairIndex, setHairIndex, layerCounts["Hairs"]);
  };

  const handleEyeChange = (direction) => {
    cycleLayer(eyeIndex, setEyeIndex, layerCounts["Eyes"]);
  };

  const handleNoseChange = (direction) => {
    cycleLayer(noseIndex, setNoseIndex, layerCounts["Noses"]);
  };

  const handleMouthChange = (direction) => {
    cycleLayer(mouthIndex, setMouthIndex, layerCounts["Mouths"]);
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
      await addParticipant(eventId, userId, username);

      localStorage.setItem("userDocId", userId);
      localStorage.setItem("userId", userId);
      localStorage.setItem("eventId", eventId);
      localStorage.setItem("username", username);

      navigate(`/lobby/${eventId}`);
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong");
    }
  };

  return (
    <div>
      <h1>Join Game</h1>

      <div className={styles.avatarCreator}>
        <div className={styles.avatarView}><svg width="243" height="300" viewBox="0 0 462 571" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<g id="Avatar">
<g id="Bases">
<g id="Base01">
<g id="Base01_2">
<path fill-rule="evenodd" clip-rule="evenodd" d="M228.539 73.1335C113.751 73.1335 75.1182 155.065 75.1182 256.133C75.1182 339.532 101.424 409.901 175.118 431.957C190.731 436.629 208.471 439.133 228.539 439.133C247.364 439.133 264.172 436.93 279.118 432.8C355.308 411.746 383.118 340.627 383.118 256.133C383.118 155.065 343.327 73.1335 228.539 73.1335Z" fill="#4F4F4F"/>
<path d="M228.539 439.133C208.471 439.133 190.731 436.629 175.118 431.957V458.133H128.118C66.2623 458.133 16.1182 508.278 16.1182 570.133H429.118C429.118 508.278 378.974 458.133 317.118 458.133H279.118V432.8C264.172 436.93 247.364 439.133 228.539 439.133Z" fill="#909090"/>
</g>
</g>
<g id="Base02">
<g id="Base01_3">
<path fill-rule="evenodd" clip-rule="evenodd" d="M225.618 103.133C67.7846 103.133 14.1182 155.065 14.1182 256.133C14.1182 339.532 93.424 409.901 167.118 431.957C182.731 436.629 200.471 439.133 220.539 439.133C239.364 439.133 256.172 436.93 271.118 432.8C347.308 411.746 437.618 340.627 437.618 256.133C437.618 155.065 383.452 103.133 225.618 103.133Z" fill="#886761"/>
<path d="M220.539 439.133C200.471 439.133 182.731 436.629 167.118 431.957V458.133H120.118C58.2623 458.133 8.11816 508.278 8.11816 570.133H421.118C421.118 508.278 370.974 458.133 309.118 458.133H271.118V432.8C256.172 436.93 239.364 439.133 220.539 439.133Z" fill="#909090"/>
</g>
</g>
</g>
<g id="Hairs">
<g id="Hair02">
<path id="Vector 14" d="M82.1181 187.133C76.9182 210.333 35.9515 213.633 27.6181 216.133C10.1648 227.133 -2.88185 203.633 12.1181 140.133C27.1181 76.6335 113.618 70.6335 186.118 64.1335C258.618 57.6335 321.618 73.1335 371.118 90.6335C420.618 108.133 390.118 192.133 377.618 198.633C367.618 203.833 348.451 146.8 309.118 125.133C274.618 125.133 255.718 142.633 224.118 166.633C192.697 190.497 121.432 166.904 89.1665 151.89C98.19 156.354 87.2191 164.375 82.1181 187.133Z" fill="url(#paint0_linear_134_141)"/>
<path id="Vector 15" d="M82.1181 187.133C76.9182 210.333 35.9515 213.633 27.6181 216.133C10.1648 227.133 -2.88185 203.633 12.1181 140.133C27.1181 76.6335 113.618 70.6335 186.118 64.1335C258.618 57.6335 321.618 73.1335 371.118 90.6335C420.618 108.133 390.118 192.133 377.618 198.633C367.618 203.833 348.451 146.8 309.118 125.133C274.618 125.133 255.718 142.633 224.118 166.633C192.697 190.497 121.432 166.904 89.1665 151.89C98.19 156.354 87.2191 164.375 82.1181 187.133Z" fill="url(#pattern0_134_141)"/>
</g>
<g id="Hair01">
<path id="Hair01_2" d="M207.118 143.133C194.618 170.967 160.218 198.633 122.618 198.633C85.0182 198.633 72.2848 208.967 70.6182 214.133C68.4515 246.133 72.4182 313.033 91.6182 338.633C110.818 364.233 138.451 392.633 152.118 403.633C142.285 415.8 109.918 440.733 55.1182 429.133C21.3895 421.994 7.01874 419.034 2.11983 418.085C1.9509 418.103 1.78366 418.119 1.61816 418.133C-0.304412 417.685 -0.940678 417.493 2.11983 418.085C17.4321 416.487 46.5963 402.132 44.6182 356.633C42.1182 299.133 -25.8818 116.633 80.6182 41.6335C187.118 -33.3665 358.618 9.63347 389.618 41.6335C420.618 73.6335 411.118 341.133 404.118 368.633C398.518 390.633 440.118 415.8 461.618 425.633C436.452 426.8 380.918 429.133 360.118 429.133C339.318 429.133 311.785 414.467 300.618 407.133C329.118 389.133 383.518 333.433 373.118 254.633C362.718 175.833 266.785 153.633 217.618 134.133L207.118 143.133Z" fill="#A58F74"/>
</g>
</g>
<g id="Mouths">
<g id="Mouth03">
<g id="Mouth03_2">
<path d="M289.711 312.782C242.423 334.782 192.232 316.282 153.656 312.782C115.079 309.281 134.989 418.281 167.344 396.781C199.699 375.282 247.816 374.282 283.904 387.281C319.992 400.281 336.999 290.782 289.711 312.782Z" fill="#1E1E1E"/>
<path d="M128.228 326.161C130.186 311.188 141.188 306.412 141.188 306.412L146.749 305.812C144.221 308.191 138.824 309.087 133.611 316.866C128.032 325.19 127.638 342.286 126.295 343.038C125.541 339.298 127.389 332.582 128.228 326.161Z" fill="#1E1E1E"/>
<path d="M151.847 403.721C142.037 402.198 139.881 391.692 139.881 391.692L140.001 386.337C141.352 388.719 141.444 393.909 146.147 398.752C151.18 403.934 162.553 403.895 162.929 405.173C160.363 405.993 156.053 404.374 151.847 403.721Z" fill="#1E1E1E"/>
<path d="M313.243 309.086C322.64 312.806 323.118 323.613 323.118 323.613L322.164 328.845C321.21 326.199 321.929 321.081 318.065 315.258C313.931 309.028 302.755 306.488 302.585 305.147C305.234 304.924 309.213 307.491 313.243 309.086Z" fill="#1E1E1E"/>
<path d="M305.474 377.749C302.705 383.482 291.485 383.526 289.296 383.282C285.316 382.251 276.864 382.331 254.963 377.749C227.586 372.02 217.943 376.603 206.336 376.282C194.728 375.96 163.221 393.432 157.804 393.282C152.387 393.131 143.978 371.36 142.996 361.946C142.014 352.532 147.902 348.278 152.159 348.396C156.415 348.514 159.06 351.9 162.542 351.997C165.328 352.074 187.16 353.617 201.263 353.617C215.366 353.617 246.244 359.589 253.208 359.782C260.173 359.975 267.087 352.243 271.875 348.396C275.608 345.396 301.368 349.475 305.205 351.238C309.043 353.001 314.531 358.995 305.474 377.749Z" fill="#A29F9F"/>
<path d="M142.041 325.282C142.373 319.282 146.327 318.115 148.678 318.282C152.964 319.115 167.427 321.682 190.988 325.282C220.439 329.782 243.668 329.782 256.112 329.782C268.556 329.782 295.933 318.282 301.741 318.282C307.548 318.282 310.037 328.282 311.281 336.782C312.525 345.282 306.303 349.282 301.741 349.282C297.178 349.282 294.274 346.282 290.541 346.282H269.801C267.312 349.782 261.09 357.282 256.112 359.282C251.134 361.282 243.806 358.448 240.764 356.782C238.414 357.782 232.053 359.982 225.417 360.782C217.121 361.782 212.143 349.282 211.728 350.782C211.313 352.282 193.477 351.782 186.01 351.782C178.544 351.782 172.736 344.282 169.003 349.282C165.27 354.282 150.752 350.782 146.604 349.282C142.456 347.782 141.626 332.782 142.041 325.282Z" fill="#737373"/>
<path d="M148.678 320.282C145.359 320.282 142.041 325.615 140.797 328.282C140.382 322.782 142.041 320.282 146.189 318.282C150.337 316.282 162.781 320.282 167.344 321.282C170.994 322.082 198.454 325.282 211.728 326.782C219.886 327.448 236.782 328.782 239.105 328.782C242.009 328.782 259.016 328.282 261.505 327.782C263.993 327.282 285.563 321.782 287.222 320.782C288.882 319.782 301.741 317.282 304.229 317.282C306.22 317.282 308.654 323.615 309.622 326.782C308.516 325.782 305.391 323.782 301.741 323.782C298.09 323.782 297.454 328.115 297.593 330.282L292.2 323.782C290.209 321.382 281.968 324.782 278.097 326.782C275.746 328.948 270.713 333.282 269.386 333.282C268.058 333.282 264.132 331.282 262.334 330.282H238.276C238.276 330.282 222.513 328.782 221.683 328.782C220.854 328.782 207.165 331.782 203.017 333.282L190.988 330.282C186.425 328.115 175.972 323.782 170.662 323.782C165.353 323.782 160.154 326.782 158.218 328.282C156.421 325.615 151.996 320.282 148.678 320.282Z" fill="#543E3E"/>
<path d="M238.69 335.282V358.282H241.594C240.626 349.948 238.69 333.682 238.69 335.282Z" fill="black"/>
</g>
</g>
<g id="Mout02">
<path id="Vector 7" d="M172.118 341.133H223.173C225.738 341.133 228.095 342.703 230.341 343.941C231.583 344.625 233.187 345.133 235.162 345.133C236.503 345.133 237.622 344.899 238.545 344.534C241.362 343.42 244.168 341.133 247.198 341.133H302.118" stroke="black" stroke-width="10" stroke-linecap="round"/>
</g>
<g id="Mouth01">
<path id="Mouth01_2" d="M176.118 349.133H255.118" stroke="black" stroke-width="6" stroke-linecap="round"/>
</g>
</g>
<g id="Noses">
<g id="Nose02">
<path id="Vector" d="M243.479 281.575L252.707 202.038C253.243 197.415 251.268 192.859 247.528 190.09L222.998 185.819C215.221 184.464 208.277 190.859 208.988 198.721L216.315 279.789L214.231 279.451C198.746 276.946 192.897 298.931 207.579 304.453L231.784 313.555C235.941 315.119 240.608 314.452 244.16 311.787L253.497 304.784C264.428 296.586 256.932 279.242 243.479 281.575Z" fill="url(#paint1_linear_134_141)"/>
</g>
<g id="Nose01">
<path id="Nose01_2" d="M233.715 304.22C236.191 309.257 238.251 314.671 237.86 320.27C236.56 338.882 230.272 336.633 217.118 336.633C202.206 336.633 190.118 314.024 190.118 286.133C190.118 258.243 202.206 235.633 217.118 235.633C230.831 235.633 219.324 274.956 233.715 304.22Z" fill="url(#paint2_linear_134_141)"/>
<path id="Nose01_3" d="M212.618 322.133C212.618 326.276 212.432 329.633 209.118 329.633C205.804 329.633 200.118 322.776 200.118 318.633C200.118 314.491 200.304 311.133 203.618 311.133C206.932 311.133 212.618 317.991 212.618 322.133Z" fill="#141414"/>
<path id="Nose01_4" d="M223.118 325.674C223.118 328.137 223.237 330.133 225.358 330.133C227.479 330.133 231.118 326.056 231.118 323.593C231.118 321.13 230.999 319.133 228.878 319.133C226.757 319.133 223.118 323.211 223.118 325.674Z" fill="#141414"/>
</g>
</g>
<g id="Eyes">
<g id="Eye02">
<g id="Group 1">
<path id="Vector 8" d="M137.01 249.296C153.436 250.208 159.708 265.826 161.737 273.043C162.366 275.279 161.56 277.594 159.808 279.119C157.434 281.187 153.519 284.496 148.01 288.836C136.246 298.105 104.01 284.674 96.2803 278.728C92.2441 276.116 93.6941 270.663 98.5821 265.147C105.935 256.849 121.069 248.41 137.01 249.296Z" fill="black"/>
<path id="Vector 9" d="M135.524 253.16C155.79 253.367 156.771 270.521 156.682 274.995C156.668 275.701 156.705 276.418 156.553 277.107C156.175 278.813 154.423 282.538 146.821 287.944C137.477 294.589 117.181 287.819 104.726 282.036C101.821 280.687 100.337 277.415 101.652 274.494C105.827 265.229 116.137 252.963 135.524 253.16Z" fill="#F8F1DE"/>
<path id="Vector 10" d="M127.497 284.377C114.556 282.34 111.442 265.35 118.875 255.539C123.037 253.557 139.388 250.128 144.145 253.458C148.902 258.512 159.605 289.431 127.497 284.377Z" fill="black"/>
<path id="Vector 11" d="M118.578 272.188C116.675 267.669 120.262 260.097 121.253 257.917C123.929 257.719 131.599 255.301 128.983 257.917C125.713 261.188 125.415 272.782 135.524 272.782C143.61 272.782 138.893 262.476 135.524 257.323L143.848 255.242C150.091 270.998 146.821 279.025 140.28 281.701C130.65 285.641 120.956 277.836 118.578 272.188Z" fill="url(#paint3_linear_134_141)"/>
<path id="Vector 12" d="M121.18 259.004C119.892 260.043 123.333 261.218 125.214 261.675C126.574 261.788 129.2 261.477 128.822 259.335C128.349 256.657 122.789 257.705 121.18 259.004Z" fill="url(#paint4_linear_134_141)"/>
<path id="Vector 13" d="M105.794 243.052C112.215 242.815 138.596 248.998 157.821 253.16C157.821 253.16 174.291 254.528 177.145 255.242C179.999 255.955 180.118 254.151 180.118 251.377L178.929 246.62C178.929 246.62 170.109 243.548 167.632 242.458L166.74 245.431C165.253 245.034 164.361 245.431 158.415 243.052C156.988 243.052 135.424 237.305 123.334 234.133C125.316 235.124 126.129 236.512 125.415 236.512C124.524 236.512 118.875 234.133 104.01 235.62C92.1182 236.809 83.7938 248.404 81.1182 254.052C86.6677 250.485 99.3722 243.29 105.794 243.052Z" fill="#1A1A1A"/>
</g>
<g id="Group 2">
<path id="Vector 8_2" d="M296.614 252.377C281.347 253.225 275.417 267.596 273.447 274.467C272.807 276.699 273.611 279.015 275.364 280.538C277.609 282.489 281.233 285.544 286.28 289.521C297.331 298.228 327.614 285.611 334.875 280.025C338.667 277.572 337.304 272.449 332.713 267.267C325.805 259.472 311.588 251.545 296.614 252.377Z" fill="black"/>
<path id="Vector 9_2" d="M298.01 256.007C279.064 256.201 278.059 272.161 278.132 276.457C278.144 277.163 278.108 277.877 278.27 278.565C278.653 280.194 280.348 283.67 287.397 288.683C296.101 294.872 314.922 288.671 326.645 283.27C329.554 281.929 331.036 278.655 329.691 275.748C325.683 267.082 316.013 255.824 298.01 256.007Z" fill="#F8F1DE"/>
<path id="Vector 10_2" d="M305.55 285.332C317.707 283.418 320.632 267.458 313.65 258.242C309.74 256.38 294.379 253.159 289.911 256.287C285.443 261.034 275.388 290.079 305.55 285.332Z" fill="black"/>
<path id="Vector 11_2" d="M313.929 273.881C315.716 269.636 312.346 262.524 311.415 260.476C308.902 260.29 301.697 258.018 304.154 260.476C307.226 263.548 307.506 274.44 298.01 274.44C290.414 274.44 294.845 264.758 298.01 259.917L290.19 257.962C284.325 272.764 287.397 280.305 293.542 282.818C302.589 286.519 311.695 279.188 313.929 273.881Z" fill="url(#paint5_linear_134_141)"/>
<path id="Vector 12_2" d="M311.485 261.497C312.694 262.473 309.462 263.576 307.695 264.006C306.417 264.112 303.95 263.82 304.306 261.808C304.75 259.292 309.973 260.276 311.485 261.497Z" fill="url(#paint6_linear_134_141)"/>
<path id="Vector 13_2" d="M325.938 246.512C319.906 246.288 295.124 252.097 277.064 256.007C277.064 256.007 261.592 257.292 258.911 257.962C256.23 258.633 256.118 256.938 256.118 254.332L257.235 249.863C257.235 249.863 265.521 246.977 267.848 245.953L268.686 248.746C270.082 248.374 270.92 248.746 276.506 246.512C277.846 246.512 298.103 241.112 309.46 238.133C307.599 239.064 306.835 240.368 307.506 240.368C308.343 240.368 313.65 238.133 327.614 239.53C338.785 240.647 346.605 251.539 349.118 256.845C343.905 253.494 331.97 246.735 325.938 246.512Z" fill="#1A1A1A"/>
</g>
</g>
<g id="Eye01">
<g id="Vector_2">
<path d="M172.118 275.633C172.118 287.508 152.643 297.133 128.618 297.133C104.594 297.133 85.1182 287.508 85.1182 275.633C85.1182 263.759 104.594 254.133 128.618 254.133C152.643 254.133 172.118 263.759 172.118 275.633Z" fill="#D9D9D9"/>
<path d="M358.118 275.633C358.118 287.508 338.643 297.133 314.618 297.133C290.594 297.133 271.118 287.508 271.118 275.633C271.118 263.759 290.594 254.133 314.618 254.133C338.643 254.133 358.118 263.759 358.118 275.633Z" fill="#D9D9D9"/>
<path d="M161.349 277.133C161.349 285.418 154.47 292.133 145.984 292.133C137.497 292.133 130.618 285.418 130.618 277.133C130.618 268.849 137.497 262.133 145.984 262.133C154.47 262.133 161.349 268.849 161.349 277.133Z" fill="black"/>
<path d="M345.08 275.633C345.08 283.918 338.261 290.633 329.849 290.633C321.437 290.633 314.618 283.918 314.618 275.633C314.618 267.349 321.437 260.633 329.849 260.633C338.261 260.633 345.08 267.349 345.08 275.633Z" fill="black"/>
</g>
<path id="Vector 4" d="M76.6182 248.133C89.2848 237.133 111.893 219.636 147.618 231.88C174.618 241.133 185.118 240.133 194.618 236.88" stroke="black" stroke-width="10"/>
<path id="Vector 5" d="M371.195 211.783C355.66 205.45 324.376 191.532 298.744 219.267C273.112 247.002 264.258 242.092 255.86 239.14" stroke="black" stroke-width="10"/>
</g>
</g>
</g>
<defs>
<linearGradient id="paint0_linear_134_141" x1="201.983" y1="62.6211" x2="201.983" y2="218.742" gradientUnits="userSpaceOnUse">
<stop offset="0.00961538" stop-color="#28B4AD"/>
<stop offset="1" stop-color="#2F114E"/>
</linearGradient>
<linearGradient id="paint1_linear_134_141" x1="224.398" y1="197.633" x2="240.898" y2="314.633" gradientUnits="userSpaceOnUse">
<stop offset="0.298077" stop-color="#886761"/>
<stop offset="1" stop-color="#C16D6D"/>
</linearGradient>
<linearGradient id="paint2_linear_134_141" x1="214.118" y1="235.633" x2="214.118" y2="336.719" gradientUnits="userSpaceOnUse">
<stop offset="0.336538" stop-color="#343434"/>
<stop offset="1" stop-color="#9B5656"/>
</linearGradient>
<linearGradient id="paint3_linear_134_141" x1="132.37" y1="257.323" x2="132.37" y2="278.951" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-color="#334C58"/>
</linearGradient>
<linearGradient id="paint4_linear_134_141" x1="119.47" y1="250.188" x2="123.334" y2="261.188" gradientUnits="userSpaceOnUse">
<stop offset="0.586538" stop-color="#191919"/>
<stop offset="1" stop-color="#F8F1DE"/>
</linearGradient>
<linearGradient id="paint5_linear_134_141" x1="300.972" y1="259.917" x2="300.972" y2="280.235" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="1" stop-color="#334C58"/>
</linearGradient>
<linearGradient id="paint6_linear_134_141" x1="313.091" y1="253.215" x2="309.461" y2="263.548" gradientUnits="userSpaceOnUse">
<stop offset="0.586538" stop-color="#191919"/>
<stop offset="1" stop-color="#F8F1DE"/>
</linearGradient>
<pattern id="pattern0_134_141" patternUnits="userSpaceOnUse" patternTransform="matrix(48.3378 0 0 52.4389 11.5256 57.3727)" preserveAspectRatio="none" viewBox="15.4919 -0.280388 51.9762 56.386" width="1" height="1">
<use xlink:href="#pattern0_134_141_inner" transform="translate(0 -169.158)"/>
<use xlink:href="#pattern0_134_141_inner" transform="translate(25.9881 -140.965)"/>
<use xlink:href="#pattern0_134_141_inner" transform="translate(0 -112.772)"/>
<use xlink:href="#pattern0_134_141_inner" transform="translate(25.9881 -84.5789)"/>
<use xlink:href="#pattern0_134_141_inner" transform="translate(0 -56.386)"/>
<use xlink:href="#pattern0_134_141_inner" transform="translate(25.9881 -28.193)"/>
<g id="pattern0_134_141_inner">
<path id="Vector 16" d="M34.4216 0.271912C34.4216 0.271912 21.6385 32.5139 18.4217 54.2719C15.2049 76.0299 18.4216 112.772 18.4216 112.772" stroke="black" stroke-width="3"/>
</g>
<use xlink:href="#pattern0_134_141_inner" transform="translate(25.9881 28.193)"/>
</pattern></defs>
</svg></div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Base" onClick={() => handleBaseChange("left")} />
          <p>Base</p>
          <ToggleButton direction="right" label="Next Base" onClick={() => handleBaseChange("right")} />
        </div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Hair" onClick={() => handleHairChange("left")} />
          <p>Hair</p>
          <ToggleButton direction="right" label="Next Hair" onClick={() => handleHairChange("right")} />
        </div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Eyes" onClick={() => handleEyeChange("left")} />
          <p>Eyes</p>
          <ToggleButton direction="right" label="Next Eyes" onClick={() => handleEyeChange("right")} />
        </div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Nose" onClick={() => handleNoseChange("left")} />
          <p>Nose</p>
          <ToggleButton direction="right" label="Next Nose" onClick={() => handleNoseChange("right")} />
        </div>
        <div className={styles.avatarRow}>
          <ToggleButton direction="left" label="Previous Mouth" onClick={() => handleMouthChange("left")} />
          <p>Mouth</p>
          <ToggleButton direction="right" label="Next Mouth" onClick={() => handleMouthChange("right")} />
        </div>
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
