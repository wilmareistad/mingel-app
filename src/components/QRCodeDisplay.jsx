import { QRCodeSVG } from "qrcode.react";
import styles from "../styles/QRCodeDisplay.module.css";

export default function EventQRCode({ eventCode }) {
  // Build the join URL with the event code pre-filled
  const joinUrl = `${window.location.origin}/join?code=${eventCode}`;

  return (
    <div className={styles.qrCodeContainer}>
      <div id={styles.qrCode}>
        <QRCodeSVG
          value={joinUrl}
          size={120}
          level="H"
          includeMargin={true}
        />
      </div>
      <p><strong>Scan to join event</strong></p>
    </div>
  );
}
