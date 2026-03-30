'use client';

import dynamic from 'next/dynamic';

const AdminPanelLink = dynamic(
  () => import('./AdminPanelLink').then((m) => ({ default: m.AdminPanelLink })),
  { ssr: false }
);

export function AdminPanelLinkLazy() {
  return <AdminPanelLink />;
}
