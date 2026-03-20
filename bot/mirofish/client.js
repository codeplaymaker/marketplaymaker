/**
 * MiroFish API Client
 *
 * Connects to a running MiroFish backend instance to orchestrate
 * social simulation for prediction market probability estimation.
 *
 * MiroFish is a collective-intelligence engine that:
 *   1. Builds a knowledge graph of stakeholders from a scenario description
 *   2. Creates AI social-media agent personas for each stakeholder
 *   3. Runs multi-agent simulation (Twitter/Reddit) via OASIS
 *   4. Produces prediction reports from collective agent behavior
 *
 * This client drives the full pipeline: upload → graph → simulation → report.
 */

const log = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../logs/mirofish-state.json');

// ─── Configuration ───────────────────────────────────────────────────
let config = {
  baseUrl: process.env.MIROFISH_URL || 'http://localhost:5001',
  apiKey: process.env.MIROFISH_API_KEY || null,
  timeout: 30000,      // 30s for normal API calls
  simTimeout: 600000,  // 10 min for simulation runs
  pollInterval: 5000,  // 5s polling during simulation
};

// Track active projects/simulations per market
let activeSimulations = new Map(); // conditionId → { projectId, simulationId, graphId, status, startedAt }

// ─── Load persisted state ────────────────────────────────────────────
try {
  if (fs.existsSync(STATE_FILE)) {
    const saved = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (saved.simulations) {
      for (const [k, v] of Object.entries(saved.simulations)) {
        activeSimulations.set(k, v);
      }
      log.info('MIROFISH', `Loaded ${activeSimulations.size} tracked simulations`);
    }
  }
} catch { /* fresh start */ }

function saveState() {
  try {
    const simObj = {};
    for (const [k, v] of activeSimulations) simObj[k] = v;
    fs.promises.writeFile(STATE_FILE, JSON.stringify({
      simulations: simObj,
      savedAt: new Date().toISOString(),
    }, null, 2)).catch(() => {});
  } catch { /* non-critical */ }
}

// ─── HTTP helpers ────────────────────────────────────────────────────

async function mfFetch(endpoint, options = {}) {
  const url = `${config.baseUrl}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {}),
    ...(options.headers || {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || config.timeout);

  try {
    const resp = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const data = await resp.json();

    if (!resp.ok || data.success === false) {
      throw new Error(data.error || `HTTP ${resp.status}: ${resp.statusText}`);
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error(`MiroFish request timeout (${endpoint})`);
    throw err;
  }
}

async function mfUpload(endpoint, filePath, fields = {}) {
  const url = `${config.baseUrl}${endpoint}`;
  const { FormData, File } = await import('undici');
  const form = new FormData();

  const fileContent = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  form.append('file', new File([fileContent], fileName, { type: 'text/markdown' }));

  for (const [k, v] of Object.entries(fields)) {
    form.append(k, v);
  }

  const resp = await fetch(url, {
    method: 'POST',
    headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {},
    body: form,
  });

  const data = await resp.json();
  if (!resp.ok || data.success === false) {
    throw new Error(data.error || `Upload failed: HTTP ${resp.status}`);
  }
  return data;
}

// ─── Health check ────────────────────────────────────────────────────

async function isAvailable() {
  try {
    const resp = await fetch(`${config.baseUrl}/api/graph/project/list?limit=1`, {
      signal: AbortSignal.timeout(5000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

// ─── Full Pipeline: Market → Simulation → Probability ────────────────

/**
 * Run the full MiroFish pipeline for a prediction market question.
 * This is an expensive operation (minutes), so it's cached and batched.
 *
 * Steps:
 *   1. Generate a scenario document from the market question
 *   2. Upload to MiroFish and create a project
 *   3. Generate ontology (entity/relationship schema)
 *   4. Build knowledge graph via Zep
 *   5. Prepare simulation (agent profiles + config)
 *   6. Run multi-agent social simulation
 *   7. Generate prediction report
 *   8. Extract probability estimate from agent stances
 *
 * @param {string} conditionId  - Market's unique ID
 * @param {string} scenarioPath - Path to generated scenario .md file
 * @param {string} requirement  - Simulation requirement description
 * @returns {Object} { projectId, simulationId, reportId, status }
 */
async function runFullPipeline(conditionId, scenarioPath, requirement, meta = {}) {
  const existing = activeSimulations.get(conditionId);
  if (existing && existing.status === 'completed') {
    log.debug('MIROFISH', `Returning cached simulation for ${conditionId}`);
    return existing;
  }

  const state = {
    conditionId,
    question: meta.question || null,
    status: 'uploading',
    startedAt: Date.now(),
    projectId: null,
    graphId: null,
    simulationId: null,
    reportId: null,
  };
  activeSimulations.set(conditionId, state);
  saveState();

  try {
    // Step 1: Upload scenario document
    log.info('MIROFISH', `[${conditionId}] Uploading scenario...`);
    const uploadResult = await mfUpload('/api/graph/upload', scenarioPath, {
      requirement,
    });
    state.projectId = uploadResult.data?.project_id;
    if (!state.projectId) throw new Error('No project_id returned from upload');
    state.status = 'generating_ontology';
    saveState();

    // Step 2: Generate ontology
    log.info('MIROFISH', `[${conditionId}] Generating ontology for project ${state.projectId}...`);
    const ontoResult = await mfFetch(`/api/graph/ontology/${state.projectId}/generate`, {
      method: 'POST',
      timeout: 120000,
    });
    state.status = 'building_graph';
    saveState();

    // Step 3: Wait for ontology task to complete
    if (ontoResult.data?.task_id) {
      await waitForTask(ontoResult.data.task_id, 'ontology');
    }

    // Step 4: Build knowledge graph
    log.info('MIROFISH', `[${conditionId}] Building knowledge graph...`);
    const graphResult = await mfFetch(`/api/graph/build/${state.projectId}`, {
      method: 'POST',
      timeout: 180000,
    });
    if (graphResult.data?.task_id) {
      await waitForTask(graphResult.data.task_id, 'graph_build');
    }

    // Retrieve the graph ID from the project
    const project = await mfFetch(`/api/graph/project/${state.projectId}`);
    state.graphId = project.data?.graph_id;
    state.status = 'preparing_simulation';
    saveState();

    // Step 5: Create and prepare simulation
    log.info('MIROFISH', `[${conditionId}] Preparing simulation...`);
    const simCreate = await mfFetch('/api/simulation/create', {
      method: 'POST',
      body: { project_id: state.projectId },
      timeout: 60000,
    });
    state.simulationId = simCreate.data?.simulation_id;
    if (!state.simulationId) throw new Error('No simulation_id returned');

    // Wait for simulation preparation
    const prepResult = await mfFetch(`/api/simulation/${state.simulationId}/prepare`, {
      method: 'POST',
      timeout: 300000,
    });
    if (prepResult.data?.task_id) {
      await waitForTask(prepResult.data.task_id, 'sim_prepare');
    }

    state.status = 'running_simulation';
    saveState();

    // Step 6: Run the simulation
    log.info('MIROFISH', `[${conditionId}] Running multi-agent simulation...`);
    await mfFetch(`/api/simulation/${state.simulationId}/run`, {
      method: 'POST',
      body: { platforms: ['twitter'] }, // Twitter-only for speed
      timeout: config.simTimeout,
    });

    // Poll simulation status until complete
    await waitForSimulation(state.simulationId);

    state.status = 'generating_report';
    saveState();

    // Step 7: Generate prediction report
    log.info('MIROFISH', `[${conditionId}] Generating prediction report...`);
    const reportResult = await mfFetch('/api/report/generate', {
      method: 'POST',
      body: { simulation_id: state.simulationId },
      timeout: 300000,
    });
    state.reportId = reportResult.data?.report_id;
    if (reportResult.data?.task_id) {
      await waitForTask(reportResult.data.task_id, 'report');
    }

    state.status = 'completed';
    state.completedAt = Date.now();
    saveState();

    log.info('MIROFISH', `[${conditionId}] Pipeline complete: project=${state.projectId}, sim=${state.simulationId}, report=${state.reportId}`);
    return state;

  } catch (err) {
    state.status = 'failed';
    state.error = err.message;
    saveState();
    log.error('MIROFISH', `[${conditionId}] Pipeline failed: ${err.message}`);
    throw err;
  }
}

// ─── Task/Simulation polling helpers ─────────────────────────────────

async function waitForTask(taskId, label = 'task', maxWaitMs = 300000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const status = await mfFetch(`/api/graph/task/${taskId}`);
      const taskStatus = status.data?.status;
      if (taskStatus === 'completed' || taskStatus === 'success') return status.data;
      if (taskStatus === 'failed' || taskStatus === 'error') {
        throw new Error(`${label} task failed: ${status.data?.error || 'unknown'}`);
      }
      // Still running
      await sleep(config.pollInterval);
    } catch (err) {
      if (err.message.includes('task failed')) throw err;
      // Transient network error — retry
      await sleep(config.pollInterval);
    }
  }
  throw new Error(`${label} task timed out after ${maxWaitMs / 1000}s`);
}

async function waitForSimulation(simulationId, maxWaitMs = 600000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const status = await mfFetch(`/api/simulation/${simulationId}/status`);
      const simStatus = status.data?.status;
      if (simStatus === 'completed' || simStatus === 'finished') return status.data;
      if (simStatus === 'failed' || simStatus === 'error') {
        throw new Error(`Simulation failed: ${status.data?.error || 'unknown'}`);
      }
      log.debug('MIROFISH', `Simulation ${simulationId}: ${simStatus} (round ${status.data?.current_round || '?'}/${status.data?.total_rounds || '?'})`);
      await sleep(config.pollInterval);
    } catch (err) {
      if (err.message.includes('Simulation failed')) throw err;
      await sleep(config.pollInterval);
    }
  }
  throw new Error(`Simulation timed out after ${maxWaitMs / 1000}s`);
}

// ─── Report retrieval ────────────────────────────────────────────────

/**
 * Get the generated report content for analysis.
 */
async function getReport(reportId) {
  const result = await mfFetch(`/api/report/${reportId}`);
  return result.data;
}

/**
 * Get simulation action log (agent posts, likes, etc.)
 */
async function getSimulationActions(simulationId) {
  const result = await mfFetch(`/api/simulation/${simulationId}/actions`);
  return result.data;
}

/**
 * Interview specific agents in a running/completed simulation.
 * @param {string} simulationId
 * @param {string} question - The question to ask agents
 * @param {Array} agentIds - Optional specific agent IDs to interview
 */
async function interviewAgents(simulationId, question, agentIds = null) {
  const body = { question };
  if (agentIds) body.agent_ids = agentIds;

  const result = await mfFetch(`/api/simulation/${simulationId}/interview`, {
    method: 'POST',
    body,
    timeout: 120000,
  });
  return result.data;
}

// ─── Cache management ────────────────────────────────────────────────

function getSimulationState(conditionId) {
  return activeSimulations.get(conditionId) || null;
}

function getCachedSimulations() {
  const result = [];
  for (const [cid, state] of activeSimulations) {
    result.push({ conditionId: cid, ...state });
  }
  return result;
}

function clearSimulation(conditionId) {
  activeSimulations.delete(conditionId);
  saveState();
}

// ─── Configuration ───────────────────────────────────────────────────

function configure(cfg) {
  if (cfg.baseUrl) config.baseUrl = cfg.baseUrl;
  if (cfg.apiKey) config.apiKey = cfg.apiKey;
  if (cfg.timeout) config.timeout = cfg.timeout;
  if (cfg.simTimeout) config.simTimeout = cfg.simTimeout;
  log.info('MIROFISH', `Configured: ${config.baseUrl}`);
}

function getStatus() {
  const completed = [...activeSimulations.values()].filter(s => s.status === 'completed').length;
  const running = [...activeSimulations.values()].filter(s => !['completed', 'failed'].includes(s.status)).length;
  const failed = [...activeSimulations.values()].filter(s => s.status === 'failed').length;

  return {
    configured: !!config.baseUrl,
    baseUrl: config.baseUrl,
    totalSimulations: activeSimulations.size,
    completed,
    running,
    failed,
  };
}

// ─── Utilities ───────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  configure,
  isAvailable,
  runFullPipeline,
  getReport,
  getSimulationActions,
  interviewAgents,
  getSimulationState,
  getCachedSimulations,
  clearSimulation,
  getStatus,
  saveState,
};
