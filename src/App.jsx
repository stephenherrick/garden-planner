import { useEffect, useState } from 'react';
import {
  clampBedToGarden,
  createBed,
  createGarden,
  initialGarden,
  moveBed,
  normalizeGardenCollection,
  normalizePlantCount,
  placePlant,
  removeGarden,
  renameGarden,
  rotateBed,
  updateGardenSize,
} from './garden.js';

const STORAGE_KEY = 'fieldnotes-garden';
const CELL_SIZE = 38;

function loadGardens() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return { gardens: [initialGarden], activeGardenId: initialGarden.id };
    return normalizeGardenCollection(JSON.parse(saved));
  } catch (error) {
    console.error('Unable to load your saved garden.', error);
    return { gardens: [initialGarden], activeGardenId: initialGarden.id };
  }
}

function App() {
  const [savedGardens] = useState(loadGardens);
  const [gardens, setGardens] = useState(savedGardens.gardens);
  const [activeGardenId, setActiveGardenId] = useState(savedGardens.activeGardenId);
  const [selectedBedId, setSelectedBedId] = useState(null);
  const activeGarden = gardens.find((item) => item.id === activeGardenId) ?? gardens[0];
  const [gardenWidth, setGardenWidth] = useState(String(activeGarden.width));
  const [gardenHeight, setGardenHeight] = useState(String(activeGarden.height));
  const [selectedPlantId, setSelectedPlantId] = useState(null);
  const [draggedBedId, setDraggedBedId] = useState(null);
  const [renamingGarden, setRenamingGarden] = useState(false);
  const [gardenNameDraft, setGardenNameDraft] = useState('');
  const [gardenNameError, setGardenNameError] = useState('');

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ gardens, activeGardenId }));
  }, [gardens, activeGardenId]);

  const garden = activeGarden;
  const selectedBed = garden.beds.find((bed) => bed.id === selectedBedId);

  function updateBed(bedId, update) {
    setGardens((current) => current.map((item) => item.id === activeGardenId
      ? {
        ...item,
        beds: item.beds.map((bed) => bed.id === bedId
          ? clampBedToGarden({ ...bed, ...update }, item.width, item.height)
          : bed),
      }
      : item));
  }

  function updatePlant(bedId, plantId, update) {
    setGardens((current) => current.map((item) => item.id === activeGardenId
      ? {
        ...item,
        beds: item.beds.map((bed) => bed.id === bedId
          ? {
            ...bed,
            plants: bed.plants.map((plant) => plant.id === plantId ? { ...plant, ...update } : plant),
          }
          : bed),
      }
      : item));
  }

  function addBed() {
    const bed = createBed(`bed-${Date.now()}`, garden.beds);
    setGardens((current) => current.map((item) => item.id === activeGardenId
      ? { ...item, beds: [...item.beds, bed] }
      : item));
    setSelectedBedId(bed.id);
  }

  function addGarden() {
    let gardenNumber = gardens.length + 1;
    while (gardens.some((item) => item.name === `Garden ${gardenNumber}`)) gardenNumber += 1;
    const newGarden = createGarden(`garden-${Date.now()}-${gardens.length}`, `Garden ${gardenNumber}`);
    setGardens((current) => [...current, newGarden]);
    setActiveGardenId(newGarden.id);
    setGardenWidth(String(newGarden.width));
    setGardenHeight(String(newGarden.height));
    setSelectedBedId(null);
    setSelectedPlantId(null);
    setGardenNameDraft(newGarden.name);
    setGardenNameError('');
    setRenamingGarden(true);
  }

  function startRenamingGarden() {
    setGardenNameDraft(garden.name);
    setGardenNameError('');
    setRenamingGarden(true);
  }

  function saveGardenName(event) {
    event.preventDefault();
    try {
      const renamedGardens = renameGarden(gardens, activeGardenId, gardenNameDraft);
      setGardens(renamedGardens);
      setRenamingGarden(false);
      setGardenNameError('');
    } catch (error) {
      setGardenNameError(error.message);
    }
  }

  function cancelRenamingGarden() {
    setRenamingGarden(false);
    setGardenNameError('');
  }

  function selectGarden(gardenId) {
    const nextGarden = gardens.find((item) => item.id === gardenId);
    if (!nextGarden) return;
    setActiveGardenId(nextGarden.id);
    setGardenWidth(String(nextGarden.width));
    setGardenHeight(String(nextGarden.height));
    setSelectedBedId(null);
    setSelectedPlantId(null);
  }

  function deleteActiveGarden() {
    if (gardens.length <= 1) return;
    if (!window.confirm(`Delete "${garden.name}" and all of its beds and plants? This cannot be undone.`)) return;
    const next = removeGarden(gardens, activeGardenId, activeGardenId);
    setGardens(next.gardens);
    setActiveGardenId(next.activeGardenId);
    const nextGarden = next.gardens.find((item) => item.id === next.activeGardenId);
    setGardenWidth(String(nextGarden.width));
    setGardenHeight(String(nextGarden.height));
    setSelectedBedId(null);
    setSelectedPlantId(null);
  }

  function addPlant() {
    const id = `plant-${Date.now()}`;
    const plant = placePlant(
      selectedBed,
      { id, name: 'New plant', count: 1, width: 1, height: 1, color: '#8b9a74' },
      0,
      0,
    );
    updateBed(selectedBed.id, { plants: [...selectedBed.plants, plant] });
    setSelectedPlantId(id);
  }

  function rotateSelectedBed() {
    if (!selectedBed) return;
    const rotated = rotateBed(selectedBed, garden.width, garden.height);
    updateBed(selectedBed.id, rotated);
  }

  function resizeGarden(event) {
    event.preventDefault();
    const nextWidth = Number(gardenWidth);
    const nextHeight = Number(gardenHeight);
    if (!Number.isFinite(nextWidth) || !Number.isFinite(nextHeight)) return;
    const nextGarden = updateGardenSize(garden, nextWidth, nextHeight);
    setGardens((current) => current.map((item) => item.id === activeGardenId ? nextGarden : item));
    setGardenWidth(String(nextGarden.width));
    setGardenHeight(String(nextGarden.height));
  }

  function dropBed(event) {
    event.preventDefault();
    const bedId = event.dataTransfer.getData('text/plain') || draggedBedId;
    const bed = garden.beds.find((item) => item.id === bedId);
    if (!bed) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.floor((event.clientX - bounds.left) / CELL_SIZE);
    const y = Math.floor((event.clientY - bounds.top) / CELL_SIZE);
    const movedBed = moveBed(bed, x, y, garden.width, garden.height);
    updateBed(bedId, { x: movedBed.x, y: movedBed.y });
    setDraggedBedId(null);
  }

  function closeEditor() {
    setSelectedBedId(null);
    setSelectedPlantId(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="Fieldnotes home">
          <span className="brand-mark" aria-hidden="true">f.</span>
          <span>fieldnotes</span>
        </a>

        <div className="sidebar-label">YOUR GARDENS</div>
        <nav className="garden-list" aria-label="Your gardens">
          {gardens.map((item) => (
            <button
              key={item.id}
              className={`garden-nav ${item.id === activeGardenId ? 'active' : ''}`}
              aria-current={item.id === activeGardenId ? 'page' : undefined}
              onClick={() => selectGarden(item.id)}
            >
              <span aria-hidden="true">▦</span>
              <span className="garden-nav-name">{item.name}</span>
              <span className="nav-count">{item.beds.length}</span>
            </button>
          ))}
        </nav>
        <button className="sidebar-add-garden" onClick={addGarden}>＋ New garden</button>

        <div className="sidebar-note">
          <span className="note-icon" aria-hidden="true">✳</span>
          <p>A little planning goes a long way.</p>
          <span>Make room for something good.</span>
        </div>

        <div className="sidebar-profile">
          <div className="avatar">S</div>
          <div><strong>Sunny side</strong><span>Zone 7b · Portland, OR</span></div>
          <span className="profile-menu" aria-hidden="true">···</span>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="breadcrumb-label">My spaces</span>
            <span>/</span>
            <strong>{garden.name}</strong>
            <select
              className="garden-picker"
              aria-label="Select garden"
              value={activeGardenId}
              onChange={(event) => selectGarden(event.target.value)}
            >
              {gardens.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div className="top-actions">
            <button className="mobile-add-garden" onClick={addGarden}>＋ Garden</button>
            <span className="saved-indicator"><span /> Saved to this device</span>
            <button className="icon-button" aria-label="More options">···</button>
          </div>
        </header>

        <section className="page-heading">
          <div>
            <div className="eyebrow"><span className="sun-icon" aria-hidden="true">☼</span> YOUR GARDEN PLAN</div>
            {renamingGarden ? (
              <form className="garden-name-form" onSubmit={saveGardenName}>
                <label className="visually-hidden" htmlFor="garden-name">Garden name</label>
                <input
                  id="garden-name"
                  aria-label="Garden name"
                  autoFocus
                  maxLength="60"
                  value={gardenNameDraft}
                  onChange={(event) => {
                    setGardenNameDraft(event.target.value);
                    setGardenNameError('');
                  }}
                />
                <button className="save-garden-name" type="submit">Save name</button>
                <button className="cancel-garden-name" type="button" onClick={cancelRenamingGarden}>Cancel</button>
                {gardenNameError && <span className="garden-name-error" role="alert">{gardenNameError}</span>}
              </form>
            ) : (
              <div className="garden-title">
                <h1>{garden.name}</h1>
                <button className="rename-garden-button" aria-label="Rename garden" onClick={startRenamingGarden}>Edit name</button>
              </div>
            )}
            <p className="heading-description">A little patch of possibility. Make it yours.</p>
          </div>
          <div className="garden-actions">
            <button className="delete-garden-button" onClick={deleteActiveGarden} disabled={gardens.length === 1}>
              Delete garden
            </button>
            <button className="primary-button" onClick={addBed}><span aria-hidden="true">＋</span> Add bed</button>
          </div>
        </section>

        <form className="garden-settings" onSubmit={resizeGarden}>
          <div className="settings-copy">
            <span className="settings-icon" aria-hidden="true">⌗</span>
            <div><strong>Garden size</strong><span>Set the footprint of your growing space</span></div>
          </div>
          <div className="size-fields">
            <label>Width <div className="number-input"><input aria-label="Garden width" type="number" min="4" max="60" value={gardenWidth} onChange={(event) => setGardenWidth(event.target.value)} /><span>ft</span></div></label>
            <span className="multiply">×</span>
            <label>Length <div className="number-input"><input aria-label="Garden height" type="number" min="4" max="60" value={gardenHeight} onChange={(event) => setGardenHeight(event.target.value)} /><span>ft</span></div></label>
            <button className="small-button" type="submit">Update garden size</button>
          </div>
        </form>

        <section className="garden-section">
          <div className="section-heading">
            <div>
              <h2>Your garden map <span className="bed-count">{garden.beds.length} beds</span></h2>
              <p>Drag a bed to move it. Select one to plan what grows inside.</p>
            </div>
            <span className="map-dimensions">{garden.width} × {garden.height} ft</span>
          </div>
          <div className="map-frame">
            <div className="map-toolbar">
              <span><i className="legend-bed" /> Garden beds</span>
              <span className="map-scale">Each square = 1 ft</span>
            </div>
            <div className="map-scroll">
              <div
                className="garden-board"
                data-testid="garden-board"
                style={{
                  gridTemplateColumns: `repeat(${garden.width}, ${CELL_SIZE - 2}px)`,
                  gridTemplateRows: `repeat(${garden.height}, ${CELL_SIZE - 2}px)`,
                  columnGap: '2px',
                  rowGap: '2px',
                  backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={dropBed}
              >
                {garden.beds.map((bed) => (
                  <button
                    key={bed.id}
                    className={`garden-bed ${selectedBedId === bed.id ? 'is-selected' : ''}`}
                    aria-label={`${bed.name}, ${bed.width} by ${bed.height} feet`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', bed.id);
                      event.dataTransfer.effectAllowed = 'move';
                      setDraggedBedId(bed.id);
                    }}
                    onDragEnd={() => setDraggedBedId(null)}
                    onClick={() => setSelectedBedId(bed.id)}
                    style={{
                      gridColumn: `${bed.x + 1} / span ${bed.width}`,
                      gridRow: `${bed.y + 1} / span ${bed.height}`,
                    }}
                  >
                    <span className="bed-handle" aria-hidden="true">⠿</span>
                    <span className="bed-name">{bed.name}</span>
                    <span className="bed-size">{bed.width} × {bed.height} ft</span>
                    <span className="bed-plants" aria-hidden="true">
                      {bed.plants.map((plant) => (
                        <i
                          key={plant.id}
                          title={`${plant.name}${normalizePlantCount(plant.count) > 1 ? ` group of ${normalizePlantCount(plant.count)}` : ''} · ${plant.width} × ${plant.height} ft mature size`}
                          style={{
                            backgroundColor: plant.color,
                            left: `${(plant.x / bed.width) * 100}%`,
                            top: `${(plant.y / bed.height) * 100}%`,
                            width: `${(plant.width / bed.width) * 100}%`,
                            height: `${(plant.height / bed.height) * 100}%`,
                          }}
                        />
                      ))}
                    </span>
                  </button>
                ))}
                {garden.beds.length === 0 && (
                  <div className="empty-map">
                    <span aria-hidden="true">✳</span>
                    <strong>Your garden is a blank canvas</strong>
                    <span>Add your first bed to get growing.</span>
                  </div>
                )}
              </div>
            </div>
            <div className="map-footer"><span><i className="legend-plant" /> Plant canopy at maturity</span><span>Click a bed to get started <b>↗</b></span></div>
          </div>
        </section>

        <footer className="page-footer"><span>GROW AT YOUR OWN PACE</span><span>Good things take root. <b>✳</b></span></footer>
      </main>

      {selectedBed && (
        <BedEditor
          bed={selectedBed}
          selectedPlantId={selectedPlantId}
          onClose={closeEditor}
          onUpdate={(update) => updateBed(selectedBed.id, update)}
          onAddPlant={addPlant}
          onRotate={rotateSelectedBed}
          onUpdatePlant={(plantId, update) => updatePlant(selectedBed.id, plantId, update)}
          onSelectPlant={setSelectedPlantId}
        />
      )}
    </div>
  );
}

function BedEditor({ bed, selectedPlantId, onClose, onUpdate, onAddPlant, onRotate, onUpdatePlant, onSelectPlant }) {
  const selectedPlant = bed.plants.find((plant) => plant.id === selectedPlantId);
  const totalPlantCount = bed.plants.reduce((total, plant) => total + normalizePlantCount(plant.count), 0);

  function changePlantPosition(x, y) {
    if (!selectedPlant) return;
    const positioned = placePlant(bed, selectedPlant, x, y);
    onUpdatePlant(selectedPlant.id, { x: positioned.x, y: positioned.y });
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="bed-editor" role="dialog" aria-modal="true" aria-labelledby="editor-title" aria-label={bed.name}>
        <div className="editor-top">
          <div><span className="editor-kicker">GARDEN BED</span><span className="editor-bed-number">{bed.name}</span></div>
          <button className="icon-button" aria-label="Close bed editor" onClick={onClose}>×</button>
        </div>
        <div className="editor-heading">
          <span className="editor-sprout" aria-hidden="true">♧</span>
          <h2 id="editor-title">{bed.name}</h2>
          <p>Give this little plot a plan.</p>
        </div>
        <div className="editor-form">
          <label className="field-label" htmlFor="bed-name">Bed name</label>
          <input id="bed-name" className="text-input" value={bed.name} onChange={(event) => onUpdate({ name: event.target.value })} />
          <div className="bed-size-fields">
            <label htmlFor="bed-width">Width <span>feet</span><input id="bed-width" aria-label="Bed width" type="number" min="1" max="60" value={bed.width} onChange={(event) => onUpdate({ width: Number(event.target.value) || 1 })} /></label>
            <label htmlFor="bed-height">Length <span>feet</span><input id="bed-height" aria-label="Bed length" type="number" min="1" max="60" value={bed.height} onChange={(event) => onUpdate({ height: Number(event.target.value) || 1 })} /></label>
          </div>
        </div>
        <button className="rotate-bed-button" aria-label="Rotate bed 90 degrees" onClick={onRotate}>
          <span aria-hidden="true">↻</span> Rotate bed 90°
        </button>

        <div className="plants-heading"><div><h3>What’s growing here?</h3><span>{totalPlantCount} {totalPlantCount === 1 ? 'plant' : 'plants'} planned</span></div>
          <button className="add-plant-button" onClick={onAddPlant}>＋ Add plant</button>
        </div>
        {bed.plants.length === 0 ? (
          <div className="empty-plants"><span aria-hidden="true">♧</span><span>No plants just yet. Add one and start imagining.</span></div>
        ) : (
          <>
            <div className="plant-list">
              {bed.plants.map((plant) => (
                <div key={plant.id} className={`plant-row ${selectedPlantId === plant.id ? 'plant-active' : ''}`}>
                  <button className="plant-color" aria-label={`Select ${plant.name}`} onClick={() => onSelectPlant(plant.id)} style={{ backgroundColor: plant.color }} />
                  <label className="plant-name-field"><span className="visually-hidden">Plant name</span>
                    <input aria-label="Plant name" value={plant.name} onChange={(event) => onUpdatePlant(plant.id, { name: event.target.value })} onFocus={() => onSelectPlant(plant.id)} />
                    <small>{normalizePlantCount(plant.count)} {normalizePlantCount(plant.count) === 1 ? 'plant' : 'plants'} · {plant.width} × {plant.height} ft</small>
                  </label>
                  <button className="plant-edit" aria-label={`Place ${plant.name}`} onClick={() => onSelectPlant(plant.id)}>↗</button>
                </div>
              ))}
            </div>
            <div className="plant-count-field">
              <label htmlFor="plant-count">Number of plants in this group</label>
              <input
                id="plant-count"
                aria-label="Plant count"
                type="number"
                min="1"
                max="999"
                value={normalizePlantCount(selectedPlant?.count)}
                onChange={(event) => {
                  if (selectedPlant) {
                    onUpdatePlant(selectedPlant.id, { count: normalizePlantCount(event.target.value) });
                  }
                }}
              />
              <span>Count together as one group in this bed.</span>
            </div>
            <div className="mature-size-fields">
              <div><strong>Mature size</strong><span>Approximate canopy footprint</span></div>
              <label>W <input aria-label="Mature width" type="number" min="1" max={bed.width} value={selectedPlant?.width ?? 1} onChange={(event) => {
                if (selectedPlant) {
                  const next = placePlant(bed, { ...selectedPlant, width: Number(event.target.value) || 1 }, selectedPlant.x, selectedPlant.y);
                  onUpdatePlant(selectedPlant.id, { width: next.width, x: next.x });
                }
              }} /></label>
              <span className="multiply">×</span>
              <label>D <input aria-label="Mature depth" type="number" min="1" max={bed.height} value={selectedPlant?.height ?? 1} onChange={(event) => {
                if (selectedPlant) {
                  const next = placePlant(bed, { ...selectedPlant, height: Number(event.target.value) || 1 }, selectedPlant.x, selectedPlant.y);
                  onUpdatePlant(selectedPlant.id, { height: next.height, y: next.y });
                }
              }} /></label>
              <span className="feet-unit">ft</span>
            </div>
            <div className="placement-help">{selectedPlant ? `Click a square to place ${selectedPlant.name}.` : 'Select a plant to change its position.'}</div>
            <div className="bed-preview-scroll">
              <div
                className="bed-preview"
                style={{
                  gridTemplateColumns: `repeat(${bed.width}, 40px)`,
                  gridTemplateRows: `repeat(${bed.height}, 40px)`,
                }}
              >
                {Array.from({ length: bed.width * bed.height }, (_, index) => {
                  const x = index % bed.width;
                  const y = Math.floor(index / bed.width);
                  return <button key={`${x}-${y}`} aria-label={`Place at ${x + 1}, ${y + 1}`} onClick={() => changePlantPosition(x, y)} />;
                })}
                {bed.plants.map((plant) => (
                  <button
                    key={plant.id}
                    className={`plant-footprint ${plant.id === selectedPlantId ? 'footprint-selected' : ''}`}
                    aria-label={`${plant.name}${normalizePlantCount(plant.count) > 1 ? ` group of ${normalizePlantCount(plant.count)}` : ''} footprint ${plant.width} by ${plant.height} feet`}
                    title={`${plant.name}${normalizePlantCount(plant.count) > 1 ? ` group of ${normalizePlantCount(plant.count)}` : ''}: ${plant.width} × ${plant.height} ft when grown`}
                    onClick={() => onSelectPlant(plant.id)}
                    style={{
                      backgroundColor: `${plant.color}b8`,
                      gridColumn: `${plant.x + 1} / span ${plant.width}`,
                      gridRow: `${plant.y + 1} / span ${plant.height}`,
                    }}
                  >
                    {normalizePlantCount(plant.count) > 1 && (
                      <span>×{normalizePlantCount(plant.count)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="editor-bottom"><span>Plants are shown at mature size</span><button className="done-button" onClick={onClose}>Done</button></div>
      </section>
    </div>
  );
}

export default App;
