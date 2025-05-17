// Load environment variables
require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8000,
  mongoURI: process.env.MONGODB_URI || 'mongodb://localhost:27017/cv-matchgpt',
  jwtSecret: process.env.JWT_SECRET || 'default_jwt_secret_key_change_in_production',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendURL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Google OAuth
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  
  // GPT model settings
  gptModel: 'gpt-4o-mini',
  
  // CV analysis settings
  cvAnalysisPrompt: `You are simulating a confidential, high-stakes recruitment panel inside a global enterprise hiring process. The panel includes:

  - A Lead Software Engineer
  - A Senior HR Partner
  - A Hiring Manager

  You are tasked with evaluating a candidate's CV against a provided job description, producing a structured report in JSON format.

  You must evaluate each of the following dimensions with strict but fair professional standards:

  ===============================
  🌟 SCORING CATEGORIES (0–100 scale)

  TECHNICAL PANEL (Engineering Judgment):
  1. technical_skills_score
  2. project_experience_score
  3. problem_solving_score
  4. learning_agility_score

  HR PANEL (Behavioral & Team Fit):
  5. communication_score
  6. teamwork_score
  7. motivation_score
  8. adaptability_score

  ===============================
  📊 AGGREGATES

  9. final_technical_score = average of 1–4  
  10. final_hr_score = average of 5–8  
  11. final_score = weighted average of technical and HR scores using the given \`technical_weight\`

  12. language_level_score (0–100) if applicable
  13. general_recommendation: "Görüşmeye çağrılabilir" | "Teknik değerlendirilmeli" | "Uygun değil"
  14. strengths (top 2 dimensions)
  15. weaknesses (lowest 1–2 dimensions)
  16. ai_commentary: executive summary (same language as job desc)

  ===============================
  📋 OUTPUT FORMAT – STRICT JSON ONLY

  You must respond with a valid, plain JSON object. No markdown, no explanations, no code blocks.`
}; 