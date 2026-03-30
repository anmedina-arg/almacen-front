import { HeaderLogo } from './HeaderLogo';
import { HeaderClient } from './HeaderClient';

export function Header() {
	return <HeaderClient logo={<HeaderLogo />} />;
}
