import React, { useState, useRef, useEffect } from 'react';
import AnalyticsService from '../../api/services/analytics.service';
import styles from './AnalysisChat.module.scss';
import { useToast } from '../../contexts/ToastContext';
import { LuBot, LuUser, LuSend, LuTrash2, LuSparkles, LuBrainCircuit } from 'react-icons/lu';

const SUGGESTED_PROMPTS_WITH_DATA = [
    "How many responses does this survey have?",
    "What is the completion rate?",
    "Which question has the highest drop-off?",
    "Summarize the quality score.",
    "What is the average time per question?",
    "Are there many spam text answers?"
];

const SUGGESTED_PROMPTS_NO_DATA = [
    "What insights should I expect from this survey?",
    "What metrics are most important here?",
    "Suggest hypotheses based on the questions.",
    "What should I look for in the responses?",
    "How can I improve response rates?",
    "What analysis methods would work best?"
];

const AnalysisChat = ({ surveyId, responseCount = 0, surveyTitle = '' }) => {
    const { showToast } = useToast();
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // State
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [provider, setProvider] = useState('gemini'); // 'gemini' | 'groq'

    // Load History
    useEffect(() => {
        const savedHistory = localStorage.getItem(`survey_chat_${surveyId}`);
        if (savedHistory) {
            setMessages(JSON.parse(savedHistory));
        } else {
            // Initial Welcome Message
            const initialMsg = responseCount === 0
                ? `Hello! I see "${surveyTitle}" hasn't received responses yet. I can help you plan your analysis or hypothesize outcomes.`
                : `Hello! I'm ready to analyze "${surveyTitle}". Ask me anything about the data.`;

            setMessages([{ role: 'system', content: initialMsg }]);
        }
    }, [surveyId, responseCount, surveyTitle]);

    // Save History & Scroll
    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(`survey_chat_${surveyId}`, JSON.stringify(messages));
        }
        scrollToBottom();
    }, [messages, surveyId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleClearHistory = () => {
        if (window.confirm('Clear chat history?')) {
            localStorage.removeItem(`survey_chat_${surveyId}`);
            setMessages([{ role: 'system', content: "History cleared. How can I help?" }]);
        }
    };

    const handleSend = async (text = input) => {
        if (!text.trim() || loading) return;

        const userMessage = { role: 'user', content: text };

        // Optimistic UI Update
        const newHistory = [...messages, userMessage];
        setMessages(newHistory);
        setInput('');
        setLoading(true);

        // Reset Textarea height
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        try {
            // Send FULL conversation history to backend
            const response = await AnalyticsService.chatWithData(surveyId, newHistory, provider);

            const answer = response.answer || "I received empty response.";
            const aiMessage = { role: 'system', content: answer };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage = { role: 'system', content: 'Sorry, I encountered an error analyzing the data. Please ensure the AI service is active.' };
            setMessages(prev => [...prev, errorMessage]);
            showToast('AI Service Error', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Auto-resize textarea
    const handleInput = (e) => {
        setInput(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    return (
        <div className={styles.chatContainer}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.title}>
                    <LuSparkles className={styles.icon} />
                    <span>Ask AI</span>
                    <span className={`${styles.badge} ${responseCount > 0 ? styles.active : styles.planning}`}>
                        {responseCount > 0 ? 'Context Active' : 'Planning Mode'}
                    </span>
                </div>

                <div className={styles.actions}>
                    <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className={styles.providerSelect}
                    >
                        <option value="gemini">Gemini</option>
                        <option value="groq">Groq (Llama 3)</option>
                    </select>

                    <button
                        onClick={handleClearHistory}
                        className={styles.iconButton}
                        title="Clear History"
                    >
                        <LuTrash2 />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className={styles.messagesArea}>
                {messages.map((msg, index) => (
                    <div key={index} className={`${styles.message} ${styles[msg.role]}`}>
                        <div className={styles.avatar}>
                            {msg.role === 'system' ?
                                (provider === 'groq' ? <LuBrainCircuit /> : <LuBot />)
                                : <LuUser />}
                        </div>
                        <div className={styles.content}>
                            {msg.content.split('\n').map((line, i) => (
                                <p key={i}>{line}</p>
                            ))}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className={`${styles.message} ${styles.system}`}>
                        <div className={styles.avatar}><LuBot /></div>
                        <div className={styles.content}>
                            <span className={styles.typingDot}></span>
                            <span className={styles.typingDot}></span>
                            <span className={styles.typingDot}></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={styles.inputArea}>
                {/* Suggestions Wrapper (Push up logic handled via CSS usually or conditional render) */}
                {messages.length < 3 && (
                    <div className={styles.suggestions}>
                        {(responseCount > 0 ? SUGGESTED_PROMPTS_WITH_DATA : SUGGESTED_PROMPTS_NO_DATA).map((prompt, index) => (
                            <button
                                key={index}
                                className={styles.chip}
                                onClick={() => handleSend(prompt)}
                                disabled={loading}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                )}

                <div className={styles.inputWrapper}>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder={responseCount === 0 ? "Ask for planning advice..." : "Ask detailed questions about your data..."}
                        disabled={loading}
                        rows={1}
                        className={styles.textarea}
                    />
                    <button
                        onClick={() => handleSend()}
                        disabled={loading || !input.trim()}
                        className={styles.sendButton}
                    >
                        <LuSend />
                    </button>
                </div>
                <div className={styles.footerInfo}>
                    AI can make mistakes. Review generated insights.
                </div>
            </div>
        </div>
    );
};

export default AnalysisChat;

