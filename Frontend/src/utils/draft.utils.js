/**
 * Draft Management Utilities
 * Handles localStorage operations with validation, TTL, and versioning.
 */

const DRAFT_VERSION = '1.0';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 Hours

export const getDraft = (key) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        return parsed;
    } catch (e) {
        console.warn('[DraftUtils] Failed to parse draft:', e);
        return null;
    }
};

export const setDraft = (key, data) => {
    try {
        const payload = {
            version: DRAFT_VERSION,
            updatedAt: Date.now(),
            data
        };
        localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
        console.warn('[DraftUtils] Failed to save draft:', e);
    }
};

export const clearDraft = (key) => {
    try {
        localStorage.removeItem(key);
    } catch (e) {
        console.warn('[DraftUtils] Failed to clear draft:', e);
    }
};

export const isDraftValid = (draft, ttl = DEFAULT_TTL_MS) => {
    if (!draft || !draft.data || !draft.updatedAt) return false;

    const age = Date.now() - draft.updatedAt;
    if (age > ttl) {
        return false; // Expired
    }

    // Future check: draft.version vs DRAFT_VERSION

    return true;
};
