import { useState, useEffect, useRef } from "react";
import AvatarSVG from "../assets/avatar.svg";
import styles from "../styles/AvatarDisplay.module.css";

// Pre-processed cache: { Bases: [htmlString, ...], Hairs: [...], ..., __defs__: "...", __viewBox__: "..." }
let layerCache = null;
let cachePromise = null;

function getLayerCache() {
  if (layerCache) return Promise.resolve(layerCache);
  if (!cachePromise) {
    cachePromise = fetch(AvatarSVG)
      .then(res => res.text())
      .then(svgText => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");
        const groups = ["Bases", "Hairs", "Eyes", "Noses", "Mouths", "Clothes"];
        layerCache = {};

        // Extract and cache defs (patterns, filters, clip-paths)
        const defs = doc.querySelector("defs");
        layerCache.__defs__ = defs ? defs.outerHTML : "";
        layerCache.__viewBox__ = doc.documentElement.getAttribute("viewBox") || "0 0 1024 1024";

        groups.forEach(groupId => {
          const group = doc.getElementById(groupId);
          layerCache[groupId] = group
            ? Array.from(group.children).map(child => {
                child.style.display = "";
                return child.outerHTML;
              })
            : [];
        });
        return layerCache;
      });
  }
  return cachePromise;
}

// Unique ID counter for each avatar instance
let instanceCounter = 0;

export default function AvatarDisplay({
  baseIndex = 0,
  hairIndex = 0,
  eyeIndex = 0,
  noseIndex = 0,
  mouthIndex = 0,
  clothesIndex = 0,
}) {
  const [svgContent, setSvgContent] = useState("");
  const [viewBox, setViewBox] = useState("0 0 1024 1024");
  // Unique ID per instance to avoid pattern ID collisions between avatars
  const instanceId = useRef(`av${instanceCounter++}`).current;

  useEffect(() => {
    getLayerCache().then(layers => {
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--avatar-background-color").trim() || "#980c50";

      // Prefix all IDs in defs and url() references to avoid collisions
      // Each avatar gets a unique prefix (av0, av1, etc.) applied to all pattern/clipPath IDs
      const prefix = instanceId;
      const defs = layers.__defs__
        .replace(/id="([^"]+)"/g, `id="${prefix}_$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#${prefix}_$1)`);

      // Helper to prefix url() references in layer HTML
      const prefixLayer = (html) =>
        html.replace(/url\(#([^)]+)\)/g, `url(#${prefix}_$1)`);

      setViewBox(layers.__viewBox__);
      setSvgContent(`
        ${defs}
        <rect width="100%" height="100%" fill="${bgColor}"/>
        ${prefixLayer(layers.Bases?.[baseIndex]      || "")}
        ${prefixLayer(layers.Hairs?.[hairIndex]      || "")}
        ${prefixLayer(layers.Eyes?.[eyeIndex]        || "")}
        ${prefixLayer(layers.Noses?.[noseIndex]      || "")}
        ${prefixLayer(layers.Mouths?.[mouthIndex]    || "")}
        ${prefixLayer(layers.Clothes?.[clothesIndex] || "")}
      `);
    });
  }, [baseIndex, hairIndex, eyeIndex, noseIndex, mouthIndex, clothesIndex, instanceId]);

  return (
    <svg
      viewBox={viewBox}
      width="100%"
      height="100%"
      className={styles.avatarSvg}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}