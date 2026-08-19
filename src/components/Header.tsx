import { HeaderLogo } from './HeaderLogo';
import { HeaderClient } from './HeaderClient';

interface HeaderProps {
	storeName: string;
	logoUrl: string | null;
}

export function Header({ storeName, logoUrl }: HeaderProps) {
	return (
		<HeaderClient
			logo={<HeaderLogo logoUrl={logoUrl} storeName={storeName} />}
			storeName={storeName}
		/>
	);
}
