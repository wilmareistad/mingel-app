import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Tutorial.css";
import checkIcon from "../assets/check-fill.svg";
import statsIcon from "../assets/stats-chart.svg";

export default function Tutorial() {
    const [currentPage, setCurrentPage] = useState(0);
    const navigate = useNavigate();

    const handleNext = () => {
        if (currentPage === 2) {
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
        navigate("/");
    };

    return (
        <div>
            <div className="tutorial_dots">
                {[0, 1, 2].map((index) => (
                    <span
                        key={index}
                        className={`tutorial_dot ${currentPage === index ? "active" : ""}`}
                        onClick={() => handleDotClick(index)}
                    ></span>
                ))}
            </div>

            {currentPage === 0 && (
                <div className="tutorial_page_1">
                    <h1>Welcome to PULSE</h1>
                    <h2>A question will appear on the screen:</h2>
                    <p>Statement:</p>
                    <p className="tutorial_statement">Remote work is good</p>
                    <button className="tutorial_next" onClick={handleNext}>NEXT</button>
                    <button className="tutorial_skip" onClick={handleSkip}>Skip tutorial</button>
                </div>
            )}

            {currentPage === 1 && (
                <div className="tutorial_page_2">
                    <img src={checkIcon} alt="Vote anonymously"></img>
                    <h2>Vote anonymously</h2>
                    <p>Respond to statements with Agree or Disagree. Your vote is completely anonymous.</p>
                    <div>
                        <button className="tutorial_prev" onClick={handlePrevious}>Previous</button>
                        <button className="tutorial_next" onClick={handleNext}>Next</button>
                    </div>
                    <button className="tutorial_skip" onClick={handleSkip}>Skip tutorial</button>
                </div>
            )}

            {currentPage === 2 && (
                <div className="tutorial_page_3">
                    <img src={statsIcon} alt="See results"></img>
                    <h2>See results</h2>
                    <p>View real-time aggregated results after each round. No individual data is shown.</p>
                    <div>
                        <button className="tutorial_prev" onClick={handlePrevious}>Previous</button>
                        <button className="tutorial_next" onClick={handleNext}>Next</button>
                    </div>
                    <button className="tutorial_skip" onClick={handleSkip}>Skip tutorial</button>
                </div>
            )}
        </div>
    )
}