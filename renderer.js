const overlay = document.querySelector("#overlay");
const menuButton = document.querySelector("#menuButton");
const clearSelectionButton = document.querySelector("#clearSelectionButton");
const categoryMenu = document.querySelector("#categoryMenu");
const opacityInput = document.querySelector("#opacityInput");
const versionLabel = document.querySelector("#versionLabel");
const itemGrid = document.querySelector("#itemGrid");
const resizeHandle = document.querySelector("#resizeHandle");

const categoryLabels = {
  runes: "\uB8EC",
  rumors: "\uC18C\uBB38",
  tablets: "\uC11C\uD310 \uAD6C\uB9E4"
};

let state = {
  opacity: 0.8,
  category: "runes",
  selectedRunes: [],
  items: [],
  memo: ""
};

let runes = [];
let rumorData = { headers: [], items: [] };
let resizing = false;
let resizePointerId = null;
let compactHeight = 0;

const categoryBounds = {
  rumors: { width: 1250, height: 390 },
  tablets: { width: 900, height: 72 }
};

const runeLayout = {
  leftChromeWidth: 60,
  contentPaddingWidth: 16,
  resizeHandleWidth: 28,
  itemWidth: 52,
  itemGap: 6,
  minWidth: 360,
  height: 72
};

const tabletTradeUrl = "https://poe.kakaogames.com/trade2/search/poe2/Runes%20of%20Aldur/Lg7GOpn7tn";

function getCategoryBounds(category) {
  if (category === "runes") {
    const itemCount = Math.max(1, runes.length);
    const itemAreaWidth = itemCount * runeLayout.itemWidth + (itemCount - 1) * runeLayout.itemGap;
    const width =
      runeLayout.leftChromeWidth +
      runeLayout.contentPaddingWidth +
      runeLayout.resizeHandleWidth +
      itemAreaWidth;

    return {
      width: Math.max(runeLayout.minWidth, Math.ceil(width)),
      height: runeLayout.height
    };
  }

  return categoryBounds[category];
}

function runePath(file) {
  return `assets/runes/${encodeURIComponent(file)}`;
}

function displayRuneName(name) {
  return name
    .replace(/\uB8EC$/u, "")
    .replace(/\uD654\uC0B0\uC758$/u, "\uD654\uC0B0")
    .replace(/\uCC9C\uACF5\uC758$/u, "\uCC9C\uACF5")
    .replace(/\uD68C\uC624\uB9AC\uBC14\uB78C$/u, "\uD68C\uC624\uB9AC");
}

function normalizeCategory(category) {
  return categoryLabels[category] ? category : "runes";
}

function applyOpacity() {
  const opacity = Number(state.opacity ?? 0.8);
  overlay.style.setProperty("--background-opacity", opacity);
  opacityInput.value = Math.round(opacity * 100);
}

function setBarHeight(height) {
  overlay.style.setProperty("--bar-height", `${Math.max(72, Math.round(height))}px`);
}

async function save() {
  await window.overlayApi.saveChecklist(state);
}

function renderRuneItems() {
  itemGrid.innerHTML = "";

  if (runes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "\uB8EC \uC774\uBBF8\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.";
    itemGrid.appendChild(empty);
    return;
  }

  for (const rune of runes) {
    const item = document.createElement("div");
    item.className = "overlay-item";
    item.dataset.file = rune.file;

    const image = document.createElement("img");
    image.src = runePath(rune.file);
    image.alt = "";

    const label = document.createElement("div");
    label.className = "item-name";
    label.textContent = displayRuneName(rune.name);

    item.append(image, label);
    item.addEventListener("click", async () => {
      const selected = new Set(state.selectedRunes);

      if (selected.has(rune.file)) {
        selected.delete(rune.file);
      } else {
        selected.add(rune.file);
      }

      state.selectedRunes = [...selected];
      updateSelectedRune();
      await save();
    });
    itemGrid.appendChild(item);
  }

  updateSelectedRune();
}

function updateSelectedRune() {
  const selected = new Set(state.selectedRunes || []);

  for (const item of itemGrid.querySelectorAll(".overlay-item")) {
    item.classList.toggle("selected", selected.has(item.dataset.file));
  }
}

function renderPlaceholder(text) {
  itemGrid.innerHTML = "";

  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = text;
  itemGrid.appendChild(empty);
}

function renderRumorItems() {
  itemGrid.innerHTML = "";

  if (!rumorData.items.length) {
    renderPlaceholder("\uC18C\uBB38 \uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }

  const table = document.createElement("div");
  table.className = "rumor-table";

  const headers = rumorData.headers.length
    ? rumorData.headers
    : ["\uC18C\uBB38 (Rumor)", "\uC9C0\uB3C4 \uC885\uB958 (Map Type)", "\uC8FC\uC694 \uD2B9\uC9D5 / \uAE30\uBBF9 (Mods)"];

  for (const header of headers.slice(0, 3)) {
    const cell = document.createElement("div");
    cell.className = "rumor-cell rumor-header";
    cell.textContent = header;
    cell.title = header;
    table.appendChild(cell);
  }

  for (const rumor of rumorData.items) {
    const values = [rumor.rumor, rumor.mapType, rumor.mods];

    for (const [index, value] of values.entries()) {
      const cell = document.createElement("div");
      cell.className = "rumor-cell";
      cell.textContent = value || "";
      cell.title = value || "";

      if (index === 2 && value === "\uBC84\uADF8 \uB9F5") {
        cell.classList.add("bug-map");
      }

      table.appendChild(cell);
    }
  }

  itemGrid.appendChild(table);
}

function render() {
  state.category = normalizeCategory(state.category);
  document.body.dataset.category = state.category;

  if (state.category === "runes") {
    renderRuneItems();
    return;
  }

  if (state.category === "rumors") {
    renderRumorItems();
    return;
  }

  renderPlaceholder("\uC11C\uD310 \uAD6C\uB9E4 \uD56D\uBAA9 \uC900\uBE44 \uC911");
}

function closeMenu() {
  if (!categoryMenu.hidden) {
    window.overlayApi.setMenuOpen({ open: false, compactHeight });
  }

  categoryMenu.hidden = true;
}

menuButton.addEventListener("click", () => {
  if (categoryMenu.hidden) {
    compactHeight = window.innerHeight;
    setBarHeight(compactHeight);
    categoryMenu.hidden = false;
    window.overlayApi.setMenuOpen({ open: true, compactHeight });
    return;
  }

  closeMenu();
});

clearSelectionButton.addEventListener("click", async () => {
  state.selectedRunes = [];
  updateSelectedRune();
  await save();
});

categoryMenu.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-category]");
  if (!button) return;

  const nextCategory = button.dataset.category;

  if (nextCategory === "tablets") {
    await window.overlayApi.openExternal(tabletTradeUrl);
    closeMenu();
    return;
  }

  state.category = nextCategory;
  closeMenu();
  const bounds = getCategoryBounds(state.category);
  if (bounds) {
    compactHeight = bounds.height;
    setBarHeight(bounds.height);
    window.overlayApi.setCategoryBounds(bounds);
  }
  render();
  await save();
});

opacityInput.addEventListener("input", async () => {
  state.opacity = Number(opacityInput.value) / 100;
  applyOpacity();
  await save();
});

resizeHandle.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  closeMenu();
  resizing = true;
  resizePointerId = event.pointerId;
  document.body.classList.add("resizing");
  resizeHandle.setPointerCapture(resizePointerId);
});

window.addEventListener("pointermove", (event) => {
  if (!resizing) return;
  window.overlayApi.resizeWindowTo({
    screenX: event.screenX
  });
});

window.addEventListener("pointerup", () => {
  if (resizing) {
    setBarHeight(window.innerHeight);
  }

  resizing = false;
  document.body.classList.remove("resizing");

  if (resizePointerId !== null && resizeHandle.hasPointerCapture(resizePointerId)) {
    resizeHandle.releasePointerCapture(resizePointerId);
  }

  resizePointerId = null;
});

window.addEventListener("resize", () => {
  if (categoryMenu.hidden) {
    setBarHeight(window.innerHeight);
  }
});

document.addEventListener("click", (event) => {
  if (event.target.closest(".tool-strip")) return;
  closeMenu();
});

(async function init() {
  runes = await window.overlayApi.listRunes();
  rumorData = await window.overlayApi.listRumors();
  versionLabel.textContent = `v${await window.overlayApi.getAppVersion()}`;
  state = await window.overlayApi.loadChecklist();
  state.category = normalizeCategory(state.category || state.activeWindow);
  state.selectedRunes = Array.isArray(state.selectedRunes)
    ? state.selectedRunes
    : [state.selectedRune].filter(Boolean);
  delete state.selectedRune;
  state.opacity = Number(state.opacity ?? 0.8);
  const bounds = getCategoryBounds(state.category);
  if (bounds) {
    compactHeight = bounds.height;
    setBarHeight(bounds.height);
    window.overlayApi.setCategoryBounds(bounds);
  } else {
    compactHeight = window.innerHeight;
    setBarHeight(compactHeight);
  }
  applyOpacity();
  render();
  await save();
})();
