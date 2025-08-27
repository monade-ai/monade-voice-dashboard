// Color palettes for organic art
export const organicPalettes = [
  { bg: '#ff9a9e', colors: ['#fecfef', '#a8edea', '#d299c2', '#ffd3a5'] },
  { bg: '#a8edea', colors: ['#fed6e3', '#d299c2', '#fef9d7', '#81c784'] },
  { bg: '#ffecd2', colors: ['#fcb69f', '#ff8a80', '#81c784', '#a8edea'] },
  { bg: '#d299c2', colors: ['#fdf2f8', '#a8e6cf', '#ffd3a5', '#fd9853'] },
  { bg: '#a8e6cf', colors: ['#dcedc1', '#ffd3a5', '#fd9853', '#ee9ca7'] },
  { bg: '#ffd3a5', colors: ['#fd9853', '#ee9ca7', '#a8edea', '#74b9ff'] },
  { bg: '#74b9ff', colors: ['#0984e3', '#a29bfe', '#fd79a8', '#fdcb6e'] },
  { bg: '#fd79a8', colors: ['#fdcb6e', '#6c5ce7', '#00cec9', '#55efc4'] },
  { bg: '#6c5ce7', colors: ['#a29bfe', '#fd79a8', '#00b894', '#74b9ff'] },
  { bg: '#00cec9', colors: ['#55efc4', '#74b9ff', '#fd79a8', '#a29bfe'] }
];

export const organicVariations = [
  {
    name: 'Flowing Bubbles',
    description: 'Large central bubble with smaller floating companions',
    pattern: 'bubbles'
  },
  {
    name: 'Liquid Layers', 
    description: 'Dominant layer with cascading smaller forms',
    pattern: 'layers'
  },
  {
    name: 'Organic Waves',
    description: 'Major wave with rippling smaller currents',
    pattern: 'waves'
  },
  {
    name: 'Morphing Blobs',
    description: 'Primary blob with satellite morphing shapes',
    pattern: 'morphing'
  },
  {
    name: 'Cellular Flow',
    description: 'Central cell with dividing smaller organisms',
    pattern: 'cellular'
  }
];

// Hash function for consistent results
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Get variation for a specific name
export function getVariationForName(name: string) {
  if (!name) return null;
  const hash = hashString(name.toLowerCase());
  const variationIndex = hash % organicVariations.length;
  const paletteIndex = hash % organicPalettes.length;
  return {
    ...organicVariations[variationIndex],
    palette: organicPalettes[paletteIndex],
    nameHash: hash,
    animationSpeed: 3 + (hash % 5)
  };
}

// Generate border radius for organic shapes
export function generateBorderRadius(pattern: string, index: number, seed: number): string {
  const random = (seed + index * 13) % 100;
  switch (pattern) {
    case 'bubbles':
      return `${40 + random % 30}% ${60 + random % 25}% ${30 + random % 40}% ${70 + random % 20}% / ${50 + random % 30}% ${30 + random % 25}% ${70 + random % 20}% ${40 + random % 35}%`;
    case 'layers':
      return `${60 + random % 25}% ${40 + random % 35}% ${30 + random % 30}% ${70 + random % 20}% / ${30 + random % 35}% ${30 + random % 30}% ${70 + random % 20}% ${40 + random % 30}%`;
    case 'waves':
      return `${20 + random % 50}% ${80 + random % 15}% ${25 + random % 40}% ${75 + random % 20}% / ${60 + random % 25}% ${20 + random % 35}% ${80 + random % 15}% ${30 + random % 35}%`;
    case 'morphing':
      return `${30 + random % 35}% ${70 + random % 20}% ${25 + random % 45}% ${75 + random % 20}% / ${40 + random % 35}% ${30 + random % 30}% ${70 + random % 20}% ${50 + random % 25}%`;
    case 'cellular':
      return `${45 + random % 25}% ${55 + random % 25}% ${35 + random % 35}% ${65 + random % 20}% / ${50 + random % 20}% ${40 + random % 30}% ${60 + random % 25}% ${45 + random % 30}%`;
    default:
      return '50%';
  }
}

// Generate concentric shapes data
export function generateConcentricShapes(
  variation: ReturnType<typeof getVariationForName>,
  size: 'circle' | 'square',
  name: string
) {
  const isSmall = size === 'circle';
  const dimension = isSmall ? 120 : 320;
  const shapes = [];
  const nameLength = name.length;
  const charSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

  // Calculate number of shapes (2-5 based on name)
  const shapeCount = Math.max(2, Math.min(5, 2 + (nameLength % 4)));

  // Generate the dominant large shape (60-80% of container)
  const largeSize = dimension * (0.6 + (charSum % 20) / 100);
  const largeCenterX = dimension * (0.4 + (charSum % 20) / 100);
  const largeCenterY = dimension * (0.4 + (charSum % 20) / 100);

  shapes.push({
    width: largeSize,
    height: largeSize * (0.8 + (charSum % 40) / 100),
    left: largeCenterX - largeSize/2,
    top: largeCenterY - largeSize/2,
    borderRadius: generateBorderRadius(variation.pattern, 0, charSum),
    zIndex: 1,
    scale: 1,
    colorIndex: 0
  });

  // Generate concentrically smaller shapes
  for (let i = 1; i < shapeCount; i++) {
    const scale = 1 - (i * 0.25); // Each shape 25% smaller
    const currentSize = largeSize * scale;

    // Position around the large shape with some randomness based on name
    const angle = ((charSum + i * 73) % 360) * (Math.PI / 180);
    const distance = dimension * (0.1 + (charSum % 15) / 100) * i;

    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;

    shapes.push({
      width: currentSize,
      height: currentSize * (0.7 + (charSum % 60) / 100),
      left: largeCenterX + offsetX - currentSize/2,
      top: largeCenterY + offsetY - currentSize/2,
      borderRadius: generateBorderRadius(variation.pattern, i, charSum + i * 17),
      zIndex: shapeCount - i + 1,
      scale: scale,
      colorIndex: i % variation.palette.colors.length
    });
  }

  return shapes;
}
