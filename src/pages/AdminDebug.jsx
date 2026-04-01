import { useState } from "react";
import { cleanupAllEvents, deleteAllEvents, cleanupSingleEvent } from "../features/admin/cleanupEvents";
import styles from "./AdminDebug.module.css";

export default function AdminDebug() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [eventIdInput, setEventIdInput] = useState("");

  const handleCleanupAll = async () => {
    if (!window.confirm("Are you sure? This will reset ALL events to lobby state.")) {
      return;
    }
    
    setLoading(true);
    setMessage("Cleaning up all events...");
    
    try {
      const result = await cleanupAllEvents();
      setMessage(`✅ Cleanup complete! Cleaned: ${result.cleaned}, Errors: ${result.errors}`);
      console.log(result);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("⚠️ WARNING: This will DELETE ALL EVENTS AND RELATED DATA. Are you absolutely sure?")) {
      return;
    }
    
    if (!window.confirm("This is destructive and cannot be undone. Are you REALLY sure?")) {
      return;
    }
    
    setLoading(true);
    setMessage("Deleting all events...");
    
    try {
      const deleted = await deleteAllEvents();
      setMessage(`✅ Deleted ${deleted} events`);
      console.log(`Deleted ${deleted} events`);
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupSingle = async () => {
    if (!eventIdInput.trim()) {
      setMessage("⚠️ Please enter an event ID");
      return;
    }
    
    setLoading(true);
    setMessage(`Cleaning up event: ${eventIdInput}...`);
    
    try {
      await cleanupSingleEvent(eventIdInput.trim());
      setMessage(`✅ Event cleaned: ${eventIdInput}`);
      setEventIdInput("");
    } catch (error) {
      setMessage(`❌ Error: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>🔧 Admin Debug Panel</h1>
      
      <div className={styles.section}>
        <h2>Event Cleanup Tools</h2>
        
        <div className={styles.toolGroup}>
          <h3>Cleanup Single Event</h3>
          <p className={styles.description}>
            Reset a single event to lobby state without deleting data
          </p>
          <div className={styles.inputGroup}>
            <input
              type="text"
              placeholder="Enter event ID"
              value={eventIdInput}
              onChange={(e) => setEventIdInput(e.target.value)}
              disabled={loading}
              className={styles.input}
            />
            <button
              onClick={handleCleanupSingle}
              disabled={loading}
              className={`${styles.button} ${styles.primary}`}
            >
              {loading ? "Processing..." : "Cleanup Event"}
            </button>
          </div>
        </div>

        <div className={styles.toolGroup}>
          <h3>Cleanup All Events</h3>
          <p className={styles.description}>
            Reset ALL events to lobby state (safe - keeps data)
          </p>
          <button
            onClick={handleCleanupAll}
            disabled={loading}
            className={`${styles.button} ${styles.warning}`}
          >
            {loading ? "Processing..." : "Cleanup All Events"}
          </button>
        </div>

        <div className={styles.toolGroup}>
          <h3>Delete All Events</h3>
          <p className={styles.description}>
            ⚠️ DESTRUCTIVE: Permanently delete all events and data
          </p>
          <button
            onClick={handleDeleteAll}
            disabled={loading}
            className={`${styles.button} ${styles.danger}`}
          >
            {loading ? "Processing..." : "Delete All Events"}
          </button>
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${message.includes("❌") ? styles.error : styles.success}`}>
          {message}
        </div>
      )}
    </div>
  );
}
