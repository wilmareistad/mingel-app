import { useState, useEffect, useRef } from "react";
import AvatarSVG from "../assets/avatar.svg";
import styles from "../styles/AvatarDisplay.module.css";

export default function AvatarViewer({
  baseIndex,
  hairIndex,
  eyeIndex,
  noseIndex,
  mouthIndex,
  clothesIndex,
  layerCounts,
}) {
  const svgContainerRef = useRef(null);

  // Load and update SVG visibility whenever indices change
  useEffect(() => {
    if (!svgContainerRef.current) return;

    // Fetch the SVG file as text
    fetch(AvatarSVG)
      .then((res) => res.text())
      .then((svgText) => {
        // Get background color from CSS variable
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--avatar-background-color').trim() || "#980c50";
        
        // Parse the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

        // Find the Avatar group and insert background inside it
        const avatarGroup = svgElement.getElementById("Avatar");
        if (avatarGroup) {
          // Create background group
          const backgroundGroup = svgDoc.createElementNS("http://www.w3.org/2000/svg", "g");
          backgroundGroup.setAttribute("id", "Background");
          
          // Create background rectangle
          const backgroundRect = svgDoc.createElementNS("http://www.w3.org/2000/svg", "rect");
          backgroundRect.setAttribute("width", "100%");
          backgroundRect.setAttribute("height", "100%");
          backgroundRect.setAttribute("fill", bgColor);
          
          backgroundGroup.appendChild(backgroundRect);
          avatarGroup.insertBefore(backgroundGroup, avatarGroup.firstChild);
        }

        // Update visibility for each layer type
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

          const children = Array.from(group.children);
          children.forEach((child, idx) => {
            child.style.display = idx === index ? "block" : "none";
          });
        });

        // Set width and height to fit container
        svgElement.setAttribute("width", "300");
        svgElement.setAttribute("height", "300");
        svgElement.setAttribute("class", styles.avatarSvg);

        // Clear previous SVG but preserve container classes
        while (svgContainerRef.current.firstChild) {
          svgContainerRef.current.removeChild(svgContainerRef.current.firstChild);
        }
        svgContainerRef.current.appendChild(svgElement);
      });
  }, [baseIndex, hairIndex, eyeIndex, noseIndex, mouthIndex, clothesIndex]);

  return (
    <div
      ref={svgContainerRef}
      className={styles.avatarContainer}
    />
  );
};
