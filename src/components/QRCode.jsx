import { QRCodeSVG } from "qrcode.react";
import "./QRCode.css";

export default function EventQRCode({ eventCode }) {
  // Build the join URL with the event code pre-filled
  const joinUrl = `${window.location.origin}/join?code=${eventCode}`;

  return (
    <div className="qr-code-container">
      <div id="qr-code">
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
