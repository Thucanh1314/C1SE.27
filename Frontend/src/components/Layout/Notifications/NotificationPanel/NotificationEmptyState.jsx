import React, { useMemo } from 'react';

const QUOTES = [
    "The system is quiet. I'll notify you when new analysis results are ready!",
    "Everything is up to date. You're all caught up!",
    "AI is resting, ready for the next task.",
    "No new notifications. Have a productive day!",
    "Data is being processed in the background. Check back soon!"
];

const NotificationEmptyState = () => {
    // Select random quote once on mount
    const randomQuote = useMemo(() => {
        return QUOTES[Math.floor(Math.random() * QUOTES.length)];
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
            {/* Robot / Quiet Space SVG */}
            <svg
                width="120"
                height="120"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-4 text-gray-300 dark:text-gray-600"
            >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9c.83 0 1.5-.67 1.5-1.5S7.83 8 7 8s-1.5.67-1.5 1.5S6.17 11 7 11zm10 0c.83 0 1.5-.67 1.5-1.5S17.83 8 17 8s-1.5.67-1.5 1.5-.67 1.5-1.5 1.5zM12 16c2.03 0 3.8-1.11 4.75-2.75.19-.33-.05-.75-.44-.75H7.69c-.38 0-.63.42-.44.75.95 1.64 2.72 2.75 4.75 2.75z" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" className="opacity-50" />
            </svg>

            <p className="text-sm font-medium leading-relaxed max-w-[200px]">
                {randomQuote}
            </p>
        </div>
    );
};

export default NotificationEmptyState;
