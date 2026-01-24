const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const inputImage = path.join(__dirname, '../public/logo-og.png');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    // Create icons directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Generating PWA icons...');

    for (const size of sizes) {
      // Generate regular icon
      await sharp(inputImage)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(path.join(outputDir, `icon-${size}.png`));

      console.log(`✓ Generated icon-${size}.png`);

      // Generate maskable icon (with padding)
      const padding = Math.floor(size * 0.1); // 10% padding
      const innerSize = size - (padding * 2);

      await sharp(inputImage)
        .resize(innerSize, innerSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .extend({
          top: padding,
          bottom: padding,
          left: padding,
          right: padding,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(path.join(outputDir, `icon-${size}-maskable.png`));

      console.log(`✓ Generated icon-${size}-maskable.png`);
    }

    // Generate favicon
    await sharp(inputImage)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon.ico'));

    console.log('✓ Generated favicon.ico');

    // Generate apple touch icon
    await sharp(inputImage)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, 'apple-touch-icon.png'));

    console.log('✓ Generated apple-touch-icon.png');

    console.log('\n✅ All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
