
import { useEffect } from 'react';

/**
 * Hook to warn user about unsaved changes
 * @param {boolean} isDirty - Whether the form has unsaved changes
 */
const useUnsavedChanges = (isDirty) => {
    // Browser unload warning (refresh/close tab)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Note: For React Router v6, blocking navigation is tricky without `useBlocker` (available in data routers).
    // Assuming simple implementation or reliance on browser native confirm for now.
    // Ideally we would double check if unstable_useBlocker is available or use a custom ConfirmModal before navigation actions.
};

export default useUnsavedChanges;
