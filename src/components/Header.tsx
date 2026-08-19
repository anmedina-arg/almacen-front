import { HeaderLogo } from './HeaderLogo';
import { HeaderClient } from './HeaderClient';

export function Header({ storeName }: { storeName: string }) {
	return <HeaderClient logo={<HeaderLogo />} storeName={storeName} />;
}
