'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCloudinaryUrl } from '@/utils/cloudinaryUrl';
import HelpButton from './HelpButton';
import { useIsAuthenticated, useUser } from '@/features/auth/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useRouter } from 'next/navigation';
import { features } from '@/lib/features';

interface HeaderClientProps {
	logo: React.ReactNode;
}

function UserMenu() {
	const user = useUser();
	const [open, setOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const { mutate: logout, isPending } = useLogout();

	const { data: profile } = useQuery({
		queryKey: ['profile', user?.id],
		queryFn: async () => {
			if (!user?.id) return null;
			const { data } = await supabaseBrowser
				.from('profiles')
				.select('avatar_url, full_name, role')
				.eq('id', user.id)
				.single();
			return data;
		},
		enabled: !!user?.id,
		staleTime: 5 * 60 * 1000,
	});

	const fullName =
		profile?.full_name ||
		user?.user_metadata?.full_name ||
		user?.user_metadata?.name ||
		user?.email?.split('@')[0] ||
		'Usuario';

	const displayName = fullName.split(' ')[0];

	const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
	const initials = displayName.charAt(0).toUpperCase();

	// Cerrar al hacer click fuera
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, []);

	const handleLogout = () => {
		logout(undefined, {
			onSuccess: () => {
				setOpen(false);
				router.push('/');
			},
		});
	};

	return (
		<div ref={menuRef} className="relative">
			{/* Trigger: foto a la izquierda + primer nombre a la derecha */}
			<button
				onClick={() => setOpen((v) => !v)}
				className="flex items-center px-1 py-1 rounded-xl hover:bg-gray-100 transition-colors"
				aria-expanded={open}
				aria-haspopup="true"
			>
				{avatarUrl ? (
					<div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
						<Image src={avatarUrl} alt={displayName} width={36} height={36} className="rounded-full object-cover" />
					</div>
				) : (
					<div className="w-9 h-9 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
						{initials}
					</div>
				)}
			</button>

			{/* Dropdown */}
			{open && (
				<div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
					<div className="px-3 py-2 border-b border-gray-100">
						<p className="text-xs text-gray-400">Sesión iniciada como</p>
						<p className="text-sm font-medium text-gray-700 truncate">{displayName}</p>
					</div>
					{profile?.role === 'admin' && (
						<Link
							href={features.dashboard ? '/admin/dashboard' : '/admin/products'}
							onClick={() => setOpen(false)}
							className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
						>
							<svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
							</svg>
							Panel de administración
						</Link>
					)}
					<button
						onClick={handleLogout}
						disabled={isPending}
						className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 rounded-b-xl"
					>
						{isPending ? 'Saliendo...' : 'Cerrar sesión'}
					</button>
				</div>
			)}
		</div>
	);
}

export function HeaderClient({ logo }: HeaderClientProps) {
	const isAuthenticated = useIsAuthenticated();

	return (
		<div className="relative z-10 flex items-center justify-between gap-3 px-3 py-2 bg-white/80 backdrop-blur-md">
			{/* Izquierda: logo + título */}
			<div className="flex items-center gap-2 flex-1 min-w-0">
				{logo}
				<h1 className="text-xl font-bold leading-tight">Market del Cevil</h1>
			</div>

			{/* Derecha: perfil + ayuda en una sola línea */}
			<div className="flex items-center gap-2 flex-shrink-0">
				{isAuthenticated ? (
					<UserMenu />
				) : (
					<Link
						href="/login"
						className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
					>
						Iniciar sesión
					</Link>
				)}
				<HelpButton />
			</div>
		</div>
	);
}
