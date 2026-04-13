import { useState, useEffect, memo } from "react";
import { getLayerCache } from "./AvatarDefs";
import styles from "../styles/AvatarDisplay.module.css";

const AvatarDisplay = memo(function AvatarDisplay({
  baseIndex = 0,
  hairIndex = 0,
  eyeIndex = 0,
  noseIndex = 0,
  mouthIndex = 0,
  clothesIndex = 0,
}) {
  const [svgContent, setSvgContent] = useState("");
  const [viewBox, setViewBox] = useState("0 0 1024 1024");

  useEffect(() => {
    getLayerCache().then(layers => {
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--avatar-background-color").trim() || "#980c50";

      setViewBox(layers.__viewBox__);
      setSvgContent(`
        <rect width="100%" height="100%" fill="${bgColor}"/>
        ${layers.Clothes?.[clothesIndex] || ""}
        ${layers.Bases?.[baseIndex]      || ""}
        ${layers.Mouths?.[mouthIndex]    || ""}
        ${layers.Noses?.[noseIndex]      || ""}
        ${layers.Eyes?.[eyeIndex]        || ""}
        ${layers.Hairs?.[hairIndex]      || ""}
      `);
    });
  }, [baseIndex, hairIndex, eyeIndex, noseIndex, mouthIndex, clothesIndex]);

  return (
    <svg
      viewBox={viewBox}
      width="100%"
      height="100%"
      className={styles.avatarSvg}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
});

export default AvatarDisplay;