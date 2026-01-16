import React, { useState, useEffect, useRef, useCallback } from 'react';
// Chatbox Component
import { ChatService } from '../../api/services';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import styles from './Chatbox.module.scss';
import Message from './Message/Message';
import ConversationList from './ConversationList/ConversationList';
import ChatInput from './ChatInput/ChatInput';
import Loader from '../common/Loader/Loader';

const Chatbox = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const messagesEndRef = useRef(null);

    const [conversations, setConversations] = useState([]);
    const [currentConversation, setCurrentConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [showConversations, setShowConversations] = useState(false);
    const [apiProvider, setApiProvider] = useState('auto');

    // Define these functions first so loadConversations can depend on them
    const createNewConversation = useCallback(async (title = 'New Chat') => {
        try {
            const response = await ChatService.createConversation(title);
            const newConversation = response.data;

            setConversations(prev => [newConversation, ...prev]);
            setCurrentConversation(newConversation);
            setMessages([]);

            return newConversation;
        } catch (error) {
            showToast('Failed to create conversation', 'error');
            throw error;
        }
    }, [showToast]);

    const loadMessages = useCallback(async (conversationId) => {
        try {
            const response = await ChatService.getMessages(conversationId);
            setMessages(response.data);
        } catch (error) {
            showToast('Failed to load messages', 'error');
        }
    }, [showToast]);

    const loadConversations = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await ChatService.getConversations();
            setConversations(response.data);

            // Auto-select the first conversation or create a new one
            if (response.data.length > 0) {
                setCurrentConversation(response.data[0]);
                await loadMessages(response.data[0].id);
            } else {
                await createNewConversation();
            }
        } catch (error) {
            showToast('Failed to load conversations', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [showToast, createNewConversation, loadMessages]);

    useEffect(() => {
        if (isOpen) {
            loadConversations();
        }
    }, [isOpen, loadConversations]);

    const selectConversation = async (conversation) => {
        setCurrentConversation(conversation);
        setShowConversations(false);
        await loadMessages(conversation.id);
    };

    const sendMessage = async (messageText) => {
        if (!messageText.trim()) return;

        try {
            setIsSending(true);

            let conversation = currentConversation;

            // Create new conversation if none exists
            if (!conversation) {
                conversation = await createNewConversation();
            }

            // Add user message immediately to UI
            const userMessage = {
                id: 'temp-' + Date.now(),
                conversation_id: conversation.id,
                sender_type: 'user',
                message: messageText,
                created_at: new Date().toISOString(),
                status: 'sending'
            };

            setMessages(prev => [...prev, userMessage]);

            // Send message to backend
            const response = await ChatService.sendMessage(conversation.id, messageText, apiProvider);

            // Update messages with the actual saved messages
            if (response.data.userMessage && response.data.aiResponse) {
                setMessages(prev => {
                    // Remove temporary message and add actual messages
                    const withoutTemp = prev.filter(msg => msg.id !== userMessage.id);
                    return [...withoutTemp, response.data.userMessage, response.data.aiResponse];
                });
            }

            // Update conversation in list if title should change
            if (conversation.title === 'New Chat' && messageText.length > 0) {
                const newTitle = messageText.slice(0, 30) + (messageText.length > 30 ? '...' : '');
                try {
                    await ChatService.updateConversation(conversation.id, { title: newTitle });
                    setConversations(prev =>
                        prev.map(conv =>
                            conv.id === conversation.id
                                ? { ...conv, title: newTitle }
                                : conv
                        )
                    );
                    setCurrentConversation(prev => ({ ...prev, title: newTitle }));
                } catch (titleError) {
                    // Title update failed, but message was sent successfully
                    console.warn('Failed to update conversation title:', titleError);
                }
            }

        } catch (error) {
            showToast('Failed to send message', 'error');

            // Remove the temporary message if sending failed
            setMessages(prev => prev.filter(msg => msg.id !== 'temp-' + Date.now()));
        } finally {
            setIsSending(false);
        }
    };

    const deleteConversation = async (conversationId) => {
        try {
            await ChatService.deleteConversation(conversationId);
            setConversations(prev => prev.filter(conv => conv.id !== conversationId));

            if (currentConversation?.id === conversationId) {
                const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
                if (remainingConversations.length > 0) {
                    setCurrentConversation(remainingConversations[0]);
                    await loadMessages(remainingConversations[0].id);
                } else {
                    setCurrentConversation(null);
                    setMessages([]);
                }
            }

            showToast('Conversation deleted successfully', 'success');
        } catch (error) {
            showToast('Failed to delete conversation', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.chatboxOverlay}>
            <div className={styles.chatbox}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <button
                            className={styles.conversationsBtn}
                            onClick={() => setShowConversations(!showConversations)}
                            title="Toggle conversations"
                        >
                            💬
                        </button>
                        <h3>
                            {currentConversation?.title || 'Chat with AI'}
                        </h3>
                    </div>
                    <div className={styles.headerRight}>
                        <select
                            value={apiProvider}
                            onChange={(e) => setApiProvider(e.target.value)}
                            className={styles.providerSelect}
                            title="Select AI provider"
                        >
                            <option value="auto">Auto</option>
                            <option value="super_dev">Super Dev</option>
                            <option value="gemini">Gemini</option>
                        </select>
                        <button
                            className={styles.newChatBtn}
                            onClick={() => createNewConversation()}
                            title="New conversation"
                        >
                            +
                        </button>
                        <button
                            className={styles.closeBtn}
                            onClick={onClose}
                            title="Close chat"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className={styles.content}>
                    {/* Conversation List */}
                    {showConversations && (
                        <ConversationList
                            conversations={conversations}
                            currentConversation={currentConversation}
                            onSelectConversation={selectConversation}
                            onDeleteConversation={deleteConversation}
                            onNewConversation={createNewConversation}
                        />
                    )}

                    {/* Messages Area */}
                    <div className={styles.messagesContainer}>
                        {isLoading ? (
                            <div className={styles.loadingContainer}>
                                <Loader size="small" />
                                <span>Loading conversations...</span>
                            </div>
                        ) : (
                            <>
                                <div className={styles.messages}>
                                    {messages.length === 0 ? (
                                        <div className={styles.emptyState}>
                                            <div className={styles.emptyIcon}>🗨️</div>
                                            <h4>Start a conversation</h4>
                                            <p>Ask me anything! I can help with coding, general questions, and more.</p>
                                            <div className={styles.suggestions}>
                                                <button onClick={() => sendMessage("What can you help me with?")}>
                                                    What can you help me with?
                                                </button>
                                                <button onClick={() => sendMessage("Help me write some code")}>
                                                    Help me write some code
                                                </button>
                                                <button onClick={() => sendMessage("Explain a technical concept")}>
                                                    Explain a technical concept
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        messages.map((message) => (
                                            <Message
                                                key={message.id}
                                                message={message}
                                                user={user}
                                            />
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <ChatInput
                                    onSendMessage={sendMessage}
                                    isSending={isSending}
                                    disabled={!currentConversation && !isLoading}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chatbox;
