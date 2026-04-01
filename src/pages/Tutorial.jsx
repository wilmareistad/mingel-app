import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../styles/Tutorial.module.css";
import checkIcon from "../assets/check-fill.svg";
import statsIcon from "../assets/stats-chart.svg";
import { useTutorialVisited } from "../hooks/useTutorialVisited";

export default function Tutorial() {
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();
  const { setTutorialVisited } = useTutorialVisited();

  const handleNext = () => {
    if (currentPage === 2) {
      setTutorialVisited();
      navigate("/");
    } else {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleDotClick = (pageIndex) => {
    setCurrentPage(pageIndex);
  };

  const handleSkip = () => {
    setTutorialVisited();
    navigate("/");
  };

  return (
    <div className={styles.tutorialContainer}>
      {currentPage === 0 && (
        <div className={`${styles.tutorialPage} ${styles.tutorialPage1}`}>
          <h1>Welcome <br /> to PULSE</h1>
          <h2>A question will appear on the screen:</h2>
          <p>Statement:</p>
          <p className={styles.tutorialStatement}>Remote work is good</p>

          <div className={styles.tutorialFooter}>
            <div className={styles.tutorialDots}>
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={`${styles.tutorialDot} ${currentPage === index ? styles.active : ""}`}
                  onClick={() => handleDotClick(index)}
                ></span>
              ))}
            </div>
            <button className={styles.tutorialNext} onClick={handleNext}>Next</button>
            <button className={styles.tutorialSkip} onClick={handleSkip}>Skip tutorial</button>
          </div>
        </div>
      )}

      {currentPage === 1 && (
        <div className={`${styles.tutorialPage} ${styles.tutorialPage2}`}>
          <img src={checkIcon} alt="Vote anonymously" />
          <h2>Vote anonymously</h2>
          <p>Respond to statements with Agree or Disagree. Your vote is completely anonymous.</p>

          <div className={styles.tutorialFooter}>
            <div className={styles.tutorialDots}>
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={`${styles.tutorialDot} ${currentPage === index ? styles.active : ""}`}
                  onClick={() => handleDotClick(index)}
                ></span>
              ))}
            </div>

            <div className={styles.tutorialNavButtons}>
              <button className={styles.tutorialPrev} onClick={handlePrevious}>Previous</button>
              <button className={styles.tutorialNext} onClick={handleNext}>Next</button>
            </div>
            <button className={styles.tutorialSkip} onClick={handleSkip}>Skip tutorial</button>
          </div>
        </div>
      )}

      {currentPage === 2 && (
        <div className={`${styles.tutorialPage} ${styles.tutorialPage3}`}>
          <img src={statsIcon} alt="See results" />
          <h2>See Results</h2>
          <p>View real-time aggregated results after each round. No individual data is shown.</p>

          <div className={styles.tutorialFooter}>
            <div className={styles.tutorialDots}>
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={`${styles.tutorialDot} ${currentPage === index ? styles.active : ""}`}
                  onClick={() => handleDotClick(index)}
                ></span>
              ))}
            </div>

            <div className={styles.tutorialNavButtons}>
              <button className={styles.tutorialPrev} onClick={handlePrevious}>Previous</button>
              <button className={styles.tutorialNext} onClick={handleNext}>Next</button>
            </div>
            <button className={styles.tutorialSkip} onClick={handleSkip}>Skip tutorial</button>
          </div>
        </div>
      )}
    </div>
  );
}