
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGameStrategy = async (gameName: string, context: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `I am playing ${gameName}. My current situation is: ${context}. Give me a quick strategy tip in one or two short sentences.`,
      config: {
        systemInstruction: "You are a professional game strategist for mobile board and card games.",
      }
    });
    return response.text || "Keep your focus and watch the opponents!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Focus on the basics and play safe!";
  }
};

export const getChessCoachAdvice = async (boardFEN: string, turn: string, focus?: string) => {
  try {
    const prompt = focus 
      ? `Board State (FEN): ${boardFEN}. It is ${turn}'s turn. Focus specifically on: ${focus}. Give advanced GM-level advice.`
      : `Board State (FEN): ${boardFEN}. It is ${turn}'s turn. Analyze the position using Grandmaster principles. Identify any pins, forks, or hanging pieces. Suggest the best move and explain the tactical theme.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a World Chess Grandmaster and Coach. You explain complex tactics like 'breaking the pin', 'tempo', and 'positional play' in a way that helps users improve their ELO. Keep it professional and insightful.",
        thinkingConfig: { thinkingBudget: 8192 }
      }
    });
    return response.text || "Analyze the center and look for tactical opportunities.";
  } catch (error) {
    console.error("Chess Coach Error:", error);
    return "Check your defenses and look for forced moves.";
  }
};

export const getCheckmateProclamation = async (winner: string, fen: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Game Over. Winner: ${winner}. Final FEN: ${fen}. Proclaim the victory or defeat in a dramatic, grandmasterly way (max 3 sentences). Comment on the finality of the position.`,
      config: {
        systemInstruction: "You are an Elite Chess Commentator and Grandmaster. Your tone is respectful but epic, emphasizing the strategic brilliance of the killing blow.",
      }
    });
    return response.text || "Checkmate. The king has fallen, and the board is silent.";
  } catch (error) {
    return "Checkmate. An absolute and undeniable conclusion to this battle.";
  }
};

export const getAdvancedBotMove = async (boardFEN: string, botColor: string) => {
  // Increased timeout to 12 seconds for deeper reasoning
  const timeoutLimit = 12000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("AI_TIMEOUT")), timeoutLimit)
  );

  try {
    const aiPromise = ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Current FEN: ${boardFEN}\nYou are playing as ${botColor === 'black' ? 'Black (lowercase)' : 'White (uppercase)'}.\n\nTasks:\n1. Evaluate the position for captures, checks, and threats (CCT).\n2. Calculate the single best move in Standard Algebraic Notation.\n3. Provide the 'from' and 'to' squares in algebraic notation.\n4. Explain the tactical logic.\n\nReturn JSON: { "bestMove": "notation", "from": "e2", "to": "e4", "logic": "reasoning" }`,
      config: {
        systemInstruction: "You are a World-Class Chess Engine (2800+ ELO). You use deep tactical reasoning to find the most aggressive and strategic moves. You must always return valid JSON. Do not ignore threats. Calculate forcing lines.",
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 16384 } // High budget for chess calculation
      }
    });

    const response = (await Promise.race([aiPromise, timeoutPromise])) as any;
    const result = JSON.parse(response.text || "{}");
    return result;
  } catch (error) {
    console.error("Advanced Bot Error:", error.message);
    return { error: error.message };
  }
};
