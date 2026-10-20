import {
  clampBedToGarden,
  createBed,
  createGarden,
  initialGarden,
  moveBed,
  normalizePlantCount,
  normalizeGardenCollection,
  placePlant,
  removeGarden,
  renameGarden,
  rotateBed,
  updateGardenSize,
} from './garden.js';

describe('garden layout helpers', () => {
  test('creates an empty garden with its own dimensions and name', () => {
    expect(createGarden('garden-2', 'Front garden')).toEqual({
      id: 'garden-2',
      name: 'Front garden',
      width: 16,
      height: 12,
      beds: [],
    });
  });

  test('renames a garden and trims surrounding whitespace', () => {
    const secondGarden = createGarden('garden-2', 'Garden 2');
    expect(renameGarden([initialGarden, secondGarden], secondGarden.id, '  Front yard  '))
      .toEqual([initialGarden, { ...secondGarden, name: 'Front yard' }]);
  });

  test('rejects empty or excessively long garden names', () => {
    expect(() => renameGarden([initialGarden], initialGarden.id, '  ')).toThrow('Garden name cannot be empty.');
    expect(() => renameGarden([initialGarden], initialGarden.id, 'a'.repeat(61)))
      .toThrow('Garden name must be 60 characters or fewer.');
  });

  test('loads existing single-garden saves into the multi-garden format', () => {
    expect(normalizeGardenCollection(initialGarden)).toEqual({
      gardens: [{ ...initialGarden, id: 'garden-1', name: 'Backyard garden' }],
      activeGardenId: 'garden-1',
    });
  });

  test('restores the selected garden from a saved garden collection', () => {
    const secondGarden = createGarden('garden-2', 'Front garden');
    expect(normalizeGardenCollection({
      gardens: [initialGarden, secondGarden],
      activeGardenId: secondGarden.id,
    })).toEqual({
      gardens: [initialGarden, secondGarden],
      activeGardenId: secondGarden.id,
    });
  });

  test('removes the active garden and selects a remaining garden', () => {
    const secondGarden = createGarden('garden-2', 'Front garden');
    const result = removeGarden([initialGarden, secondGarden], 'garden-2', 'garden-2');

    expect(result).toEqual({
      gardens: [initialGarden],
      activeGardenId: initialGarden.id,
    });
  });

  test('keeps the active garden when a different garden is removed', () => {
    const secondGarden = createGarden('garden-2', 'Front garden');
    const result = removeGarden([initialGarden, secondGarden], initialGarden.id, secondGarden.id);

    expect(result).toEqual({ gardens: [initialGarden], activeGardenId: initialGarden.id });
  });

  test('does not remove the only garden', () => {
    expect(removeGarden([initialGarden], initialGarden.id, initialGarden.id)).toEqual({
      gardens: [initialGarden],
      activeGardenId: initialGarden.id,
    });
  });

  test('keeps a moved bed inside the garden boundaries', () => {
    const bed = moveBed(initialGarden.beds[0], 30, -2, 24, 16);

    expect(bed).toMatchObject({ x: 16, y: 0, width: 8, height: 4 });
  });

  test('shrinks and repositions beds when the garden is resized', () => {
    const garden = updateGardenSize(initialGarden, 6, 5);

    expect(garden).toMatchObject({ width: 6, height: 5 });
    expect(garden.beds[0]).toMatchObject({ x: 0, y: 1, width: 6, height: 4 });
    expect(garden.beds[1].x + garden.beds[1].width).toBeLessThanOrEqual(6);
    expect(garden.beds[1].y + garden.beds[1].height).toBeLessThanOrEqual(5);
  });

  test('limits garden dimensions to the supported range', () => {
    expect(updateGardenSize(initialGarden, 100, 2)).toMatchObject({ width: 60, height: 4 });
  });

  test('clamps bed dimensions and position to garden bounds', () => {
    expect(clampBedToGarden({ ...initialGarden.beds[0], x: 99 }, 10, 8))
      .toMatchObject({ x: 2, width: 8, y: 1 });
  });

  test('creates a new empty bed with a unique label', () => {
    expect(createBed('bed-4', initialGarden.beds)).toMatchObject({
      id: 'bed-4',
      name: 'New bed 4',
      width: 6,
      height: 4,
      plants: [],
    });
  });

  test('places a plant within a bed without exceeding its footprint', () => {
    expect(placePlant(
      initialGarden.beds[0],
      { id: 'plant-x', name: 'Peppers', width: 3, height: 2 },
      7,
      3,
    )).toMatchObject({ x: 5, y: 2, width: 3, height: 2 });
  });

  test('keeps plant footprints inside a bed when the bed is resized', () => {
    const resized = clampBedToGarden({
      ...initialGarden.beds[0],
      width: 2,
      height: 1,
    }, 24, 16);

    expect(resized.plants[0]).toMatchObject({ x: 0, y: 0, width: 2, height: 1 });
  });

  test('rotates a bed and its plant footprints clockwise', () => {
    const bed = rotateBed(initialGarden.beds[0], 24, 16);

    expect(bed).toMatchObject({ x: 1, y: 1, width: 4, height: 8 });
    expect(bed.plants[0]).toMatchObject({ x: 1, y: 1, width: 2, height: 2 });
    expect(bed.plants[1]).toMatchObject({ x: 2, y: 4, width: 1, height: 1 });
  });

  test('keeps a rotated bed within garden boundaries', () => {
    const bed = rotateBed({ ...initialGarden.beds[0], x: 22 }, 24, 16);

    expect(bed).toMatchObject({ x: 20, width: 4, height: 8 });
    expect(bed.x + bed.width).toBeLessThanOrEqual(24);
  });

  test('normalizes grouped plant counts to a whole number from 1 to 999', () => {
    expect(normalizePlantCount(14)).toBe(14);
    expect(normalizePlantCount(0)).toBe(1);
    expect(normalizePlantCount(12.7)).toBe(13);
    expect(normalizePlantCount(1200)).toBe(999);
  });
});
