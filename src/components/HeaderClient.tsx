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
				.select('avatar_url, full_name')
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
				className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl hover:bg-gray-100 transition-colors"
				aria-expanded={open}
				aria-haspopup="true"
			>
				{avatarUrl ? (
					<div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
						<Image src={avatarUrl} alt={displayName} width={40} height={40} className="rounded-full object-cover" />
					</div>
				) : (
					<div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
						{initials}
					</div>
				)}
				<span className="text-xs font-medium text-gray-700">{displayName}</span>
			</button>

			{/* Dropdown */}
			{open && (
				<div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
					<div className="px-3 py-2 border-b border-gray-100">
						<p className="text-xs text-gray-400">Sesión iniciada como</p>
						<p className="text-sm font-medium text-gray-700 truncate">{displayName}</p>
					</div>
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
		<div className="flex items-start justify-between gap-3 px-3 mt-2 py-2 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
			{/* Izquierda: logo + título */}
			<div className="flex items-center gap-2 flex-1 min-w-0">
				{logo}
				<h1 className="text-xl font-bold leading-tight">Market del Cevil</h1>
			</div>

			{/* Derecha: ayuda arriba, perfil debajo */}
			<div className="flex flex-col items-end gap-1 flex-shrink-0">
				<HelpButton />
				{isAuthenticated ? (
					<UserMenu />
				) : (
					<Link
						href="/login"
						className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors mt-1"
					>
						Iniciar sesión
					</Link>
				)}
			</div>
		</div>
	);
}
