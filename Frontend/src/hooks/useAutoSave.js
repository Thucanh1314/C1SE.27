
import { useEffect, useRef, useState, useCallback } from 'react';
import { setDraft, getDraft, clearDraft, isDraftValid } from '../utils/draft.utils';

/**
 * Custom hook for auto-saving form data to localStorage
 * @param {string} key - Unique key for storage (e.g., 'survey_draft_new')
 * @param {Object} data - Data to save
 * @param {number} delay - Debounce delay in ms (default 1000)
 */
const useAutoSave = (key, data, delay = 1000) => {
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef(null);
    const initialLoadRef = useRef(false);

    // Load initial data - wrapped to use our utils
    const loadSavedData = useCallback(() => {
        const draft = getDraft(key);
        if (isDraftValid(draft)) {
            return draft; // Returns entire wrapper { data, updatedAt, version }
        } else {
            // If invalid or expired, clear it
            if (draft) clearDraft(key);
            return null;
        }
    }, [key]);

    // Save data effect
    useEffect(() => {
        if (!initialLoadRef.current) {
            initialLoadRef.current = true;
            return;
        }

        if (!data) return;

        setIsSaving(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            setDraft(key, data);
            setLastSaved(new Date());
            setIsSaving(false);
        }, delay);

        return () => clearTimeout(timeoutRef.current);
    }, [data, key, delay]);

    const clear = useCallback(() => {
        clearDraft(key);
        setLastSaved(null);
    }, [key]);

    return { lastSaved, isSaving, loadSavedData, clearSavedData: clear };
};

export default useAutoSave;
