import { useState } from "react";
import styles from "./AddCustomQuestion.module.css";

export default function AddCustomQuestion({ eventId, adminId, onQuestionAdded, categories }) {
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [options, setOptions] = useState(["Agree", "Disagree"]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!text.trim()) {
      setMessage("Enter question text");
      return;
    }
    
    if (!category.trim()) {
      setMessage("Select or enter a category");
      return;
    }

    if (options.some((opt) => !opt.trim())) {
      setMessage("All options must have text");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await onQuestionAdded({
        text: text.trim(),
        category: category.trim(),
        options: options.map((opt) => opt.trim()),
      });

      // Reset form
      setText("");
      setCategory("");
      setOptions(["Agree", "Disagree"]);
      setMessage("✅ Question added!");
      setTimeout(() => {
        setShowForm(false);
        setMessage("");
      }, 1500);
    } catch (error) {
      console.error("Error adding question:", error);
      setMessage("Error adding question");
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className={styles.container}>
        <button 
          onClick={() => setShowForm(true)}
          className={styles.toggleBtn}
        >
          + Add Custom Question
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <h3>Create Custom Question</h3>

        <div className={styles.formGroup}>
          <label>Question Text:</label>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g., Remote work is productive"
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <label>Category:</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
          >
            <option value="">Select or type category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label>Answer Options:</label>
          {options.map((option, index) => (
            <div key={index} className={styles.optionRow}>
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(index, e.target.value)}
                placeholder={`Option ${index + 1}`}
                disabled={loading}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  className={styles.removeBtn}
                  disabled={loading}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddOption}
            className={styles.addOptionBtn}
            disabled={loading}
          >
            + Add Option
          </button>
        </div>

        <div className={styles.buttonGroup}>
          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Question"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className={styles.cancelBtn}
            disabled={loading}
          >
            Cancel
          </button>
        </div>

        {message && (
          <p className={message.startsWith("✅") ? styles.successMessage : styles.errorMessage}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}
