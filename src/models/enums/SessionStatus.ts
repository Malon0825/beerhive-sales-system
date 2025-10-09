/**
 * Session Status Enumeration
 * Defines the lifecycle states of an order session (tab)
 */
export enum SessionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  ABANDONED = 'abandoned',
}

export type SessionStatusType = `${SessionStatus}`;
