import { useState, useEffect } from "react";
import AvatarSVG from "../assets/avatar.svg";
import styles from "../styles/AvatarDisplay.module.css";

// Global cache: { Bases: [svgPathString, ...], Hairs: [...], ... }
// Each string is the outerHTML of one layer variant - ready to use, no parsing needed
let layerCache = null;
let cachePromise = null;

function getLayerCache() {
  if (layerCache) return Promise.resolve(layerCache);
  
  if (!cachePromise) {
    cachePromise = fetch(AvatarSVG)
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");

        const groups = ["Bases", "Hairs", "Eyes", "Noses", "Mouths", "Clothes"];
        layerCache = {};

        groups.forEach((groupId) => {
          const group = doc.getElementById(groupId);
          if (!group) {
            layerCache[groupId] = [];
            return;
          }
          // Serialize only the outerHTML of each child — just the paths/shapes
          layerCache[groupId] = Array.from(group.children).map((child) => {
            child.style.display = ""; // clear any hidden styles
            return child.outerHTML;
          });
        });

        return layerCache;
      });
  }
  
  return cachePromise;
}

export default function AvatarDisplay({
  baseIndex = 0,
  hairIndex = 0,
  eyeIndex = 0,
  noseIndex = 0,
  mouthIndex = 0,
  clothesIndex = 0,
}) {
  const [svgContent, setSvgContent] = useState("");

  useEffect(() => {
    getLayerCache().then((layers) => {
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--avatar-background-color")
        .trim() || "#980c50";

      // String concatenation is super fast - just assembling the HTML we need
      const content = `
        <rect width="100%" height="100%" fill="${bgColor}"/>
        ${layers.Bases?.[baseIndex] || ""}
        ${layers.Hairs?.[hairIndex] || ""}
        ${layers.Eyes?.[eyeIndex] || ""}
        ${layers.Noses?.[noseIndex] || ""}
        ${layers.Mouths?.[mouthIndex] || ""}
        ${layers.Clothes?.[clothesIndex] || ""}
      `;
      setSvgContent(content);
    });
  }, [baseIndex, hairIndex, eyeIndex, noseIndex, mouthIndex, clothesIndex]);

  // Get viewBox from avatar.svg
  return (
    <svg
      viewBox="0 0 1024 1024"
      width="100%"
      height="100%"
      className={styles.avatarSvg}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
