import Image from 'next/image';
import { getCloudinaryUrl } from '@/utils/cloudinaryUrl';

export function HeaderLogo() {
	return (
		<Image
			src={getCloudinaryUrl(
				'https://res.cloudinary.com/dfwo3qi5q/image/upload/v1763599423/logo-og_pydhrd.png',
				160,
			)}
			alt="Market del cevil Logo"
			width={72}
			height={72}
			className="rounded-2xl"
			priority
		/>
	);
}
