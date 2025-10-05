'use client';

import EventManager from '@/views/events/EventManager';
import { RouteGuard } from '@/views/shared/guards/RouteGuard';
import { UserRole } from '@/models/enums/UserRole';

/**
 * Events Page
 * Manage customer events and special offers
 * Protected route - only accessible by managers and admins
 */
export default function EventsPage() {
  return (
    <RouteGuard requiredRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
      <EventManager />
    </RouteGuard>
  );
}
