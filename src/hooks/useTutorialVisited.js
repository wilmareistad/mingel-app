export const useTutorialVisited = () => {
  const checkTutorialVisited = () => {
    return document.cookie.includes("tutorialVisited=true");
  };

  const setTutorialVisited = () => {
    // Set cookie to expire in 1 year
    const date = new Date();
    date.setTime(date.getTime() + 365 * 24 * 60 * 60 * 1000);
    document.cookie = `tutorialVisited=true;expires=${date.toUTCString()};path=/`;
  };

  return { checkTutorialVisited, setTutorialVisited };
};
