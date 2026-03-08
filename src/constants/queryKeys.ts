export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters?: { includeInactive?: boolean }) =>
    [...productKeys.lists(), filters ?? {}] as const,
  detail: (id: number) => [...productKeys.all, id] as const,
};
