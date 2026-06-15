const frameCount = 6;

const apps = {
  "Online Class": { priority: "high", pages: 4, nextPage: 0 },
  "Document Editor": { priority: "high", pages: 3, nextPage: 0 },
  "Coding IDE": { priority: "high", pages: 4, nextPage: 0 },
  "PDF Viewer": { priority: "medium", pages: 2, nextPage: 0 },
  "File Explorer": { priority: "medium", pages: 2, nextPage: 0 },
  "File Transfer": { priority: "medium", pages: 3, nextPage: 0 },
  "Cloud Sync": { priority: "low", pages: 2, nextPage: 0 },
  "Software Updater": { priority: "low", pages: 3, nextPage: 0 },
  "Background Indexing": { priority: "low", pages: 3, nextPage: 0 }
};

let ramFrames = [];
let virtualMemory = [];
let pageTable = {};
let clock = 0;
let hits = 0;
let faults = 0;
let replacements = 0;
let eventLog = [];

function initializeSimulator() {
  ramFrames = Array.from({ length: frameCount }, (_, index) => ({ frame: index, pageKey: null }));
  virtualMemory = [];
  pageTable = {};
  clock = 0;
  hits = 0;
  faults = 0;
  replacements = 0;
  eventLog = [];

  Object.keys(apps).forEach(appName => {
    apps[appName].nextPage = 0;
    for (let page = 0; page < apps[appName].pages; page++) {
      const key = getPageKey(appName, page);
      pageTable[key] = {
        appName,
        page,
        priority: apps[appName].priority,
        status: "Not Loaded",
        location: "-",
        lastUsed: "-"
      };
    }
  });

  renderAll();
}

function requestNextPage(appName) {
  const app = apps[appName];
  const pageNumber = app.nextPage;
  app.nextPage = (app.nextPage + 1) % app.pages;
  requestPage(appName, pageNumber);
}

function requestPage(appName, pageNumber) {
  clock++;
  const key = getPageKey(appName, pageNumber);
  const page = pageTable[key];

  if (page.status === "RAM") {
    hits++;
    page.lastUsed = clock;
    eventLog.unshift(`Step ${clock}: PAGE HIT — ${appName} Page ${pageNumber} is already in RAM.`);
    renderAll();
    return;
  }

  faults++;
  eventLog.unshift(`Step ${clock}: PAGE FAULT — ${appName} Page ${pageNumber} is not in RAM.`);

  const freeFrame = ramFrames.find(frame => frame.pageKey === null);

  if (freeFrame) {
    loadPageIntoFrame(key, freeFrame.frame);
    eventLog.unshift(`Step ${clock}: Loaded ${appName} Page ${pageNumber} into Frame ${freeFrame.frame}.`);
  } else {
    replaceLRUPage(key);
  }

  renderAll();
}

function replaceLRUPage(newPageKey) {
  let lruFrame = null;
  let lruPage = null;

  ramFrames.forEach(frame => {
    const currentPage = pageTable[frame.pageKey];
    if (lruPage === null || currentPage.lastUsed < lruPage.lastUsed) {
      lruPage = currentPage;
      lruFrame = frame;
    }
  });

  const oldKey = lruFrame.pageKey;
  const oldPage = pageTable[oldKey];
  oldPage.status = "Virtual Memory";
  oldPage.location = "Swap Space";
  virtualMemory.push(oldKey);

  replacements++;
  eventLog.unshift(`Step ${clock}: LRU replaced ${oldPage.appName} Page ${oldPage.page} and moved it to Virtual Memory.`);

  loadPageIntoFrame(newPageKey, lruFrame.frame);
  const newPage = pageTable[newPageKey];
  eventLog.unshift(`Step ${clock}: Loaded ${newPage.appName} Page ${newPage.page} into Frame ${lruFrame.frame}.`);
}

function loadPageIntoFrame(pageKey, frameNumber) {
  virtualMemory = virtualMemory.filter(key => key !== pageKey);
  ramFrames[frameNumber].pageKey = pageKey;
  const page = pageTable[pageKey];
  page.status = "RAM";
  page.location = `Frame ${frameNumber}`;
  page.lastUsed = clock;
}

function accessRandomPage() {
  const appNames = Object.keys(apps);
  const randomApp = appNames[Math.floor(Math.random() * appNames.length)];
  const randomPage = Math.floor(Math.random() * apps[randomApp].pages);
  requestPage(randomApp, randomPage);
}

function runSample() {
  function memoryPriorityHelp(priority) {
  if (priority === "high") {
    return "High Priority: academic app pages are important and should stay responsive.";
  }

  if (priority === "medium") {
    return "Medium Priority: productivity app pages are useful but less urgent than active academic pages.";
  }

  return "Low Priority: background app pages can be moved to virtual memory first when RAM is full.";
}

initializeSimulator();

  const sampleSequence = [
    ["Online Class", 0],
    ["Document Editor", 0],
    ["PDF Viewer", 0],
    ["Online Class", 1],
    ["Cloud Sync", 0],
    ["Coding IDE", 0],
    ["File Transfer", 0],
    ["Document Editor", 1],
    ["Online Class", 0],
    ["Software Updater", 0],
    ["PDF Viewer", 1],
    ["Coding IDE", 1]
  ];
  sampleSequence.forEach(([appName, page]) => requestPage(appName, page));
}

function resetSimulator() { function memoryPriorityHelp(priority) {
  if (priority === "high") {
    return "High Priority: academic app pages are important and should stay responsive.";
  }

  if (priority === "medium") {
    return "Medium Priority: productivity app pages are useful but less urgent than active academic pages.";
  }

  return "Low Priority: background app pages can be moved to virtual memory first when RAM is full.";
}

initializeSimulator(); }

function renderAll() {
  renderAppTable();
  renderRamFrames();
  renderVirtualMemory();
  renderPageTable();
  renderMetrics();
  renderEventLog();
}

function renderAppTable() {
  const table = document.getElementById("appTable");
  table.innerHTML = Object.keys(apps).map(appName => {
    const app = apps[appName];
    return `
      <tr>
        <td><strong>${appName}</strong></td>
        <td><span class="tag priority-${app.priority}" title="${memoryPriorityHelp(app.priority)}">${capitalize(app.priority)}</span></td>
        <td>${app.pages}</td>
        <td>Page ${app.nextPage}</td>
      </tr>
    `;
  }).join("");
}

function renderRamFrames() {
  const container = document.getElementById("ramFrames");
  container.innerHTML = ramFrames.map(frame => {
    if (frame.pageKey === null) {
      return `
        <div class="frame">
          <div class="frame-title">Frame ${frame.frame}</div>
          <div class="empty-frame">Free</div>
        </div>
      `;
    }
    const page = pageTable[frame.pageKey];
    return `
      <div class="frame frame-${page.priority}" title="${memoryPriorityHelp(page.priority)}">
        <div class="frame-title">Frame ${frame.frame}</div>
        <div class="frame-page">${page.appName}</div>
        <div class="frame-detail">Page ${page.page}</div>
        <div class="frame-detail">Last Used: Step ${page.lastUsed}</div>
      </div>
    `;
  }).join("");
}

function renderVirtualMemory() {
  const container = document.getElementById("virtualMemory");
  if (virtualMemory.length === 0) {
    container.innerHTML = '<span class="empty">No pages in virtual memory yet.</span>';
    return;
  }
  container.innerHTML = virtualMemory.map(key => {
    const page = pageTable[key];
    return `<span class="swap-page" title="This page was moved to virtual memory because RAM needed space.">${page.appName} - Page ${page.page}</span>`;
  }).join("");
}

function renderPageTable() {
  const table = document.getElementById("pageTable");
  table.innerHTML = Object.values(pageTable).map(page => {
    let statusClass = "status-notloaded";
    if (page.status === "RAM") statusClass = "status-ram";
    if (page.status === "Virtual Memory") statusClass = "status-swap";
    const lastUsed = page.lastUsed === "-" ? "-" : `Step ${page.lastUsed}`;
    return `
      <tr>
        <td><strong>${page.appName}</strong></td>
        <td>Page ${page.page}</td>
        <td class="${statusClass}">${page.status}</td>
        <td>${page.location}</td>
        <td>${lastUsed}</td>
      </tr>
    `;
  }).join("");
}

function renderMetrics() {
  const usedFrames = ramFrames.filter(frame => frame.pageKey !== null).length;
  document.getElementById("hits").textContent = hits;
  document.getElementById("faults").textContent = faults;
  document.getElementById("replacements").textContent = replacements;
  document.getElementById("ramUsage").textContent = `${usedFrames}/${frameCount}`;
}

function renderEventLog() {
  const log = document.getElementById("eventLog");
  log.textContent = eventLog.length === 0 ? "No page request yet." : eventLog.join("\n");
}

function getPageKey(appName, pageNumber) { return `${appName}::${pageNumber}`; }
function capitalize(text) { return text.charAt(0).toUpperCase() + text.slice(1); }

function memoryPriorityHelp(priority) {
  if (priority === "high") {
    return "High Priority: academic app pages are important and should stay responsive.";
  }

  if (priority === "medium") {
    return "Medium Priority: productivity app pages are useful but less urgent than active academic pages.";
  }

  return "Low Priority: background app pages can be moved to virtual memory first when RAM is full.";
}

initializeSimulator();
