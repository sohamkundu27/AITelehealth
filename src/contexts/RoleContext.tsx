import { createContext, useContext } from 'react';
import type { UserRole } from '../hooks/useRole';

export const RoleContext = createContext<UserRole>(null);
export const useRoleContext = () => useContext(RoleContext);
