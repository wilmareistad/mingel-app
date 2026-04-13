import { useState, useEffect, useRef } from "react";
import AvatarSVG from "../assets/avatar.svg";
import styles from "../styles/AvatarDisplay.module.css";

// Global cache for parsed SVG - fetched and parsed once
let parsedSVGCache = null;
let cachePromise = null;

function getParsedSVG() {
  if (parsedSVGCache) return Promise.resolve(parsedSVGCache);
  
  if (!cachePromise) {
    cachePromise = fetch(AvatarSVG)
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        parsedSVGCache = doc.documentElement;
        return parsedSVGCache;
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
  const svgContainerRef = useRef(null);

  useEffect(() => {
    if (!svgContainerRef.current) return;

    getParsedSVG().then((originalSVG) => {
      if (!svgContainerRef.current) return;

      // Clone the entire SVG (includes all defs, patterns, clip-paths)
      const svgElement = originalSVG.cloneNode(true);

      // Get background color from CSS variable
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--avatar-background-color")
        .trim() || "#980c50";

      // Update the background rect
      const backgroundRect = svgElement.querySelector("rect");
      if (backgroundRect) {
        backgroundRect.setAttribute("fill", bgColor);
      }

      // Hide all layer variants except the selected ones
      const updates = [
        { groupId: "Bases", index: baseIndex },
        { groupId: "Hairs", index: hairIndex },
        { groupId: "Eyes", index: eyeIndex },
        { groupId: "Noses", index: noseIndex },
        { groupId: "Mouths", index: mouthIndex },
        { groupId: "Clothes", index: clothesIndex },
      ];

      updates.forEach(({ groupId, index }) => {
        const group = svgElement.getElementById(groupId);
        if (!group) return;

        Array.from(group.children).forEach((child, idx) => {
          child.style.display = idx === index ? "block" : "none";
        });
      });

      // Add CSS class for styling
      svgElement.setAttribute("class", styles.avatarSvg);

      // Clear and append to container
      if (svgContainerRef.current) {
        while (svgContainerRef.current.firstChild) {
          svgContainerRef.current.removeChild(svgContainerRef.current.firstChild);
        }
        svgContainerRef.current.appendChild(svgElement);
      }
    });
  }, [baseIndex, hairIndex, eyeIndex, noseIndex, mouthIndex, clothesIndex]);

  return (
    <div
      ref={svgContainerRef}
      className={styles.avatarContainer}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    />
  );
}
