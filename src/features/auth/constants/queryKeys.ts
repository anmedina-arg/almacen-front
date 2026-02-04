export const authKeys = {
  all: ['auth'] as const,
  sessions: () => [...authKeys.all, 'session'] as const,
  users: () => [...authKeys.all, 'user'] as const,
  currentUser: () => [...authKeys.users(), 'current'] as const,
};
