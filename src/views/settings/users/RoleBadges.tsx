'use client';

import RoleBadge from './RoleBadge';

interface RoleBadgesProps {
  roles: string | string[];  // Support both single role and array
}

/**
 * RoleBadges Component
 * Displays one or more role badges for a user
 * Supports both single role (backward compatibility) and multiple roles
 */
export default function RoleBadges({ roles }: RoleBadgesProps) {
  // Normalize to array
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  
  // Filter out any empty values
  const validRoles = rolesArray.filter(Boolean);
  
  if (validRoles.length === 0) {
    return null;
  }
  
  // If single role, display normally
  if (validRoles.length === 1) {
    return <RoleBadge role={validRoles[0]} />;
  }
  
  // If multiple roles, display all with spacing
  return (
    <div className="flex flex-wrap gap-1">
      {validRoles.map((role, index) => (
        <div key={`${role}-${index}`} className="relative">
          <RoleBadge role={role} />
          {index === 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center" title="Primary role">
              1
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
