import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import styles from "../styles/QRCodeDisplay.module.css";

export default function EventQRCode({ eventCode }) {
  const [qrSize, setQrSize] = useState(120);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      
      if (width >= 3200) {
        setQrSize(160); // Will be scaled 5x = 800px
      } else if (width >= 2560) {
        setQrSize(160); // Will be scaled 1.5x = 240px
      } else if (width >= 1440) {
        setQrSize(160); // Will be scaled 1.25x = 200px
      } else {
        setQrSize(160); // Base size
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Build the join URL with the event code pre-filled
  const joinUrl = `${window.location.origin}/join?code=${eventCode}`;

  return (
    <div className={styles.qrCodeContainer}>
      <div className={styles.qrCode}>
        <QRCodeSVG
          value={joinUrl}
          size={qrSize}
          level="H"
          includeMargin={true}
        />
      </div>
      <p><strong>Scan to join event</strong></p>
    </div>
  );
}
