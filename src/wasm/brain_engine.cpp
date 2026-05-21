#include <emscripten/bind.h>
#include <emscripten/emscripten.h>
#include <vector>
#include <string>
#include <map>
#include <cmath>
#include <algorithm>
#include <numeric>

using namespace std;

// ============================================
// MODULE 1: REACTION TIME ANALYZER
// ============================================

class ReactionAnalyzer {
private:
  struct ClickEvent {
    double timestamp;
    bool isCorrect;
    int colorShown;
  };

  vector<ClickEvent> clicks;
  double stimulusStartTime = 0;

public:
  void recordClick(double timestamp, bool isCorrect, int colorShown) {
    clicks.push_back({ timestamp, isCorrect, colorShown });
  }

  void setStimulusTime(double t) {
    stimulusStartTime = t;
  }

  // Reaction type classify karo
  string classifyReactionType(double reactionTime) {
    if (reactionTime < 200) return "Impulsive";
    if (reactionTime < 400) return "Optimal";
    if (reactionTime < 700) return "Deliberate";
    return "Slow";
  }

  // False start detect karo
  bool detectFalseStart(double clickTime, double stimulusTime) {
    return clickTime < stimulusTime;
  }

  // Fatigue index: last 5 vs first 5 reactions
  float calculateFatigueIndex() {
    if (clicks.size() < 10) return 0.0f;

    vector<double> times;
    for (size_t i = 1; i < clicks.size(); i++) {
      times.push_back(clicks[i].timestamp - clicks[i - 1].timestamp);
    }

    int n = times.size();
    float first5Avg = 0, last5Avg = 0;
    int count = min(5, n);

    for (int i = 0; i < count; i++) first5Avg += times[i];
    for (int i = n - count; i < n; i++) last5Avg += times[i];

    first5Avg /= count;
    last5Avg /= count;

    if (first5Avg == 0) return 0.0f;
    float fatigue = (last5Avg - first5Avg) / first5Avg;
    return max(0.0f, min(1.0f, fatigue));
  }

  // Consistency score: standard deviation based
  float calculateConsistencyScore() {
    if (clicks.size() < 3) return 0.5f;

    vector<double> times;
    for (size_t i = 1; i < clicks.size(); i++) {
      times.push_back(clicks[i].timestamp - clicks[i - 1].timestamp);
    }

    double mean = 0;
    for (double t : times) mean += t;
    mean /= times.size();

    double variance = 0;
    for (double t : times) variance += (t - mean) * (t - mean);
    variance /= times.size();

    double sd = sqrt(variance);
    // SD 0 = perfect consistency = 1.0, SD 300ms+ = 0.0
    float score = 1.0f - min(1.0f, (float)(sd / 300.0));
    return max(0.0f, score);
  }

  // Average reaction time
  float getAverageReactionTime() {
    if (clicks.size() < 2) return 300.0f;
    vector<double> times;
    for (size_t i = 1; i < clicks.size(); i++) {
      times.push_back(clicks[i].timestamp - clicks[i - 1].timestamp);
    }
    double sum = 0;
    for (double t : times) sum += t;
    return (float)(sum / times.size());
  }

  int getClickCount() { return (int)clicks.size(); }

  void reset() { clicks.clear(); stimulusStartTime = 0; }
};

// ============================================
// MODULE 2: MEMORY TRACKING ENGINE
// ============================================

class MemoryTracker {
private:
  struct FlipEvent {
    int cardId;
    double timestamp;
  };

  struct PairAttempt {
    int card1, card2;
    bool success;
    double timeTaken;
    int attemptNumber;
  };

  vector<FlipEvent> flips;
  vector<PairAttempt> attempts;
  int totalPairs = 0;
  int firstTryMatches = 0;

public:
  void setTotalPairs(int pairs) { totalPairs = pairs; }

  void recordCardFlip(int cardId, double timestamp) {
    flips.push_back({ cardId, timestamp });
  }

  void recordPairAttempt(int card1, int card2, bool success, double time) {
    attempts.push_back({ card1, card2, success, time, (int)attempts.size() + 1 });
    if (success && attempts.size() <= (size_t)totalPairs) {
      firstTryMatches++;
    }
  }

  // Encoding speed: average time per successful match
  float calculateEncodingSpeed() {
    if (attempts.empty()) return 5.0f;
    double total = 0;
    int count = 0;
    for (auto& a : attempts) {
      if (a.success) { total += a.timeTaken; count++; }
    }
    if (count == 0) return 5.0f;
    return (float)(total / count / 1000.0); // seconds
  }

  // Retrieval accuracy: first try matches / total pairs
  float calculateRetrievalAccuracy() {
    if (totalPairs == 0) return 0.0f;
    return min(1.0f, (float)firstTryMatches / totalPairs);
  }

  // Memory strategy detection based on position patterns
  string detectMemoryStrategy() {
    // Agar flips sequential hain → position based
    // Agar random order → symbol based
    if (flips.size() < 4) return "Undetermined";

    int sequentialCount = 0;
    for (size_t i = 1; i < flips.size(); i++) {
      if (abs(flips[i].cardId - flips[i-1].cardId) <= 2) sequentialCount++;
    }

    float seqRatio = (float)sequentialCount / (flips.size() - 1);
    if (seqRatio > 0.6f) return "Spatial Memory";
    return "Visual Memory";
  }

  // Working memory span estimate
  int estimateWorkingMemorySpan() {
    if (attempts.empty()) return 4;
    // First-try success rate se estimate karo
    float accuracy = calculateRetrievalAccuracy();
    if (accuracy > 0.85f) return 8;
    if (accuracy > 0.70f) return 7;
    if (accuracy > 0.55f) return 6;
    if (accuracy > 0.40f) return 5;
    return 4;
  }

  int getSuccessfulPairs() {
    int count = 0;
    for (auto& a : attempts) if (a.success) count++;
    return count;
  }

  void reset() {
    flips.clear();
    attempts.clear();
    firstTryMatches = 0;
  }
};

// ============================================
// MODULE 3: PATTERN RECOGNITION ENGINE
// ============================================

class PatternEngine {
private:
  struct PatternAttempt {
    int patternId;
    double solveTime;
    bool correct;
    int attemptNumber;
  };

  vector<PatternAttempt> attempts;
  map<string, int> errorCategories;

public:
  void recordPatternAttempt(int patternId, double solveTime, bool correct) {
    attempts.push_back({ patternId, solveTime, correct, (int)attempts.size() + 1 });
  }

  // Rule discovery: kitne attempts mein 3 consecutive correct
  int detectRuleDiscoveryPoint() {
    int consecutive = 0;
    for (size_t i = 0; i < attempts.size(); i++) {
      if (attempts[i].correct) {
        consecutive++;
        if (consecutive >= 3) return (int)i - 1;
      } else {
        consecutive = 0;
      }
    }
    return (int)attempts.size();
  }

  // Thinking style classify karo
  string classifyThinkingStyle() {
    if (attempts.empty()) return "Undetermined";

    double avgTime = 0;
    int correct = 0;
    for (auto& a : attempts) {
      avgTime += a.solveTime;
      if (a.correct) correct++;
    }
    avgTime /= attempts.size();
    float accuracy = (float)correct / attempts.size();

    if (avgTime < 3000 && accuracy > 0.7f) return "Intuitive Thinker";
    if (avgTime > 5000 && accuracy > 0.7f) return "Analytical Thinker";
    if (avgTime < 3000 && accuracy < 0.5f) return "Impulsive Thinker";
    return "Balanced Thinker";
  }

  // Error pattern analysis
  map<string, int> analyzeErrorPatterns() {
    map<string, int> patterns;
    for (auto& a : attempts) {
      if (!a.correct) {
        if (a.solveTime < 1000) patterns["Impulsive Error"]++;
        else if (a.solveTime > 8000) patterns["Overthinking Error"]++;
        else patterns["Conceptual Error"]++;
      }
    }
    return patterns;
  }

  float getPatternAccuracy() {
    if (attempts.empty()) return 0.0f;
    int correct = 0;
    for (auto& a : attempts) if (a.correct) correct++;
    return (float)correct / attempts.size();
  }

  float getAveragePatternSolveTime() {
    if (attempts.empty()) return 5000.0f;
    double total = 0;
    for (auto& a : attempts) total += a.solveTime;
    return (float)(total / attempts.size());
  }

  void reset() { attempts.clear(); errorCategories.clear(); }
};

// ============================================
// MODULE 4: MENTAL AGE PREDICTOR
// ============================================

class MentalAgePredictor {
public:
  struct CognitiveProfile {
    float reactionSpeed;        // ms (lower = better)
    float reactionConsistency;  // 0-1
    float memoryAccuracy;       // 0-1
    float memoryCapacity;       // items (4-9)
    float patternSpeed;         // ms (lower = better)
    float patternAccuracy;      // 0-1
    float focusLevel;           // 0-1
    float fatigueIndex;         // 0-1 (lower = better)
    float impulsivityScore;     // 0-1
    float processingSpeed;      // composite 0-1
  };

private:
  // Normative data — research based averages
  struct NormativeData {
    int minAge, maxAge;
    float reactionTime;   // ms
    float memorySpan;     // items
    float patternSpeed;   // ms
  };

  vector<NormativeData> norms = {
    { 10, 12, 350, 5.0f, 6000 },
    { 13, 17, 290, 6.0f, 4500 },
    { 18, 25, 250, 7.0f, 3000 },
    { 26, 35, 270, 7.0f, 3200 },
    { 36, 50, 310, 6.0f, 4000 },
    { 51, 99, 380, 5.0f, 5500 }
  };

public:
  int predictMentalAge(CognitiveProfile profile) {
    float bestScore = 1e9f;
    int predictedAge = 25;

    for (auto& norm : norms) {
      // Reaction time similarity
      float rtDiff = abs(profile.reactionSpeed - norm.reactionTime) / norm.reactionTime;
      // Memory similarity
      float memDiff = abs(profile.memoryCapacity - norm.memorySpan) / norm.memorySpan;
      // Pattern speed similarity
      float patDiff = abs(profile.patternSpeed - norm.patternSpeed) / norm.patternSpeed;

      // Weighted composite difference
      float score = rtDiff * 0.30f + memDiff * 0.35f + patDiff * 0.20f
                  + (1.0f - profile.reactionConsistency) * 0.15f;

      if (score < bestScore) {
        bestScore = score;
        predictedAge = (norm.minAge + norm.maxAge) / 2;
      }
    }

    return predictedAge;
  }

  // Confidence: kitne games khele
  float calculatePredictionConfidence(int gamesPlayed) {
    if (gamesPlayed >= 5) return 0.9f;
    if (gamesPlayed >= 3) return 0.65f;
    if (gamesPlayed >= 1) return 0.35f;
    return 0.1f;
  }

  // Percentile se performance classify karo
  string classifyPerformance(float percentile) {
    if (percentile >= 95) return "Exceptional";
    if (percentile >= 75) return "Above Average";
    if (percentile >= 25) return "Average";
    return "Below Average";
  }

  // Cognitive personality infer karo
  string inferCognitivePersonality(CognitiveProfile profile) {
    bool highSpeed    = profile.reactionSpeed < 270;
    bool highAccuracy = profile.memoryAccuracy > 0.75f;
    bool lowImpulsive = profile.impulsivityScore < 0.3f;
    bool highFatigue  = profile.fatigueIndex > 0.5f;
    bool fastPattern  = profile.patternSpeed < 3000;

    if (profile.impulsivityScore > 0.6f && highSpeed) return "Risk Taker";
    if (lowImpulsive && highAccuracy) return "Perfectionist";
    if (highFatigue < 0.2f && profile.focusLevel > 0.8f) return "Endurance Thinker";
    if (fastPattern && profile.patternAccuracy > 0.7f) return "Intuitive Thinker";
    if (highAccuracy && lowImpulsive) return "Analytical Mind";
    return "Balanced Thinker";
  }

  // Composite processing speed score (0-100)
  float calculateProcessingSpeed(float reactionMs, float patternMs) {
    // Reaction: 200ms = 100, 500ms = 0
    float rtScore = max(0.0f, min(100.0f, (500.0f - reactionMs) / 3.0f));
    // Pattern: 2000ms = 100, 8000ms = 0
    float patScore = max(0.0f, min(100.0f, (8000.0f - patternMs) / 60.0f));
    return rtScore * 0.6f + patScore * 0.4f;
  }
};

// ============================================
// MODULE 5: ADAPTIVE DIFFICULTY ENGINE
// ============================================

class AdaptiveDifficulty {
public:
  enum UserType {
    CHILD = 0,
    BEGINNER = 1,
    AVERAGE = 2,
    ADVANCED = 3,
    GENIUS = 4,
    DISTRACTED = 5,
    RECOVERING = 6
  };

  struct DifficultyParams {
    int gridSize;           // memory game (4,6,8,10)
    float timeLimit;        // math sprint seconds
    int nBackLevel;         // n-back (1-5)
    float stimulusSpeed;    // reaction ms between stimuli
    int patternComplexity;  // 1-5
  };

  UserType classifyUser(
    float reactionTime,
    float memoryAccuracy,
    float consistency,
    float fatigueIndex,
    int gamesPlayed
  ) {
    if (gamesPlayed < 2) return BEGINNER;
    if (fatigueIndex > 0.6f) return DISTRACTED;
    if (reactionTime > 450 && memoryAccuracy < 0.5f) return CHILD;

    float composite = (1.0f - reactionTime/500.0f) * 0.35f
                    + memoryAccuracy * 0.35f
                    + consistency * 0.30f;

    if (composite > 0.85f) return GENIUS;
    if (composite > 0.65f) return ADVANCED;
    if (composite > 0.40f) return AVERAGE;
    return BEGINNER;
  }

  DifficultyParams calculateNextDifficulty(
    int userType,
    int currentLevel,
    float recentAccuracy,
    float recentSpeed
  ) {
    DifficultyParams params;

    // Base values
    params.gridSize = 4;
    params.timeLimit = 60.0f;
    params.nBackLevel = 1;
    params.stimulusSpeed = 1500.0f;
    params.patternComplexity = 1;

    switch (userType) {
      case CHILD:
        params.gridSize = 4;
        params.timeLimit = 90.0f;
        params.nBackLevel = 1;
        params.stimulusSpeed = 2000.0f;
        params.patternComplexity = 1;
        break;
      case BEGINNER:
        params.gridSize = 4;
        params.timeLimit = 60.0f;
        params.nBackLevel = 1;
        params.stimulusSpeed = 1500.0f;
        params.patternComplexity = 2;
        break;
      case AVERAGE:
        params.gridSize = 6;
        params.timeLimit = 45.0f;
        params.nBackLevel = 2;
        params.stimulusSpeed = 1200.0f;
        params.patternComplexity = 3;
        break;
      case ADVANCED:
        params.gridSize = 8;
        params.timeLimit = 30.0f;
        params.nBackLevel = 3;
        params.stimulusSpeed = 900.0f;
        params.patternComplexity = 4;
        break;
      case GENIUS:
        params.gridSize = 10;
        params.timeLimit = 20.0f;
        params.nBackLevel = 5;
        params.stimulusSpeed = 600.0f;
        params.patternComplexity = 5;
        break;
      case DISTRACTED:
        params.gridSize = 4;
        params.timeLimit = 90.0f;
        params.nBackLevel = 1;
        params.stimulusSpeed = 2000.0f;
        params.patternComplexity = 1;
        break;
      case RECOVERING:
        // Current level se ek neeche
        params.gridSize = max(4, (currentLevel * 2) - 2);
        params.timeLimit = 50.0f;
        params.nBackLevel = max(1, currentLevel - 1);
        params.stimulusSpeed = 1300.0f;
        params.patternComplexity = max(1, currentLevel - 1);
        break;
    }

    // Flow state fine-tuning
    if (recentAccuracy > 0.85f && userType != GENIUS) {
      params.gridSize = min(10, params.gridSize + 2);
      params.stimulusSpeed = max(500.0f, params.stimulusSpeed - 200.0f);
    } else if (recentAccuracy < 0.40f && userType != CHILD) {
      params.gridSize = max(4, params.gridSize - 2);
      params.stimulusSpeed = min(2000.0f, params.stimulusSpeed + 300.0f);
    }

    return params;
  }

  bool isInFlowState(float accuracy, float speed, float consistency) {
    return accuracy >= 0.40f && accuracy <= 0.85f && consistency > 0.5f;
  }

  // DifficultyParams getters for JS binding
  int getDifficultyGridSize(DifficultyParams p) { return p.gridSize; }
  float getDifficultyTimeLimit(DifficultyParams p) { return p.timeLimit; }
  int getDifficultyNBackLevel(DifficultyParams p) { return p.nBackLevel; }
  float getDifficultyStimSpeed(DifficultyParams p) { return p.stimulusSpeed; }
  int getDifficultyPatternComplexity(DifficultyParams p) { return p.patternComplexity; }
};

// ============================================
// MODULE 6: SCORING ENGINE
// ============================================

class ScoringEngine {
private:
  map<string, vector<float>> scoreHistory; // gameName → scores

public:
  // Weighted composite score
  float calculateWeightedScore(
    float rawScore,
    float speedBonus,
    float consistencyBonus,
    float difficultyMultiplier
  ) {
    float base = rawScore * difficultyMultiplier;
    float bonus = base * (speedBonus * 0.20f + consistencyBonus * 0.15f);
    return base + bonus;
  }

  // XP formula — non linear
  int calculateXP(float score, int streak, float difficulty, bool isPerfect) {
    float base = score;

    // Streak bonus
    float streakMult = 1.0f + min(0.5f, streak * 0.05f);

    // Difficulty multiplier (1x to 3x)
    float diffMult = 1.0f + min(2.0f, difficulty * 2.0f);

    // Perfect game bonus
    float perfectMult = isPerfect ? 5.0f : 1.0f;

    int xp = (int)(base * streakMult * diffMult * perfectMult);
    return max(1, xp);
  }

  // Score register karo for percentile tracking
  void registerScore(const string& gameName, float score) {
    scoreHistory[gameName].push_back(score);
  }

  // Percentile calculate karo
  float calculatePercentile(float score, const string& gameName) {
    // Simulated percentile agar history nahi hai
    // 0-100 score assume karke normal distribution
    // Mean = 50, SD = 15 (brain game typical)
    float mean = 50.0f, sd = 15.0f;
    float z = (score - mean) / sd;

    // Cumulative normal distribution approximate
    float t = 1.0f / (1.0f + 0.2316419f * abs(z));
    float poly = t * (0.319381530f + t * (-0.356563782f
               + t * (1.781477937f + t * (-1.821255978f
               + t * 1.330274429f))));
    float cdf = 1.0f - 0.3989422804f * exp(-z * z / 2.0f) * poly;
    if (z < 0) cdf = 1.0f - cdf;
    return cdf * 100.0f;
  }

  // Growth index: current week vs last week
  float calculateGrowthIndex(
    const vector<float>& recentScores,
    const vector<float>& prevScores
  ) {
    if (recentScores.empty() || prevScores.empty()) return 0.0f;

    float recentAvg = 0, prevAvg = 0;
    for (float s : recentScores) recentAvg += s;
    for (float s : prevScores) prevAvg += s;
    recentAvg /= recentScores.size();
    prevAvg /= prevScores.size();

    if (prevAvg == 0) return 0.0f;
    return ((recentAvg - prevAvg) / prevAvg) * 100.0f; // percentage change
  }
};

// ============================================
// MASTER BRAIN ENGINE — React se yahi use hoga
// ============================================

class BrainEngine {
public:
  ReactionAnalyzer reactionAnalyzer;
  MemoryTracker memoryTracker;
  PatternEngine patternEngine;
  MentalAgePredictor predictor;
  AdaptiveDifficulty adaptive;
  ScoringEngine scorer;

  int gamesPlayed = 0;

  // Game events record karo
  void recordReactionClick(double timestamp, bool isCorrect, int colorShown) {
    reactionAnalyzer.recordClick(timestamp, isCorrect, colorShown);
  }

  void recordMemoryFlip(int cardId, double timestamp) {
    memoryTracker.recordCardFlip(cardId, timestamp);
  }

  void recordMemoryAttempt(int card1, int card2, bool success, double time) {
    memoryTracker.recordPairAttempt(card1, card2, success, time);
  }

  void recordPattern(int patternId, double solveTime, bool correct) {
    patternEngine.recordPatternAttempt(patternId, solveTime, correct);
  }

  void incrementGamesPlayed() { gamesPlayed++; }

  // Full analysis JSON string return karo
  string getBrainAnalysis() {
    float reactionTime = reactionAnalyzer.getAverageReactionTime();
    float consistency  = reactionAnalyzer.calculateConsistencyScore();
    float fatigue      = reactionAnalyzer.calculateFatigueIndex();
    float memAccuracy  = memoryTracker.calculateRetrievalAccuracy();
    float memCapacity  = (float)memoryTracker.estimateWorkingMemorySpan();
    float patAccuracy  = patternEngine.getPatternAccuracy();
    float patSpeed     = patternEngine.getAveragePatternSolveTime();
    string memStrategy = memoryTracker.detectMemoryStrategy();
    string thinkStyle  = patternEngine.classifyThinkingStyle();

    // Impulsivity: reaction time < 200ms clicks / total
    float impulsivity = 0.3f; // default
    if (reactionAnalyzer.getClickCount() > 0) {
      impulsivity = reactionTime < 250 ? 0.6f : 0.2f;
    }

    float focusLevel = max(0.0f, min(1.0f,
      consistency * 0.5f + (1.0f - fatigue) * 0.5f));

    float processingSpeed = predictor.calculateProcessingSpeed(reactionTime, patSpeed);

    MentalAgePredictor::CognitiveProfile profile;
    profile.reactionSpeed        = reactionTime;
    profile.reactionConsistency  = consistency;
    profile.memoryAccuracy       = memAccuracy;
    profile.memoryCapacity       = memCapacity;
    profile.patternSpeed         = patSpeed;
    profile.patternAccuracy      = patAccuracy;
    profile.focusLevel           = focusLevel;
    profile.fatigueIndex         = fatigue;
    profile.impulsivityScore     = impulsivity;
    profile.processingSpeed      = processingSpeed / 100.0f;

    int mentalAge          = predictor.predictMentalAge(profile);
    float confidence       = predictor.calculatePredictionConfidence(gamesPlayed);
    string personality     = predictor.inferCognitivePersonality(profile);
    string perfClass       = predictor.classifyPerformance(processingSpeed);
    string reactionType    = reactionAnalyzer.classifyReactionType(reactionTime);

    int userTypeInt = (int)adaptive.classifyUser(
      reactionTime, memAccuracy, consistency, fatigue, gamesPlayed);

    float percentile = scorer.calculatePercentile(processingSpeed, "composite");

    // JSON string build karo (no external lib needed)
    string json = "{";
    json += "\"mentalAge\":" + to_string(mentalAge) + ",";
    json += "\"mentalAgeConfidence\":" + to_string(confidence) + ",";
    json += "\"cognitivePersonality\":\"" + personality + "\",";
    json += "\"performanceClass\":\"" + perfClass + "\",";
    json += "\"reactionTime\":" + to_string((int)reactionTime) + ",";
    json += "\"reactionType\":\"" + reactionType + "\",";
    json += "\"memoryAccuracy\":" + to_string(memAccuracy) + ",";
    json += "\"memoryCapacity\":" + to_string((int)memCapacity) + ",";
    json += "\"memoryStrategy\":\"" + memStrategy + "\",";
    json += "\"thinkingStyle\":\"" + thinkStyle + "\",";
    json += "\"focusLevel\":" + to_string(focusLevel) + ",";
    json += "\"fatigueIndex\":" + to_string(fatigue) + ",";
    json += "\"consistency\":" + to_string(consistency) + ",";
    json += "\"processingSpeed\":" + to_string(processingSpeed) + ",";
    json += "\"percentile\":" + to_string(percentile) + ",";
    json += "\"userType\":" + to_string(userTypeInt) + ",";
    json += "\"gamesPlayed\":" + to_string(gamesPlayed);
    json += "}";

    return json;
  }

  // Adaptive difficulty JSON return karo
  string getAdaptiveDifficulty(float recentAccuracy, float recentSpeed) {
    float reactionTime = reactionAnalyzer.getAverageReactionTime();
    float consistency  = reactionAnalyzer.calculateConsistencyScore();
    float fatigue      = reactionAnalyzer.calculateFatigueIndex();
    float memAccuracy  = memoryTracker.calculateRetrievalAccuracy();

    int userType = (int)adaptive.classifyUser(
      reactionTime, memAccuracy, consistency, fatigue, gamesPlayed);

    AdaptiveDifficulty::DifficultyParams p = adaptive.calculateNextDifficulty(
      userType, gamesPlayed, recentAccuracy, recentSpeed);

    string json = "{";
    json += "\"gridSize\":" + to_string(p.gridSize) + ",";
    json += "\"timeLimit\":" + to_string(p.timeLimit) + ",";
    json += "\"nBackLevel\":" + to_string(p.nBackLevel) + ",";
    json += "\"stimulusSpeed\":" + to_string(p.stimulusSpeed) + ",";
    json += "\"patternComplexity\":" + to_string(p.patternComplexity) + ",";
    json += "\"userType\":" + to_string(userType);
    json += "}";
    return json;
  }

  // Weighted score calculate karo
  float getFinalScore(float rawScore, int streak, float difficulty, bool isPerfect) {
    float speedBonus = max(0.0f, 1.0f - reactionAnalyzer.getAverageReactionTime() / 500.0f);
    float consBonus  = reactionAnalyzer.calculateConsistencyScore();
    float weighted   = scorer.calculateWeightedScore(rawScore, speedBonus, consBonus, difficulty);
    return weighted;
  }

  int getXP(float score, int streak, float difficulty, bool isPerfect) {
    return scorer.calculateXP(score, streak, difficulty, isPerfect);
  }

  // Session reset
  void resetSession() {
    reactionAnalyzer.reset();
    memoryTracker.reset();
    patternEngine.reset();
  }
};

// ============================================
// EMSCRIPTEN JS BINDINGS
// ============================================

EMSCRIPTEN_BINDINGS(brain_engine) {
  emscripten::class_<BrainEngine>("BrainEngine")
    .constructor()
    .function("recordReactionClick",    &BrainEngine::recordReactionClick)
    .function("recordMemoryFlip",       &BrainEngine::recordMemoryFlip)
    .function("recordMemoryAttempt",    &BrainEngine::recordMemoryAttempt)
    .function("recordPattern",          &BrainEngine::recordPattern)
    .function("incrementGamesPlayed",   &BrainEngine::incrementGamesPlayed)
    .function("getBrainAnalysis",       &BrainEngine::getBrainAnalysis)
    .function("getAdaptiveDifficulty",  &BrainEngine::getAdaptiveDifficulty)
    .function("getFinalScore",          &BrainEngine::getFinalScore)
    .function("getXP",                  &BrainEngine::getXP)
    .function("resetSession",           &BrainEngine::resetSession);
}