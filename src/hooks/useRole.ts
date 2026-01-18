import { useState, useEffect } from 'react';

export type UserRole = 'doctor' | 'patient' | null;

/**
 * Detects user role from URL query parameter or defaults to 'doctor'
 * Usage: ?role=patient or ?role=doctor
 * If no role specified, defaults to 'doctor' for backward compatibility
 */
export function useRole(): UserRole {
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role');
    
    if (roleParam === 'patient' || roleParam === 'doctor') {
      setRole(roleParam);
    } else {
      // Default to doctor if not specified (backward compatibility)
      setRole('doctor');
    }
  }, []);

  return role;
}
