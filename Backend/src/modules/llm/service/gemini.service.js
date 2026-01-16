const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../../../src/utils/logger');
const groqService = require('./groq.service');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
        // Using 'gemini-1.5-flash' for speed and cost effectiveness
        this.modelName = 'gemini-1.5-flash';
        this.genAI = null;
        this.model = null;

        if (this.apiKey) {
            try {
                this.genAI = new GoogleGenerativeAI(this.apiKey);
                this.model = this.genAI.getGenerativeModel({ model: this.modelName });
                logger.info(`✨ GeminiService initialized with model: ${this.modelName}`);
            } catch (error) {
                logger.error('❌ Failed to initialize GeminiService:', error);
            }
        } else {
            logger.warn('⚠️ GEMINI_API_KEY is not set. AI features will use fallback.');
        }
    }

    async generateInsights(dataSummary) {
        if (!this.model) {
            logger.warn('⚠️ Gemini client not initialized. Returning fallback.');
            return null;
        }

        const prompt = `
            Analyze the following survey results and provide insights in JSON format.
            
            **Data Summary:**
            ${dataSummary}

            **Required JSON Structure:**
            {
                "summary": "A concise paragraph summarizing the key outcomes.",
                "key_findings": ["Finding 1", "Finding 2", "Finding 3", ...],
                "respondents_needs": ["Need 1", "Need 2", ...],
                "recommended_actions": ["Action 1", "Action 2", ...]
            }

            **Instructions:**
            - Be professional and analytical.
            - Focus on actionable insights.
            - If the data is insufficient, provide general best practices based on the available info.
            - STRICTLY return valid JSON code block only, no markdown formatting like \`\`\`json ... \`\`\`.
        `;

        try {
            logger.info('🤖 Sending request to Gemini...');

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            logger.info('✅ Gemini response received');

            if (!text) {
                throw new Error('Empty response from Gemini');
            }

            // Clean up markdown code blocks if present (Gemini sometimes adds them despite instructions)
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(text);
        } catch (error) {
            // Specific error handling for rate limits (HTTP 429) or Quota
            if (error.message && (error.message.includes('429') || error.message.includes('Quota exceeded'))) {
                logger.warn('⚠️ Gemini API rate limit/quota exceeded. Returning fallback.');
                return null; // Will trigger fallback in AnalyticsService
            }
            logger.error('❌ Error generating insights with Gemini:', error);

            // Failover to Groq
            logger.warn('⚠️ Switching to Groq AI fallback...');
            try {
                return await groqService.generateInsights(dataSummary);
            } catch (groqError) {
                logger.error('❌ Groq fallback also failed:', groqError);
                return null;
            }
        }
    }

    async chat(messages, context) {
        if (!this.model) {
            logger.warn('⚠️ Gemini client not initialized. Returning fallback.');
            return null;
        }

        // 1. Construct System Prompt with Context
        const systemPrompt = `
            You are an expert analytics assistant for a specific survey.
            
            **Survey Data Context:**
            ${JSON.stringify(context, null, 2)}

            **Instructions:**
            1. Answer the latest user question based on the history and data.
            2. If the answer is not in the data, say "I cannot find that information in the current analytics."
            3. Be concise, helpful, and professional.
            4. Do NOT mention "JSON" or "data context" to the user.
        `;

        // 2. Format History for Gemini (Simple text concatenation for single-turn stateless API, or use startChat if we maintained session object)
        // For statelessness compatible with Groq structure, we'll construct a full prompt.

        let fullPrompt = systemPrompt + "\n\n**Conversation History:**\n";

        messages.forEach(msg => {
            const role = msg.role === 'user' ? 'User' : 'Assistant';
            fullPrompt += `${role}: ${msg.content}\n`;
        });

        fullPrompt += "\nAssistant:";

        try {
            logger.info('🤖 Sending chat request to Gemini...');
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            const text = response.text();

            if (!text) throw new Error('Empty response from Gemini');

            return text;

        } catch (error) {
            logger.error('❌ Error chatting with Gemini:', error);

            // Failover to Groq
            logger.warn('⚠️ Switching to Groq AI fallback for Chat...');
            try {
                return await groqService.chat(messages, context);
            } catch (groqError) {
                logger.error('❌ Groq fallback also failed:', groqError);
                return "I'm sorry, I'm having trouble analyzing the data right now. Please try again later.";
            }
        }
    }
}

module.exports = new GeminiService();
