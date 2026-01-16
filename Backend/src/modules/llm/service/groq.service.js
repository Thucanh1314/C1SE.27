const OpenAI = require('openai');
const logger = require('../../../../src/utils/logger');

class GroqService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY || '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';
        this.baseURL = 'https://api.groq.com/openai/v1';
        this.modelName = 'openai/gpt-oss-20b'; // User provided model
        this.client = null;

        if (this.apiKey) {
            try {
                this.client = new OpenAI({
                    apiKey: this.apiKey,
                    baseURL: this.baseURL
                });
                logger.info(`cx GroqService initialized with model: ${this.modelName}`);
            } catch (error) {
                logger.error('❌ Failed to initialize GroqService:', error);
            }
        } else {
            logger.warn('⚠️ GROQ_API_KEY is not set.');
        }
    }

    async generateInsights(dataSummary) {
        if (!this.client) {
            logger.warn('⚠️ Groq client not initialized.');
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
            - STRICTLY return valid JSON code block only.
        `;

        try {
            logger.info('🤖 Sending request to Groq...');

            const completion = await this.client.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a helpful data analyst. You always reply in valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                model: this.modelName,
                temperature: 0.5,
                response_format: { type: "json_object" }
            });

            const content = completion.choices[0]?.message?.content;

            logger.info('✅ Groq response received');

            if (!content) {
                throw new Error('Empty response from Groq');
            }

            return JSON.parse(content);
        } catch (error) {
            logger.error('❌ Error generating insights with Groq:', error.response ? error.response.data : error.message);
            return null;
        }
    }

    async chat(messages, context) {
        if (!this.client) {
            logger.warn('⚠️ Groq client not initialized.');
            return null;
        }

        const systemPrompt = `
            You are an expert analytics assistant for a specific survey.
            
            **Survey Data Context:**
            ${JSON.stringify(context, null, 2)}

            **Instructions:**
            1. Answer the user question based on the data.
            2. Be concise, helpful, and professional.
            3. Do NOT mention "JSON" or "data context".
        `;

        // Format messages for OpenAI API
        const formattedMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map(m => ({
                role: m.role === 'system' ? 'assistant' : m.role, // Map system->assistant if needed, or keep generic
                content: m.content
            }))
        ];

        try {
            logger.info('🤖 Sending chat request to Groq...');

            const completion = await this.client.chat.completions.create({
                messages: formattedMessages,
                model: this.modelName,
                temperature: 0.5,
            });

            const content = completion.choices[0]?.message?.content;

            logger.info('✅ Groq chat response received');

            if (!content) {
                throw new Error('Empty response from Groq');
            }

            return content;
        } catch (error) {
            logger.error('❌ Error chatting with Groq:', error.response ? error.response.data : error.message);
            return null;
        }
    }
}

module.exports = new GroqService();
