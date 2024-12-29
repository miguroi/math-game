import OpenAI from "openai";

const DEEPSEEK_API_KEY = process.env.REACT_APP_DEEPSEEK_API_KEY;

const openai = new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: DEEPSEEK_API_KEY,
  dangerouslyAllowBrowser: true
});

class UserPerformanceTracker {
  constructor() {
    this.performanceHistory = [];
    this.currentLevel = 1;
    this.score = 100;
    this.usedQuestions = new Set();
    this.streakCount = 0;
    this.consecutiveFailures = 0;
    this.averageTime = 30;
  }

  addAttempt(question, correct, timeSpent) {
    this.usedQuestions.add(question);
    
    // Update performance history
    this.performanceHistory.push({
      question,
      correct,
      timeSpent,
      level: this.currentLevel,
      timestamp: Date.now()
    });

    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift();
    }

    // Update level based on performance
    if (correct) {
      // Reset failure counter on success
      this.consecutiveFailures = 0;
      this.streakCount++;

      // Gradually increase difficulty on success
      if (this.streakCount >= 2) {
        // Small increment for consistent success
        this.currentLevel = Math.min(5, this.currentLevel + 0.2);
      }

      // Calculate score bonus
      const speedBonus = Math.max(0, (this.averageTime - timeSpent) * 2);
      const difficultyBonus = this.currentLevel * 20;
      const streakBonus = Math.min(this.streakCount * 10, 50);
      
      this.score += Math.round(speedBonus + difficultyBonus + streakBonus);
    } else {
      // Reset streak and increment failure counter
      this.streakCount = 0;
      this.consecutiveFailures++;

      // Immediately decrease difficulty on failure
      if (this.consecutiveFailures >= 1) {
        // Larger decrease for consecutive failures
        const decrease = this.consecutiveFailures > 1 ? 0.5 : 0.3;
        this.currentLevel = Math.max(1, this.currentLevel - decrease);
      }

      // Penalize score based on current level
      const penalty = Math.round(25 * this.currentLevel);
      this.score = Math.max(0, this.score - penalty);
    }

    // Update average time with weighted average
    this.averageTime = this.averageTime * 0.7 + timeSpent * 0.3;
  }

  getPerformanceData() {
    return {
      history: this.performanceHistory,
      currentLevel: this.currentLevel,
      score: this.score,
      streak: this.streakCount,
      failures: this.consecutiveFailures,
      averageTime: this.averageTime,
      usedQuestions: Array.from(this.usedQuestions)
    };
  }

  // Helper method to get last N performance results
  getRecentPerformance(n = 5) {
    return this.performanceHistory.slice(-n);
  }
}

async function generateQuestion(userPerformance) {
  try {
    const performanceData = userPerformance.getPerformanceData();
    const level = performanceData.currentLevel;
    const recentFails = performanceData.failures;
    
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are an adaptive mathematics challenge generator.
          Current level: ${level.toFixed(1)}
          Recent failures: ${recentFails}

          Rules for question generation:
          1. If user has recent failures, generate slightly easier questions
          2. Gradually increase complexity as user succeeds
          3. Focus on building confidence after failures
          4. Ensure questions are engaging and varied
          
          Difficulty guidelines:
          Level 1: Simple calculations (e.g., 45×8, √144)
          Level 2: Two-step operations (e.g., 125×4+50)
          Level 3: Mixed operations (e.g., 234×6÷3)
          Level 4: Complex calculations (e.g., √3025+15×12)
          Level 5: Advanced problems (e.g., 1500÷25×16+√900)

          NEVER repeat these questions: ${JSON.stringify(performanceData.usedQuestions)}`
        },
        {
          role: "user",
          content: `Generate a level ${level} question.
          ${recentFails > 0 ? 'Make it slightly easier to help build confidence.' : ''}
          Recent performance: ${JSON.stringify(userPerformance.getRecentPerformance())}
          
          Return in this exact JSON format:
          {
            "question": "the math expression",
            "answer": "numerical answer only",
            "difficulty": ${level},
            "estimated_time": number (seconds),
            "operations": ["operations used"]
          }`
        }
      ],
      model: "deepseek-chat",
      temperature: 0.8
    });

    const questionData = JSON.parse(cleanJsonResponse(completion.choices[0].message.content));
    questionData.recommended_time = calculateRecommendedTime(questionData.difficulty, performanceData.averageTime);
    return questionData;

  } catch (error) {
    console.error('Error generating question:', error);
    throw error;
  }
}

function calculateRecommendedTime(difficulty, averageTime) {
  const baseTime = 20;
  const difficultyMultiplier = 1 + (difficulty - 1) * 0.3;
  const recommendedTime = Math.round(baseTime * difficultyMultiplier);
  
  // Adjust based on user's average solving time
  const adjustedTime = (recommendedTime + averageTime) / 2;
  
  // Ensure time stays within reasonable bounds
  return Math.max(15, Math.min(60, Math.round(adjustedTime)));
}

function cleanJsonResponse(response) {
  return response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

export { generateQuestion, UserPerformanceTracker };