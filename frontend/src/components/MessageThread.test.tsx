import { afterEach, beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { render } from '@/test/test-utils';
import { MessageThread } from './MessageThread';
import { SenderType } from '@helpdesk/common';
import type { TicketMessage } from '@/lib/api';

// Mock data
const mockCustomerMessage: TicketMessage = {
  id: 'msg1',
  from: 'customer@example.com',
  to: 'support@helpdesk.com',
  subject: 'Test subject',
  body: 'Customer message body',
  bodyHtml: null,
  senderType: SenderType.CUSTOMER,
  createdAt: '2024-01-15T10:00:00Z',
};

const mockAgentMessage: TicketMessage = {
  id: 'msg2',
  from: 'agent@helpdesk.com',
  to: 'customer@example.com',
  subject: 'Re: Test subject',
  body: 'Agent reply body',
  bodyHtml: null,
  senderType: SenderType.AGENT,
  createdAt: '2024-01-15T11:00:00Z',
};

const mockMessages: TicketMessage[] = [mockCustomerMessage, mockAgentMessage];

// Setup MSW server (minimal, component has no API calls)
const server = setupServer(
  http.get('/api/auth/get-session', () => {
    return HttpResponse.json({ session: null, user: null });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('MessageThreads', () => {
  describe('Empty State', () => {
    it('should display "No messages yet" when messages array is empty', () => {
      render(<MessageThread messages={[]} />);

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    it('should display "No messages yet" when messages is null', () => {
      render(<MessageThread messages={null as unknown as TicketMessage[]} />);

      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    it('should display "Message Thread" heading when empty', () => {
      render(<MessageThread messages={[]} />);

      expect(screen.getByText('Message Thread')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('should render all messages in the thread', () => {
      render(<MessageThread messages={mockMessages} />);

      expect(screen.getByText('Customer message body')).toBeInTheDocument();
      expect(screen.getByText('Agent reply body')).toBeInTheDocument();
    });

    it('should display message subject for each message', () => {
      render(<MessageThread messages={mockMessages} />);

      expect(screen.getByText('Test subject')).toBeInTheDocument();
      expect(screen.getByText('Re: Test subject')).toBeInTheDocument();
    });

    it('should display sender email for each message', () => {
      render(<MessageThread messages={mockMessages} />);

      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
      expect(screen.getByText('agent@helpdesk.com')).toBeInTheDocument();
    });

    it('should display formatted date for each message', () => {
      render(<MessageThread messages={mockMessages} />);

      // Dates are formatted as "January 15, 2024 at 06:00 PM" etc.
      // Use getAllByText since there are multiple messages with dates
      const dates = screen.getAllByText(/January 15, 2024/);
      expect(dates.length).toBe(2);
    });

    it('should display "Message Thread" heading', () => {
      render(<MessageThread messages={mockMessages} />);

      expect(screen.getByText('Message Thread')).toBeInTheDocument();
    });
  });

  describe('Sender Type Badges', () => {
    it('should display "Customer" badge for customer messages', () => {
      render(<MessageThread messages={mockMessages} />);

      expect(screen.getByText('Customer')).toBeInTheDocument();
    });

    it('should display "Agent" badge for agent messages', () => {
      render(<MessageThread messages={mockMessages} />);

      expect(screen.getByText('Agent')).toBeInTheDocument();
    });
  });

  describe('Visual Distinction', () => {
    it('should render customer message with correct styling', () => {
      const { container } = render(<MessageThread messages={[mockCustomerMessage]} />);

      // Customer messages should have white background (default)
      const messageCard = container.querySelector('.bg-white');
      expect(messageCard).toBeInTheDocument();
      expect(messageCard).toHaveTextContent('Customer message body');
    });

    it('should render agent message with blue styling', () => {
      const { container } = render(<MessageThread messages={[mockAgentMessage]} />);

      // Agent messages should have blue background
      const messageCard = container.querySelector('.bg-blue-50');
      expect(messageCard).toBeInTheDocument();
      expect(messageCard).toHaveTextContent('Agent reply body');
    });

    it('should render both customer and agent messages with distinct styling', () => {
      const { container } = render(<MessageThread messages={mockMessages} />);

      const whiteCards = container.querySelectorAll('.bg-white');
      const blueCards = container.querySelectorAll('.bg-blue-50');

      // Should have at least one of each
      expect(whiteCards.length).toBeGreaterThanOrEqual(1);
      expect(blueCards.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Single Message', () => {
    it('should display a single customer message correctly', () => {
      render(<MessageThread messages={[mockCustomerMessage]} />);

      expect(screen.getByText('Customer message body')).toBeInTheDocument();
      expect(screen.getByText('customer@example.com')).toBeInTheDocument();
      expect(screen.getByText('Test subject')).toBeInTheDocument();
      expect(screen.getByText('Customer')).toBeInTheDocument();
    });

    it('should display a single agent message correctly', () => {
      render(<MessageThread messages={[mockAgentMessage]} />);

      expect(screen.getByText('Agent reply body')).toBeInTheDocument();
      expect(screen.getByText('agent@helpdesk.com')).toBeInTheDocument();
      expect(screen.getByText('Re: Test subject')).toBeInTheDocument();
      expect(screen.getByText('Agent')).toBeInTheDocument();
    });
  });

  describe('Message Order', () => {
    it('should display messages in the order they are provided', () => {
      render(<MessageThread messages={mockMessages} />);

      const allText = screen.getAllByText(/message body|reply body/i);
      // First message should appear before second
      expect(allText[0]).toHaveTextContent('Customer message body');
      expect(allText[1]).toHaveTextContent('Agent reply body');
    });
  });
});
