import { useState, useEffect, useRef } from "react";
import AvatarSVG from "../assets/Avatar.svg";

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
        // Parse the SVG
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, "image/svg+xml");
        const svgElement = svgDoc.documentElement;

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
        svgElement.setAttribute("style", "max-width: 100%; max-height: 100%; width: auto; height: auto;");

        // Replace container content
        svgContainerRef.current.innerHTML = "";
        svgContainerRef.current.appendChild(svgElement);
      });
  }, [baseIndex, hairIndex, eyeIndex, noseIndex, mouthIndex, clothesIndex]);

  return (
    <div
      ref={svgContainerRef}
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
};
