import Image from 'next/image';
import { getCloudinaryUrl } from '@/utils/cloudinaryUrl';
import { DEFAULT_LOGO_URL } from '@/lib/store/defaultLogo';

interface HeaderLogoProps {
	logoUrl: string | null;
	storeName: string;
}

export function HeaderLogo({ logoUrl, storeName }: HeaderLogoProps) {
	return (
		<Image
			src={getCloudinaryUrl(logoUrl ?? DEFAULT_LOGO_URL, 160)}
			alt={`${storeName} Logo`}
			width={72}
			height={72}
			className="rounded-2xl"
			priority
		/>
	);
}
