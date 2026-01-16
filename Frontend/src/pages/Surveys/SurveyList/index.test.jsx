import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SurveyList from './index';
import SurveyService from '../../../api/services/survey.service';
import { useAuth } from '../../../contexts/AuthContext';

// Mock Dependencies
jest.mock('react-router-dom', () => ({
    useNavigate: () => jest.fn(),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
}));

jest.mock('../../../contexts/ToastContext', () => ({
    useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('../../../api/services/survey.service');

// Mock Auth Context
jest.mock('../../../contexts/AuthContext', () => ({
    useAuth: jest.fn()
}));

// Mock CSS Module
jest.mock('./SurveyList.module.scss', () => ({
    surveyList: 'surveyList',
    respondentView: 'respondentView',
    tabs: 'tabs',
    activeTab: 'activeTab',
    respondentCard: 'respondentCard',
    actionBtnPrimary: 'actionBtnPrimary',
    __esModule: true,
    default: new Proxy({}, { get: (target, prop) => prop })
}));

describe('SurveyList User Role View', () => {
    const mockSurveys = [
        {
            id: 1,
            title: 'Pending Survey',
            status: 'active',
            end_date: new Date(Date.now() + 86400000).toISOString(), // Ends tomorrow
            my_response_count: 0,
            questionCount: 5
        },
        {
            id: 2,
            title: 'Completed Survey',
            status: 'active',
            my_response_count: 1,
            questionCount: 3
        },
        {
            id: 3,
            title: 'Expired Survey',
            status: 'active',
            end_date: new Date(Date.now() - 86400000).toISOString(), // Ended yesterday
            my_response_count: 0
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        SurveyService.getAll.mockResolvedValue({
            surveys: mockSurveys,
            pagination: { total: 3 }
        });
    });

    test('Renders Pending tab by default for User role', async () => {
        useAuth.mockReturnValue({ state: { user: { role: 'user' } } });
        render(<SurveyList />);

        await waitFor(() => expect(screen.getByText('Surveys waiting for your response')).toBeInTheDocument());

        // Pending Survey should be visible
        expect(screen.getByText('Pending Survey')).toBeInTheDocument();
        // Completed Survey should NOT be in Pending tab
        expect(screen.queryByText('Completed Survey')).not.toBeInTheDocument();
        // Expired Survey should be visible (as it is not responded to)
        expect(screen.getByText('Expired Survey')).toBeInTheDocument();
    });

    test('Renders Completed tab correctly', async () => {
        useAuth.mockReturnValue({ state: { user: { role: 'user' } } });
        render(<SurveyList />);

        await waitFor(() => expect(screen.getByText('Pending')).toBeInTheDocument());

        fireEvent.click(screen.getByText('Completed'));

        expect(screen.getByText('Surveys you have completed')).toBeInTheDocument();
        expect(screen.getByText('Completed Survey')).toBeInTheDocument();
        expect(screen.queryByText('Pending Survey')).not.toBeInTheDocument();
    });

    test('Shows correct buttons for states', async () => {
        useAuth.mockReturnValue({ state: { user: { role: 'user' } } });
        render(<SurveyList />);

        await waitFor(() => expect(screen.getByText('Pending Survey')).toBeInTheDocument());

        // Pending -> Start Survey
        const startBtns = screen.getAllByText('Start survey');
        expect(startBtns).toHaveLength(1); // Only for Pending Survey

        // Expired -> Expired (disabled)
        const expiredBtn = screen.getByText('Expired');
        expect(expiredBtn).toBeDisabled();
    });

    test('Filters Expired from Pending? (Actually Requirement says Expired visible with Disabled button)', async () => {
        // My implementation keeps them in Pending if not responded. 
        // This test verifies that behavior.
        useAuth.mockReturnValue({ state: { user: { role: 'user' } } });
        render(<SurveyList />);

        await waitFor(() => expect(screen.getByText('Expired Survey')).toBeInTheDocument());
        expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    test('Creator View does not show Tabs', async () => {
        useAuth.mockReturnValue({ state: { user: { role: 'creator' } } });
        render(<SurveyList />);

        await waitFor(() => expect(screen.getByText('Manage your survey campaigns')).toBeInTheDocument());
        expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    });
});
