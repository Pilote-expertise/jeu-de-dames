const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = path.join(__dirname, 'www', 'icons', 'icon.svg');
const outputDir = path.join(__dirname, 'www', 'icons');

// Lire le SVG
const svgBuffer = fs.readFileSync(svgPath);

async function generateIcons() {
    for (const size of sizes) {
        const outputPath = path.join(outputDir, `icon-${size}.png`);
        await sharp(svgBuffer)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        console.log(`Créé: icon-${size}.png`);
    }
    console.log('Toutes les icônes ont été générées!');
}

generateIcons().catch(console.error);
