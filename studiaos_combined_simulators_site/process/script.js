let userMode = "focus";
let processes = [];
let processId = 1;

const priorityValue = {
  high: 1,
  medium: 2,
  low: 3
};

const priorityLabel = {
  1: "High",
  2: "Medium",
  3: "Low"
};

function setMode(mode) {
  userMode = mode;

  document.getElementById("focusModeBtn").classList.toggle("active", mode === "focus");
  document.getElementById("normalModeBtn").classList.toggle("active", mode === "normal");
  document.getElementById("modeLabel").textContent = mode === "focus" ? "Focus Mode" : "Normal Mode";

  renderProcessTable();
}

function addPresetProcess(name, priorityType, burst) {
  const priority = priorityValue[priorityType];

  processes.push({
    id: processId,
    name: name,
    arrival: processes.length,
    burst: burst,
    priority: priority,
    priorityType: priorityType
  });

  processId++;
  renderProcessTable();
}

function loadSample() {
  processes = [];
  processId = 1;

  addPresetProcess("Online Class", "high", 6);
  addPresetProcess("Document Editor", "high", 5);
  addPresetProcess("PDF Viewer", "medium", 4);
  addPresetProcess("Manual File Transfer", "medium", 6);
  addPresetProcess("Cloud Sync", "low", 5);
}

function removeProcess(id) {
  processes = processes.filter(process => process.id !== id);
  renderProcessTable();
}

function resetAll() {
  processes = [];
  processId = 1;
  document.getElementById("outputSection").classList.add("hidden");
  document.getElementById("emptyOutput").classList.remove("hidden");
  renderProcessTable();
}

function renderProcessTable() {
  const table = document.getElementById("processTable");

  if (processes.length === 0) {
    table.innerHTML = '<tr><td colspan="5" class="empty">No processes added yet.</td></tr>';
    return;
  }

  table.innerHTML = processes.map(process => {
    return `
      <tr>
        <td><strong>${process.name}</strong></td>
        <td>${formatTime(process.arrival)}s</td>
        <td>${formatTime(process.burst)}s</td>
        <td>
          <span class="tag priority-${process.priorityType}">
            ${priorityLabel[process.priority]}
          </span>
        </td>
        <td>
          <button class="small-btn" onclick="removeProcess(${process.id})">Remove</button>
        </td>
      </tr>
    `;
  }).join("");
}

function runSimulation() {
  if (processes.length === 0) {
    alert("Please add at least one process.");
    return;
  }

  const quantum = Number(document.getElementById("quantumInput").value);
  const agingThreshold = Number(document.getElementById("agingInput").value);

  if (quantum < 1 || agingThreshold < 1) {
    alert("Time Quantum and Aging Threshold must be at least 1.");
    return;
  }

  const simulationProcesses = processes.map(process => ({
    ...process,
    remaining: process.burst,
    currentPriority: process.priority,
    originalPriority: process.priority,
    completion: null,
    firstStart: null,
    added: false,
    waitingForAging: 0
  }));

  let time = 0;
  let completed = 0;
  let readyQueue = [];
  let gantt = [];
  let log = [];
  let contextSwitches = 0;
  let previousProcess = null;

  while (completed < simulationProcesses.length) {
    addArrivedProcesses(simulationProcesses, readyQueue, time, log);

    if (readyQueue.length === 0) {
      time++;
      continue;
    }

    readyQueue.sort((a, b) => {
      if (a.currentPriority !== b.currentPriority) {
        return a.currentPriority - b.currentPriority;
      }
      return a.id - b.id;
    });

    const currentProcess = readyQueue.shift();

    if (previousProcess !== null && previousProcess !== currentProcess.id) {
      contextSwitches++;
      log.push(`t=${formatTime(time)}s: Context switch to ${currentProcess.name}.`);
    }

    if (currentProcess.firstStart === null) {
      currentProcess.firstStart = time;
    }

    const start = time;
    const runTime = Math.min(quantum, currentProcess.remaining);

    currentProcess.remaining -= runTime;
    time += runTime;

    gantt.push({
      name: currentProcess.name,
      start: start,
      end: time,
      priority: currentProcess.currentPriority
    });

    log.push(`t=${formatTime(start)}s-${formatTime(time)}s: ${currentProcess.name} runs for ${formatTime(runTime)} second(s).`);

    applyAging(readyQueue, agingThreshold, runTime, time, log);
    addArrivedProcesses(simulationProcesses, readyQueue, time, log);

    if (currentProcess.remaining === 0) {
      currentProcess.completion = time;
      completed++;
      log.push(`t=${formatTime(time)}s: ${currentProcess.name} is terminated.`);
    } else {
      currentProcess.waitingForAging = 0;
      readyQueue.push(currentProcess);
      log.push(`t=${formatTime(time)}s: ${currentProcess.name} returns to the Ready Queue.`);
    }

    previousProcess = currentProcess.id;
  }

  renderOutput(simulationProcesses, gantt, log, contextSwitches);
}

function addArrivedProcesses(allProcesses, readyQueue, time, log) {
  allProcesses.forEach(process => {
    if (!process.added && process.arrival <= time) {
      process.added = true;
      readyQueue.push(process);
      log.push(`t=${formatTime(time)}s: ${process.name} enters Ready Queue as ${priorityLabel[process.currentPriority]} priority.`);
    }
  });
}

function applyAging(readyQueue, threshold, elapsedTime, currentTime, log) {
  readyQueue.forEach(process => {
    process.waitingForAging += elapsedTime;

    if (process.waitingForAging >= threshold && process.currentPriority > 1) {
      process.currentPriority--;
      process.waitingForAging = 0;
      log.push(`t=${formatTime(currentTime)}s: Aging promotes ${process.name} to ${priorityLabel[process.currentPriority]} priority.`);
    }
  });
}

function renderOutput(simProcesses, gantt, log, contextSwitches) {
  document.getElementById("emptyOutput").classList.add("hidden");
  document.getElementById("outputSection").classList.remove("hidden");

  renderQueues(simProcesses);
  renderGantt(gantt);
  renderResultsTable(simProcesses);

  const waitingTimes = simProcesses.map(p => (p.completion - p.arrival) - p.burst);
  const turnaroundTimes = simProcesses.map(p => p.completion - p.arrival);
  const responseTimes = simProcesses.map(p => p.firstStart - p.arrival);

  document.getElementById("avgWaiting").textContent = formatTime(average(waitingTimes));
  document.getElementById("avgTurnaround").textContent = formatTime(average(turnaroundTimes));
  document.getElementById("avgResponse").textContent = formatTime(average(responseTimes));
  document.getElementById("contextSwitches").textContent = contextSwitches;

  document.getElementById("eventLog").textContent = log.join("\n");
}

function renderQueues(simProcesses) {
  const high = simProcesses.filter(p => p.currentPriority === 1);
  const medium = simProcesses.filter(p => p.currentPriority === 2);
  const low = simProcesses.filter(p => p.currentPriority === 3);

  document.getElementById("highQueue").innerHTML = queueItems(high);
  document.getElementById("mediumQueue").innerHTML = queueItems(medium);
  document.getElementById("lowQueue").innerHTML = queueItems(low);
}

function queueItems(items) {
  if (items.length === 0) {
    return '<span class="empty">No process</span>';
  }

  return items.map(item => `<span class="pill">${item.name}</span>`).join("");
}

function renderGantt(gantt) {
  const chart = document.getElementById("ganttChart");

  chart.innerHTML = gantt.map(segment => {
    const className = segment.priority === 1 ? "gantt-high" :
      segment.priority === 2 ? "gantt-medium" : "gantt-low";

    return `
      <div class="gantt-block ${className}">
        ${segment.name}
        <small>${formatTime(segment.start)}s → ${formatTime(segment.end)}s</small>
      </div>
    `;
  }).join("");
}

function renderResultsTable(simProcesses) {
  const table = document.getElementById("resultTable");

  table.innerHTML = simProcesses
    .sort((a, b) => a.id - b.id)
    .map(process => {
      const turnaround = process.completion - process.arrival;
      const waiting = turnaround - process.burst;
      const response = process.firstStart - process.arrival;
      const currentType = process.currentPriority === 1 ? "high" :
        process.currentPriority === 2 ? "medium" : "low";

      return `
        <tr>
          <td><strong>${process.name}</strong></td>
          <td><span class="tag priority-${process.priorityType}">${priorityLabel[process.originalPriority]}</span></td>
          <td><span class="tag priority-${currentType}">${priorityLabel[process.currentPriority]}</span></td>
          <td>${formatTime(process.arrival)}s</td>
          <td>${formatTime(process.burst)}s</td>
          <td>${formatTime(process.completion)}s</td>
          <td>${formatTime(turnaround)}s</td>
          <td>${formatTime(waiting)}s</td>
          <td>${formatTime(response)}s</td>
        </tr>
      `;
    }).join("");
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatTime(value) {
  return Number(value).toFixed(2);
}

function processPriorityHelp(priorityType) {
  if (priorityType === "high") {
    return "High Priority: academic or foreground apps are handled first for faster response.";
  }
  if (priorityType === "medium") {
    return "Medium Priority: regular productivity apps get balanced CPU time.";
  }
  return "Low Priority: background or non-critical tasks run when higher-priority apps are not busy.";
}

function finalPriorityHelp(originalPriority, currentPriority) {
  if (originalPriority === currentPriority) {
    return "Final priority stayed the same.";
  }
  return "Final priority changed because aging promoted the process after waiting too long.";
}

renderProcessTable();
