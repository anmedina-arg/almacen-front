import type { Metadata } from 'next';
import { LandingShell } from '@/features/landing/components/LandingShell';
import { Hero } from '@/features/landing/components/Hero';
import { ModulesWall } from '@/features/landing/components/ModulesWall';
import { RelaySection } from '@/features/landing/components/RelaySection';
import { ProofSection, CloseSection } from '@/features/landing/components/ProofAndClose';

export const metadata: Metadata = {
  title: 'chaskyapp: catálogo por WhatsApp y gestión para tu local',
  description:
    'Catálogo online con pedidos por WhatsApp, y módulos para llevar stock, precios, clientes y cuentas de tu almacén.',
  openGraph: {
    title: 'chaskyapp: catálogo por WhatsApp y gestión para tu local',
    description:
      'Del pedido de WhatsApp a la caja cerrada. Catálogo online y módulos de gestión para almacenes y rotiserías.',
  },
};

export default function Landing() {
  return (
    <LandingShell>
      <Hero />
      <ModulesWall />
      <RelaySection />
      <ProofSection />
      <CloseSection />
    </LandingShell>
  );
}
