import React, { useState, useEffect, useRef } from 'react';
import { Timer, Brain, Award, Flame } from 'lucide-react';
import { generateQuestion, UserPerformanceTracker } from '../services/AIService';

const MathGame = () => {
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(100); // Start with 100 points
  const [timeLeft, setTimeLeft] = useState(30);
  const [isActive, setIsActive] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [streak, setStreak] = useState(0);
  const [lastScore, setLastScore] = useState(null);
  const [level, setLevel] = useState(1);

  const performanceTracker = useRef(new UserPerformanceTracker());
  const startTime = useRef(null);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      clearInterval(interval);
      handleTimeout();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const startNewQuestion = async () => {
    try {
      const questionData = await generateQuestion(performanceTracker.current);
      
      if (!questionData) {
        throw new Error('Failed to generate question');
      }

      setCurrentQuestion(questionData);
      setUserAnswer('');
      setTimeLeft(questionData.recommended_time || 30);
      setIsActive(true);
      setFeedback('');
      startTime.current = Date.now();
      setLevel(performanceTracker.current.currentLevel);
    } catch (error) {
      console.error('Error starting new question:', error);
      setFeedback('Error generating question. Please try again.');
    }
  };

  const normalizeAnswer = (answer) => {
    return String(answer).trim().replace(/\s+/g, '');
  };

  const handleTimeout = () => {
    if (!currentQuestion) return;

    setIsActive(false);
    const timeSpent = (Date.now() - startTime.current) / 1000;
    
    // Get score before update
    const previousScore = performanceTracker.current.getPerformanceData().score;
    
    performanceTracker.current.addAttempt(
      currentQuestion.question,
      false,
      timeSpent
    );

    // Get new score and calculate change
    const newScore = performanceTracker.current.getPerformanceData().score;
    const scoreDiff = newScore - previousScore;
    
    setScore(newScore);
    setStreak(0);
    setFeedback(`Time's up! Answer: ${currentQuestion.answer}\n${scoreDiff !== 0 ? `${scoreDiff} points` : ''}`);

    if (scoreDiff !== 0) {
      setLastScore({
        value: scoreDiff,
        isPositive: false
      });
      setTimeout(() => setLastScore(null), 2000);
    }
  };

  const handleSubmit = () => {
    if (!currentQuestion) return;

    setIsActive(false);
    const timeSpent = (Date.now() - startTime.current) / 1000;
    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(currentQuestion.answer);
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

    // Get score before update
    const previousScore = performanceTracker.current.getPerformanceData().score;
    
    performanceTracker.current.addAttempt(
      currentQuestion.question,
      isCorrect,
      timeSpent
    );

    // Get new score and calculate change
    const newScore = performanceTracker.current.getPerformanceData().score;
    const scoreDiff = newScore - previousScore;
    const newLevel = performanceTracker.current.currentLevel;
    
    setScore(newScore);
    setLevel(newLevel);
    setStreak(performanceTracker.current.streakCount);

    if (isCorrect) {
      const speedRating = timeSpent < currentQuestion.recommended_time ? 'Fast!' : 'Good';
      setFeedback(
        `Correct! ${speedRating}\n` +
        `Time: ${timeSpent.toFixed(1)}s\n` +
        `${scoreDiff > 0 ? `+${scoreDiff} points` : ''}`
      );
    } else {
      setFeedback(
        `Incorrect. Answer: ${currentQuestion.answer}\n` +
        `${scoreDiff < 0 ? `${scoreDiff} points` : ''}`
      );
    }

    if (scoreDiff !== 0) {
      setLastScore({
        value: scoreDiff,
        isPositive: scoreDiff > 0
      });
      setTimeout(() => setLastScore(null), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6" />
            <h1 className="text-xl font-bold">AI Mental Math Challenge</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              <span className="text-lg font-semibold">{score}</span>
              {lastScore && (
                <span className={`text-sm animate-fade-out ${
                  lastScore.isPositive ? 'text-green-500' : 'text-red-500'
                }`}>
                  {lastScore.isPositive ? '+' : ''}{lastScore.value}
                </span>
              )}
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="text-sm">{streak}</span>
              </div>
            )}
          </div>
        </div>

        {/* Game Stats */}
        {currentQuestion && (
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-semibold">Level</div>
              <div>{level.toFixed(1)}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-semibold">Time Left</div>
              <div className="flex items-center gap-1">
                <Timer className="w-4 h-4" />
                <span>{timeLeft}s</span>
              </div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="font-semibold">Streak</div>
              <div>{streak}</div>
            </div>
          </div>
        )}

        {/* Question Display */}
        <div className="mb-6">
          {currentQuestion ? (
            <div className="text-3xl font-bold text-center py-6 bg-gray-50 rounded-lg">
              {currentQuestion.question}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Brain className="w-12 h-12 mx-auto mb-4 text-blue-500" />
              <div className="text-lg">Ready to challenge yourself?</div>
              <div className="text-sm text-gray-600">Start with 100 points!</div>
            </div>
          )}
        </div>

        {/* Answer Input */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Your answer"
              disabled={!isActive}
              className="flex-1 px-4 py-3 text-lg border rounded-lg text-center"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && isActive && userAnswer) {
                  handleSubmit();
                }
              }}
            />
            <button 
              onClick={handleSubmit}
              disabled={!isActive || !userAnswer}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors"
            >
              Submit
            </button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`p-4 rounded-lg ${
              feedback.includes('Correct') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {feedback.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}

          {/* Next Question Button */}
          <button 
            onClick={startNewQuestion}
            disabled={isActive}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg disabled:bg-gray-400 hover:bg-green-700 transition-colors"
          >
            {currentQuestion ? 'Next Question' : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MathGame;