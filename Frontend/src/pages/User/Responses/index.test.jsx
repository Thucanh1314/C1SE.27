import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserResponses from './index';
import ResponseService from '../../../api/services/response.service';

// Mock CSS Module to prevent parsing errors
jest.mock('./UserResponses.module.scss', () => ({
    container: 'container',
    header: 'header',
    filtersSection: 'filtersSection',
    quickFilterBtn: 'quickFilterBtn',
    active: 'active',
    summaryHeader: 'summaryHeader',
    statusBadge: 'statusBadge',
    statusCompleted: 'statusCompleted',
    responsesList: 'responsesList',
    previewModalContent: 'previewModalContent',
    modalLoader: 'modalLoader',
    // Proxies generic access
    __esModule: true,
    default: new Proxy({}, { get: (target, prop) => prop })
}));

// Mock dependencies
jest.mock('react-router-dom', () => ({
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    useNavigate: () => jest.fn(),
}));

jest.mock('../../../contexts/ToastContext', () => ({
    useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('../../../api/services/response.service');
jest.mock('../../../utils/pdfGenerator', () => ({
    generateResponsePDF: jest.fn(),
    generateAdvancedResponsePDF: jest.fn(),
}));

// Mock child components to avoid complexity
jest.mock('../../../components/common/Pagination/Pagination', () => () => <div data-testid="pagination">Pagination</div>);
jest.mock('../../../components/UI/ConfirmModal', () => () => <div data-testid="confirm-modal">ConfirmModal</div>);

// We use a simplified mock for Modal to ensure we test the *usage* of it, not the internal implementation
jest.mock('../../../components/UI/Modal/Modal', () => ({ isOpen, title, children, onClose }) => {
    if (!isOpen) return null;
    return (
        <div role="dialog" aria-label={title}>
            <h2>{title}</h2>
            <button onClick={onClose} aria-label="Close">Close</button>
            {children}
        </div>
    );
});

describe('UserResponses UX Improvements', () => {
    const mockResponses = [
        {
            id: 1,
            status: 'completed',
            created_at: '2023-10-01T10:00:00Z',
            updated_at: '2023-10-01T10:00:00Z',
            Survey: { title: 'Survey 1', description: 'Desc 1' },
            Answers: []
        },
        {
            id: 2,
            status: 'started',
            created_at: '2023-10-05T10:00:00Z',
            updated_at: '2023-10-05T10:00:00Z',
            Survey: { title: 'Survey 2', description: 'Desc 2' },
            Answers: []
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        ResponseService.getUserResponses.mockResolvedValue({
            success: true,
            data: {
                responses: mockResponses,
                pagination: { total: 2, page: 1, limit: 20, totalPages: 1 }
            }
        });
    });

    test('Renders summary correctly', async () => {
        render(<UserResponses />);

        await waitFor(() => expect(screen.getByText('Survey 1')).toBeInTheDocument());

        // Check Summary Logic
        expect(screen.getByText(/Total: 2/)).toBeInTheDocument();
        expect(screen.getByText(/Completed: 1/)).toBeInTheDocument();
    });

    test('Renders empty state correctly (True Empty)', async () => {
        ResponseService.getUserResponses.mockResolvedValue({
            success: true,
            data: { responses: [], pagination: { total: 0 } }
        });

        render(<UserResponses />);
        await waitFor(() => {
            expect(screen.getByText('No survey responses yet')).toBeInTheDocument();
            expect(screen.getByText('Explore Surveys')).toBeInTheDocument();
        });
    });

    test('Status Badge shows View-only', async () => {
        render(<UserResponses />);
        await waitFor(() => expect(screen.getByText('Survey 1')).toBeInTheDocument());

        expect(screen.getByText(/Completed · View-only/)).toBeInTheDocument();
        expect(screen.getByText(/In Progress · View-only/)).toBeInTheDocument();
    });

    test('PDF Button has correct label and tooltip', async () => {
        render(<UserResponses />);
        await waitFor(() => expect(screen.getByText('Survey 1')).toBeInTheDocument());

        const pdfBtn = screen.getAllByText('Export My Answers (PDF)')[0];
        expect(pdfBtn).toBeInTheDocument();
        // Check title attribute (tooltip)
        expect(pdfBtn.closest('button')).toHaveAttribute('title', 'Download your answers as a PDF');
    });

    test('Opening Preview Modal', async () => {
        ResponseService.getUserResponseDetail.mockResolvedValue({
            success: true,
            data: {
                response: {
                    ...mockResponses[0],
                    Answers: [
                        { Question: { question_text: 'Q1' }, text_answer: 'Ans1' }
                    ]
                }
            }
        });

        render(<UserResponses />);
        await waitFor(() => expect(screen.getByText('Survey 1')).toBeInTheDocument());

        const viewBtns = screen.getAllByText('View Details');
        fireEvent.click(viewBtns[0]);

        await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
        expect(screen.getByText('Response Details')).toBeInTheDocument();

        // Wait for loader to disappear or content to appear
        // Mock ResponseDetail resolution
    });

    test('Quick Filters toggling', async () => {
        render(<UserResponses />);
        await waitFor(() => expect(screen.getByText('Survey 1')).toBeInTheDocument());

        const completedFilterBtn = screen.getByText('Completed only');
        fireEvent.click(completedFilterBtn);

        // Should filter out non-completed (Survey 2 is started)
        // Wait for re-render
        expect(screen.getByText('Survey 1')).toBeInTheDocument();
        expect(screen.queryByText('Survey 2')).not.toBeInTheDocument();

        // Toggle off
        fireEvent.click(completedFilterBtn);
        expect(screen.getByText('Survey 2')).toBeInTheDocument();
    });
});
