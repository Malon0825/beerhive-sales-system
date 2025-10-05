/**
 * Event Type Enumeration
 * Defines types of customer events for special offers
 */
export enum EventType {
  BIRTHDAY = 'birthday',
  ANNIVERSARY = 'anniversary',
  CUSTOM = 'custom',
}

export type EventTypeType = `${EventType}`;
