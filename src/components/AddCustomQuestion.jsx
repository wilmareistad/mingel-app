import { useState, useEffect } from "react";
import styles from "./AddCustomQuestion.module.css";

export default function AddCustomQuestion({ eventId, adminId, onQuestionAdded, categories, eventCategories = [] }) {
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [options, setOptions] = useState(["Agree", "Disagree"]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Set default category to the last event category when form opens
  useEffect(() => {
    if (showForm && eventCategories.length > 0 && !category) {
      setCategory(eventCategories[eventCategories.length - 1]);
    }
  }, [showForm, eventCategories, category]);

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
    
    // Use new category if created, otherwise use selected category
    const finalCategory = showNewCategoryInput ? newCategory.trim() : category.trim();
    
    if (!finalCategory) {
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
        category: finalCategory,
        options: options.map((opt) => opt.trim()),
      });

      // Reset form
      setText("");
      setCategory("");
      setNewCategory("");
      setShowNewCategoryInput(false);
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
          {!showNewCategoryInput ? (
            <div className={styles.categoryRow}>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              >
                <option value="">Select a category</option>
                {eventCategories.length > 0 && (
                  <optgroup label="Event Categories">
                    {eventCategories.map((cat) => (
                      <option key={`event-${cat}`} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                )}
                {categories.length > 0 && (
                  <optgroup label="Global Categories">
                    {categories.map((cat) => (
                      <option key={`global-${cat}`} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <button
                type="button"
                onClick={() => {
                  setShowNewCategoryInput(true);
                  setCategory("");
                }}
                className={styles.newCategoryBtn}
                disabled={loading}
              >
                + New
              </button>
            </div>
          ) : (
            <div className={styles.categoryRow}>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter new category name"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => {
                  setShowNewCategoryInput(false);
                  setNewCategory("");
                }}
                className={styles.cancelCategoryBtn}
                disabled={loading}
              >
                ✕
              </button>
            </div>
          )}
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
