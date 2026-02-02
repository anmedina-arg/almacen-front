'use client'

import Image from "next/image";
import { useState, useEffect } from "react";
import Link from "next/link";
import HelpButton from "./HelpButton";
import { useIsAuthenticated } from '@/features/auth/stores/authStore';
import { UserAvatar } from '@/features/auth/components/UserAvatar';
import { LogoutButton } from '@/features/auth/components/LogoutButton';

const Header = () => {
	const [isScrolled, setIsScrolled] = useState(false);
	const isAuthenticated = useIsAuthenticated();

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);
	return (
		<>
			{/* Header inicial (completo) */}
			<div
				className={`text-center justify-center items-center flex gap-2 transition-all duration-300 ${isScrolled ? "opacity-0 h-0 p-0" : "mb-0 mt-2 py-2"
					}`}
			>
				<Image
					src="https://res.cloudinary.com/dfwo3qi5q/image/upload/v1763599423/logo-og_pydhrd.png"
					alt="Market del cevil Logo"
					width={128}
					height={128}
					className="rounded-2xl"
				/>
				<div className="flex flex-col items-center gap-2">
					<h1 className="text-3xl font-bold">Market del Cevil</h1>
					<p className="text-sm max-w-md mx-auto text-balance">
						Selecciona los productos que quieres pedir y luego envía tu pedido por
						WhatsApp <HelpButton />
					</p>
					{/* Auth controls */}
					<div className="flex items-center gap-2 mt-1">
						{isAuthenticated ? (
							<>
								<UserAvatar />
								<LogoutButton />
							</>
						) : (
							<Link
								href="/login"
								className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
							>
								Iniciar sesión
							</Link>
						)}
					</div>
				</div>
			</div>

			{/* Header sticky (reducido) */}
			<div
				className={`sticky top-0 z-50 bg-white/80 backdrop-blur-md transition-all duration-300 ${isScrolled ? "py-2" : "opacity-0 h-0 p-0 pointer-events-none"
					}`}
			>
				<div className="flex items-center justify-between w-full px-2">
					<div className="flex items-center gap-2">
						<Image
							src="https://res.cloudinary.com/dfwo3qi5q/image/upload/v1763599423/logo-og_pydhrd.png"
							alt="Market del cevil Logo"
							width={32}
							height={32}
							className="rounded-lg"
						/>
						<h1 className="text-lg font-bold">Market del Cevil</h1>
					</div>
					{/* Auth controls */}
					<div className="flex items-center gap-2">
						{isAuthenticated ? (
							<>
								<UserAvatar />
								<LogoutButton />
							</>
						) : (
							<Link
								href="/login"
								className="text-sm text-green-600 hover:text-green-700 font-medium transition-colors"
							>
								Iniciar sesión
							</Link>
						)}
					</div>
				</div>
			</div>
		</>
	)
};

export default Header;