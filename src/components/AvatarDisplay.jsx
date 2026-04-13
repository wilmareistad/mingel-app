import { useState, useEffect, useRef, memo } from "react";
import AvatarSVG from "../assets/avatar.svg";
import styles from "../styles/AvatarDisplay.module.css";

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

        layerCache = {};
        layerCache.__viewBox__ = doc.documentElement.getAttribute("viewBox") || "0 0 1024 1024";

        const defs = doc.querySelector("defs");
        layerCache.__defs__ = defs ? defs.outerHTML : "";

        console.log("defs size:", layerCache.__defs__.length);

        const groups = ["Clothes", "Bases", "Mouths", "Noses", "Eyes", "Hairs"];
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

let instanceCounter = 0;

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
  const instanceId = useRef(`av${instanceCounter++}`).current;

  useEffect(() => {
    getLayerCache().then(layers => {
      const bgColor = getComputedStyle(document.documentElement)
        .getPropertyValue("--avatar-background-color").trim() || "#980c50";

      const prefix = instanceId;

      const defs = layers.__defs__
        .replace(/id="([^"]+)"/g, `id="${prefix}_$1"`)
        .replace(/url\(#([^)]+)\)/g, `url(#${prefix}_$1)`)
        .replace(/xlink:href="#([^"]+)"/g, `xlink:href="#${prefix}_$1"`);

      const prefixLayer = (html) =>
        (html || "")
          .replace(/url\(#([^)]+)\)/g, `url(#${prefix}_$1)`)
          .replace(/xlink:href="#([^"]+)"/g, `xlink:href="#${prefix}_$1"`);

      setViewBox(layers.__viewBox__);
      setSvgContent(`
        ${defs}
        <rect width="100%" height="100%" fill="${bgColor}"/>
        ${prefixLayer(layers.Clothes?.[clothesIndex])}
        ${prefixLayer(layers.Bases?.[baseIndex])}
        ${prefixLayer(layers.Mouths?.[mouthIndex])}
        ${prefixLayer(layers.Noses?.[noseIndex])}
        ${prefixLayer(layers.Eyes?.[eyeIndex])}
        ${prefixLayer(layers.Hairs?.[hairIndex])}
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
});

export default AvatarDisplay;