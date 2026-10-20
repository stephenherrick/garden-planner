export const initialGarden = {
  id: 'garden-1',
  name: 'Backyard garden',
  width: 24,
  height: 16,
  beds: [
    {
      id: 'bed-1',
      name: 'Kitchen garden',
      x: 1,
      y: 1,
      width: 8,
      height: 4,
      plants: [
        { id: 'plant-1', name: 'Tomatoes', x: 1, y: 1, width: 2, height: 2, color: '#d7765b' },
        { id: 'plant-2', name: 'Basil', x: 4, y: 1, width: 1, height: 1, color: '#77936b' },
      ],
    },
    {
      id: 'bed-2',
      name: 'Herb patch',
      x: 12,
      y: 2,
      width: 6,
      height: 3,
      plants: [
        { id: 'plant-3', name: 'Rosemary', x: 1, y: 1, width: 2, height: 2, color: '#8b9a74' },
      ],
    },
    {
      id: 'bed-3',
      name: 'Flower bed',
      x: 6,
      y: 8,
      width: 9,
      height: 4,
      plants: [
        { id: 'plant-4', name: 'Marigolds', x: 1, y: 1, width: 1, height: 1, color: '#e8a94f' },
        { id: 'plant-5', name: 'Zinnias', x: 4, y: 1, width: 2, height: 2, color: '#c98297' },
      ],
    },
  ],
};

export function createGarden(id, name) {
  return {
    id,
    name,
    width: 16,
    height: 12,
    beds: [],
  };
}

export function renameGarden(gardens, gardenId, name) {
  const normalizedName = String(name).trim();
  if (!normalizedName) throw new Error('Garden name cannot be empty.');
  if (normalizedName.length > 60) throw new Error('Garden name must be 60 characters or fewer.');

  return gardens.map((garden) => garden.id === gardenId
    ? { ...garden, name: normalizedName }
    : garden);
}

export function normalizeGardenCollection(saved) {
  if (Array.isArray(saved?.gardens)) {
    const validGardens = saved.gardens.filter((garden) => (
      garden
      && typeof garden.id === 'string'
      && typeof garden.name === 'string'
      && Number.isInteger(garden.width)
      && Number.isInteger(garden.height)
      && Array.isArray(garden.beds)
    ));
    if (validGardens.length > 0) {
      const activeGardenId = validGardens.some((garden) => garden.id === saved.activeGardenId)
        ? saved.activeGardenId
        : validGardens[0].id;
      return { gardens: validGardens, activeGardenId };
    }
  }

  if (
    saved
    && Number.isInteger(saved.width)
    && Number.isInteger(saved.height)
    && Array.isArray(saved.beds)
  ) {
    return {
      gardens: [{ ...saved, id: 'garden-1', name: 'Backyard garden' }],
      activeGardenId: 'garden-1',
    };
  }

  throw new Error('Saved garden data is invalid.');
}

export function removeGarden(gardens, activeGardenId, gardenId) {
  if (gardens.length <= 1 || !gardens.some((garden) => garden.id === gardenId)) {
    return { gardens, activeGardenId };
  }

  const gardenIndex = gardens.findIndex((garden) => garden.id === gardenId);
  const remainingGardens = gardens.filter((garden) => garden.id !== gardenId);
  const nextActiveGardenId = activeGardenId === gardenId
    ? remainingGardens[Math.min(gardenIndex, remainingGardens.length - 1)].id
    : activeGardenId;
  return { gardens: remainingGardens, activeGardenId: nextActiveGardenId };
}

export function clampBedToGarden(bed, gardenWidth, gardenHeight) {
  const width = Math.max(1, Math.min(bed.width, gardenWidth));
  const height = Math.max(1, Math.min(bed.height, gardenHeight));
  return {
    ...bed,
    width,
    height,
    x: Math.max(0, Math.min(bed.x, gardenWidth - width)),
    y: Math.max(0, Math.min(bed.y, gardenHeight - height)),
    plants: (bed.plants ?? []).map((plant) => placePlant(
      { ...bed, width, height },
      plant,
      plant.x,
      plant.y,
    )),
  };
}

export function moveBed(bed, x, y, gardenWidth, gardenHeight) {
  return clampBedToGarden({ ...bed, x, y }, gardenWidth, gardenHeight);
}

export function rotateBed(bed, gardenWidth, gardenHeight) {
  const rotated = {
    ...bed,
    width: bed.height,
    height: bed.width,
    plants: (bed.plants ?? []).map((plant) => ({
      ...plant,
      x: bed.height - plant.y - plant.height,
      y: plant.x,
      width: plant.height,
      height: plant.width,
    })),
  };
  return clampBedToGarden(rotated, gardenWidth, gardenHeight);
}

export function updateGardenSize(garden, width, height) {
  const nextWidth = Math.max(4, Math.min(60, Math.round(Number(width) || 4)));
  const nextHeight = Math.max(4, Math.min(60, Math.round(Number(height) || 4)));
  return {
    ...garden,
    width: nextWidth,
    height: nextHeight,
    beds: garden.beds.map((bed) => clampBedToGarden(bed, nextWidth, nextHeight)),
  };
}

export function createBed(id, beds) {
  const width = 6;
  const height = 4;
  const x = beds.length ? Math.min(1 + beds.length * 2, 60 - width) : 1;
  const y = beds.length ? Math.min(1 + beds.length * 2, 60 - height) : 1;
  return {
    id,
    name: `New bed ${beds.length + 1}`,
    x,
    y,
    width,
    height,
    plants: [],
  };
}

export function placePlant(bed, plant, x, y) {
  const width = Math.max(1, Math.min(Number(plant.width) || 1, bed.width));
  const height = Math.max(1, Math.min(Number(plant.height) || 1, bed.height));
  return {
    ...plant,
    x: Math.max(0, Math.min(x, bed.width - width)),
    y: Math.max(0, Math.min(y, bed.height - height)),
    width,
    height,
  };
}

export function normalizePlantCount(count) {
  const value = Math.round(Number(count) || 1);
  return Math.max(1, Math.min(999, value));
}
