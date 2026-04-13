import { useEffect, useState } from "react";
import AvatarSVG from "../assets/avatar.svg";

let defsCache = null;
let defsPromise = null;

export function getLayerCache() {
  if (defsCache) return Promise.resolve(defsCache);
  if (!defsPromise) {
    defsPromise = fetch(AvatarSVG)
      .then(res => res.text())
      .then(svgText => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, "image/svg+xml");

        defsCache = {};
        defsCache.__viewBox__ = doc.documentElement.getAttribute("viewBox") || "0 0 1024 1024";
        defsCache.__defs__ = doc.querySelector("defs")?.outerHTML || "";

        const groups = ["Clothes", "Bases", "Mouths", "Noses", "Eyes", "Hairs"];
        groups.forEach(groupId => {
          const group = doc.getElementById(groupId);
          defsCache[groupId] = group
            ? Array.from(group.children).map(child => {
                child.style.display = "";
                return child.outerHTML;
              })
            : [];
        });

        return defsCache;
      });
  }
  return defsPromise;
}

// Render this ONCE at the top level of your app (e.g. in App.jsx or Layout.jsx)
// It injects a single hidden SVG with all defs — all avatars share them
export default function AvatarDefs() {
  const [defs, setDefs] = useState("");

  useEffect(() => {
    getLayerCache().then(layers => {
      setDefs(layers.__defs__);
    });
  }, []);

  if (!defs) return null;

  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: defs }}
    />
  );
}
