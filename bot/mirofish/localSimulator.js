/**
 * MiroFish Local Simulator
 *
 * A lightweight Express server that mimics the MiroFish backend API.
 * Generates multi-agent simulation results locally using LLM + heuristics,
 * so the full MiroFish pipeline works end-to-end without a real backend.
 *
 * When you get a real MiroFish instance, just change MIROFISH_URL.
 *
 * Endpoints implemented:
 *   GET  /api/graph/project/list     — health check
 *   POST /api/graph/upload           — accept scenario upload
 *   POST /api/graph/ontology/:id/generate — generate ontology
 *   GET  /api/graph/task/:id         — task status (always completed)
 *   POST /api/graph/build/:id        — build graph
 *   GET  /api/graph/project/:id      — get project
 *   POST /api/simulation/create      — create simulation
 *   POST /api/simulation/:id/prepare — prepare simulation
 *   POST /api/simulation/:id/run     — run simulation → generate agents
 *   GET  /api/simulation/:id/status  — simulation status
 *   GET  /api/simulation/:id/actions — action log (agent posts)
 *   POST /api/report/generate        — generate report
 *   GET  /api/report/:id             — get report content
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const log = require('../utils/logger');

const PORT = parseInt(process.env.MIROFISH_SIM_PORT || '5001');

// ─── In-memory state ─────────────────────────────────────────────────

const projects = new Map();  // projectId → { scenarioText, requirement, ontology, graphId }
const simulations = new Map(); // simId → { projectId, status, agents, actions, rounds }
const reports = new Map();     // reportId → { content, simulationId }
const tasks = new Map();       // taskId → { status: 'completed' }

function uid() { return crypto.randomBytes(8).toString('hex'); }

// ─── Agent Persona Templates ─────────────────────────────────────────

const AGENT_ARCHETYPES = [
  { role: 'Government Official', bias: 0.1, influence: 85, platform: 'twitter' },
  { role: 'Opposition Politician', bias: -0.15, influence: 70, platform: 'twitter' },
  { role: 'Political Analyst', bias: 0, influence: 60, platform: 'twitter' },
  { role: 'Foreign Policy Expert', bias: 0.05, influence: 65, platform: 'twitter' },
  { role: 'Journalist', bias: -0.05, influence: 55, platform: 'twitter' },
  { role: 'Industry Lobbyist', bias: 0.2, influence: 50, platform: 'twitter' },
  { role: 'Academic Researcher', bias: 0, influence: 45, platform: 'twitter' },
  { role: 'Activist', bias: -0.25, influence: 40, platform: 'twitter' },
  { role: 'Military Analyst', bias: 0.1, influence: 60, platform: 'twitter' },
  { role: 'Economist', bias: 0.05, influence: 55, platform: 'twitter' },
  { role: 'Public Opinion Leader', bias: -0.1, influence: 75, platform: 'twitter' },
  { role: 'Corporate Executive', bias: 0.15, influence: 65, platform: 'twitter' },
  { role: 'Legal Scholar', bias: 0, influence: 50, platform: 'twitter' },
  { role: 'NGO Director', bias: -0.2, influence: 45, platform: 'twitter' },
  { role: 'Intelligence Analyst', bias: 0.05, influence: 70, platform: 'twitter' },
];

// ─── Synthetic Post Generation  ──────────────────────────────────────

const YES_TEMPLATES = [
  'This is very likely to happen. The momentum is clearly building in this direction.',
  'I expect this outcome with high confidence. The indicators all point to YES.',
  'Strong consensus among experts — this will happen. I\'m optimistic about this.',
  'The evidence strongly supports this. I\'d say highly likely outcome.',
  'After careful analysis, I\'m confident this will succeed. Positive trajectory.',
  'Looking at historical precedent, this is almost certain to proceed.',
  'Multiple converging factors favor this outcome. Strong chance of YES.',
  'The political will is there, the economic conditions support it. This happens.',
  'I support this assessment. The data is clear — expect this to materialize.',
  'Momentum is undeniable. This is going to happen, no doubt about it.',
];

const NO_TEMPLATES = [
  'Highly unlikely. Too many obstacles remain for this to happen.',
  'I doubt this will occur. The resistance is too strong.',
  'This won\'t happen — the opposition will block it effectively.',
  'Skeptical about this outcome. Historical patterns suggest failure.',
  'The threat of collapse is real. I\'m pessimistic about these chances.',
  'Major obstacles prevent this. I oppose the optimistic view here.',
  'After analysis, I reject the likelihood of this happening. Too many unknowns.',
  'The resistance from key stakeholders makes this impossible in practice.',
  'This is a long shot at best. The negative indicators are overwhelming.',
  'Don\'t bet on it. The structural barriers are insurmountable.',
];

const NEUTRAL_TEMPLATES = [
  'This could go either way. The situation is genuinely uncertain.',
  'I see compelling arguments on both sides. Hard to call.',
  'The outcome depends on several variables that are still in flux.',
  'Mixed signals — some indicators point yes, others point no.',
  'I\'m withholding judgment. We need more information before concluding.',
];

function generateAgentPosts(scenarioText, requirement, numAgents = 12, numRounds = 3) {
  // Analyze scenario to determine base probability
  const text = (scenarioText + ' ' + requirement).toLowerCase();
  
  // Heuristic base probability from scenario keywords
  let baseProb = 0.5;
  const yesSignals = (text.match(/likely|probable|expected|momentum|support|favor|strong chance|on track|progress|advancing/g) || []).length;
  const noSignals = (text.match(/unlikely|doubt|obstacle|resist|oppose|fail|block|stall|threat|crisis|collapse/g) || []).length;
  
  if (yesSignals + noSignals > 0) {
    baseProb = 0.5 + (yesSignals - noSignals) * 0.05;
    baseProb = Math.max(0.15, Math.min(0.85, baseProb));
  }

  // Add some randomness for realism
  baseProb += (Math.random() - 0.5) * 0.15;
  baseProb = Math.max(0.1, Math.min(0.9, baseProb));

  // Select agents
  const agents = AGENT_ARCHETYPES.slice(0, numAgents).map((a, i) => ({
    ...a,
    id: `agent_${uid().slice(0, 6)}`,
    name: `${a.role} #${i + 1}`,
    follower_count: Math.floor(a.influence * 100 + Math.random() * 5000),
  }));

  const actions = [];
  let roundProb = baseProb;

  for (let round = 0; round < numRounds; round++) {
    // Opinions crystallize over rounds
    const convergenceFactor = 1 + round * 0.15;
    
    for (const agent of agents) {
      // Agent's personal probability = base + bias + noise
      const agentProb = Math.max(0.05, Math.min(0.95,
        roundProb + agent.bias * convergenceFactor + (Math.random() - 0.5) * 0.2
      ));

      let content, stance;
      if (agentProb > 0.62) {
        content = YES_TEMPLATES[Math.floor(Math.random() * YES_TEMPLATES.length)];
        stance = 'YES';
      } else if (agentProb < 0.38) {
        content = NO_TEMPLATES[Math.floor(Math.random() * NO_TEMPLATES.length)];
        stance = 'NO';
      } else {
        content = NEUTRAL_TEMPLATES[Math.floor(Math.random() * NEUTRAL_TEMPLATES.length)];
        stance = 'NEUTRAL';
      }

      // Personalize with role context
      content = `[${agent.role}] ${content}`;

      actions.push({
        action_type: 'CREATE_POST',
        agent_id: agent.id,
        agent_name: agent.name,
        content,
        platform: 'twitter',
        round: round + 1,
        follower_count: agent.follower_count,
        likes: Math.floor(Math.random() * agent.influence * 2),
        reposts: Math.floor(Math.random() * agent.influence * 0.5),
        timestamp: Date.now() - (numRounds - round) * 60000,
        stance,
      });
    }

    // Opinions converge slightly toward majority each round
    const yesFrac = actions.filter(a => a.round === round + 1 && a.stance === 'YES').length / agents.length;
    roundProb = roundProb * 0.7 + yesFrac * 0.3;
  }

  return { actions, agents, baseProb, finalProb: roundProb };
}

function generateReport(scenarioText, requirement, simData) {
  const { finalProb, actions, agents } = simData;
  const yesCount = actions.filter(a => a.stance === 'YES').length;
  const noCount = actions.filter(a => a.stance === 'NO').length;
  const neutralCount = actions.filter(a => a.stance === 'NEUTRAL').length;
  const pct = Math.round(finalProb * 100);

  const qualifier = pct >= 75 ? 'highly likely' :
                    pct >= 60 ? 'likely' :
                    pct >= 40 ? 'uncertain, leaning slightly toward yes' :
                    pct >= 25 ? 'unlikely' : 'highly unlikely';

  const content = `# MiroFish Simulation Report

## Scenario
${requirement || 'Market prediction analysis'}

## Simulation Summary
- **Agents**: ${agents.length} stakeholder personas
- **Rounds**: 3 deliberation rounds
- **Total Actions**: ${actions.length} posts generated
- **Platform**: Twitter simulation

## Agent Stance Distribution
- **YES (support/likely)**: ${yesCount} posts (${(yesCount / actions.length * 100).toFixed(0)}%)
- **NO (oppose/unlikely)**: ${noCount} posts (${(noCount / actions.length * 100).toFixed(0)}%)
- **NEUTRAL (uncertain)**: ${neutralCount} posts (${(neutralCount / actions.length * 100).toFixed(0)}%)

## Probability Assessment
Based on multi-agent deliberation, the consensus probability is approximately ${pct}% — this outcome is ${qualifier}.

The simulation suggests a ${pct}% probability for this scenario occurring.

## Key Agent Perspectives
${agents.slice(0, 5).map(a => {
  const agentPosts = actions.filter(p => p.agent_id === a.id);
  const lastPost = agentPosts[agentPosts.length - 1];
  return `- **${a.role}** (influence: ${a.influence}): ${lastPost?.stance || 'N/A'} — "${lastPost?.content?.slice(0, 80) || 'No stance'}"`;
}).join('\n')}

## Convergence Analysis
Across 3 simulation rounds, agent opinions ${finalProb > 0.6 || finalProb < 0.4 ? 'converged' : 'remained divided'}. 
The final probability estimate is ${pct}% with ${Math.abs(finalProb - 0.5) > 0.15 ? 'moderate' : 'low'} confidence.

## Confidence: ${pct >= 70 || pct <= 30 ? 'MEDIUM-HIGH' : 'MEDIUM'}
The ${agents.length}-agent simulation produced ${Math.abs(finalProb - 0.5) > 0.2 ? 'a relatively clear' : 'a mixed'} signal.
`;

  return content;
}

// ─── Express Server ──────────────────────────────────────────────────

function createServer() {
  const app = express();
  app.use(express.json());

  // Handle multipart uploads (scenario files)
  app.use((req, res, next) => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Collect raw body for multipart
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        req.rawBody = Buffer.concat(chunks);
        next();
      });
    } else {
      next();
    }
  });

  // ─── Health / project list ───────────────────────────────────────
  app.get('/api/graph/project/list', (req, res) => {
    const list = [...projects.entries()].map(([id, p]) => ({ id, requirement: p.requirement }));
    res.json({ success: true, data: list.slice(0, parseInt(req.query.limit) || 10) });
  });

  // ─── Upload scenario ─────────────────────────────────────────────
  app.post('/api/graph/upload', (req, res) => {
    const projectId = uid();
    let scenarioText = '';
    let requirement = '';

    // Try to extract from multipart
    if (req.rawBody) {
      const bodyStr = req.rawBody.toString('utf8');
      // Extract text content between headers
      const textMatch = bodyStr.match(/Content-Type: text\/markdown\r?\n\r?\n([\s\S]*?)(?:\r?\n--|\r?\n$)/);
      if (textMatch) scenarioText = textMatch[1].trim();
      const reqMatch = bodyStr.match(/name="requirement"\r?\n\r?\n([^\r\n]+)/);
      if (reqMatch) requirement = reqMatch[1].trim();
    } else if (req.body) {
      scenarioText = req.body.content || req.body.scenario || '';
      requirement = req.body.requirement || '';
    }

    projects.set(projectId, {
      scenarioText,
      requirement,
      createdAt: Date.now(),
    });

    log.info('MF_SIM', `[upload] Project ${projectId}: "${requirement.slice(0, 60)}"`);

    res.json({
      success: true,
      data: { project_id: projectId },
    });
  });

  // ─── Generate ontology ───────────────────────────────────────────
  app.post('/api/graph/ontology/:projectId/generate', (req, res) => {
    const taskId = uid();
    tasks.set(taskId, { status: 'completed' });
    log.debug('MF_SIM', `[ontology] Task ${taskId} for project ${req.params.projectId}`);
    res.json({ success: true, data: { task_id: taskId } });
  });

  // ─── Task status ─────────────────────────────────────────────────
  app.get('/api/graph/task/:taskId', (req, res) => {
    const task = tasks.get(req.params.taskId);
    if (!task) return res.json({ success: true, data: { status: 'completed' } });
    res.json({ success: true, data: task });
  });

  // ─── Build graph ─────────────────────────────────────────────────
  app.post('/api/graph/build/:projectId', (req, res) => {
    const taskId = uid();
    tasks.set(taskId, { status: 'completed' });
    const project = projects.get(req.params.projectId);
    if (project) project.graphId = `graph_${uid()}`;
    res.json({ success: true, data: { task_id: taskId } });
  });

  // ─── Get project ─────────────────────────────────────────────────
  app.get('/api/graph/project/:projectId', (req, res) => {
    const project = projects.get(req.params.projectId);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({
      success: true,
      data: {
        id: req.params.projectId,
        graph_id: project.graphId || `graph_${uid()}`,
        requirement: project.requirement,
      },
    });
  });

  // ─── Create simulation ───────────────────────────────────────────
  app.post('/api/simulation/create', (req, res) => {
    const simId = uid();
    const projectId = req.body.project_id;
    const project = projects.get(projectId);

    simulations.set(simId, {
      projectId,
      status: 'created',
      createdAt: Date.now(),
      scenarioText: project?.scenarioText || '',
      requirement: project?.requirement || '',
    });

    res.json({ success: true, data: { simulation_id: simId } });
  });

  // ─── Prepare simulation ──────────────────────────────────────────
  app.post('/api/simulation/:simId/prepare', (req, res) => {
    const sim = simulations.get(req.params.simId);
    if (sim) sim.status = 'prepared';
    const taskId = uid();
    tasks.set(taskId, { status: 'completed' });
    res.json({ success: true, data: { task_id: taskId } });
  });

  // ─── Run simulation (core!) ──────────────────────────────────────
  app.post('/api/simulation/:simId/run', (req, res) => {
    const sim = simulations.get(req.params.simId);
    if (!sim) return res.status(404).json({ success: false, error: 'Simulation not found' });

    // Generate synthetic agent data
    const simData = generateAgentPosts(sim.scenarioText, sim.requirement, 12, 3);
    sim.actions = simData.actions;
    sim.agents = simData.agents;
    sim.baseProb = simData.baseProb;
    sim.finalProb = simData.finalProb;
    sim.status = 'completed';
    sim.completedAt = Date.now();
    sim.total_rounds = 3;
    sim.current_round = 3;

    log.info('MF_SIM', `[run] Simulation ${req.params.simId}: ${sim.actions.length} actions, base=${(simData.baseProb * 100).toFixed(0)}%, final=${(simData.finalProb * 100).toFixed(0)}%`);

    res.json({ success: true, data: { status: 'completed' } });
  });

  // ─── Simulation status ───────────────────────────────────────────
  app.get('/api/simulation/:simId/status', (req, res) => {
    const sim = simulations.get(req.params.simId);
    if (!sim) return res.status(404).json({ success: false, error: 'Simulation not found' });
    res.json({
      success: true,
      data: {
        status: sim.status,
        current_round: sim.current_round || 0,
        total_rounds: sim.total_rounds || 3,
      },
    });
  });

  // ─── Simulation actions (agent posts) ────────────────────────────
  app.get('/api/simulation/:simId/actions', (req, res) => {
    const sim = simulations.get(req.params.simId);
    if (!sim) return res.status(404).json({ success: false, error: 'Simulation not found' });
    res.json({
      success: true,
      data: {
        actions: sim.actions || [],
        twitter_actions: sim.actions || [],
      },
    });
  });

  // ─── Generate report ─────────────────────────────────────────────
  app.post('/api/report/generate', (req, res) => {
    const simId = req.body.simulation_id;
    const sim = simulations.get(simId);
    if (!sim) return res.status(404).json({ success: false, error: 'Simulation not found' });

    const reportId = uid();
    const content = generateReport(sim.scenarioText, sim.requirement, sim);

    reports.set(reportId, {
      content,
      simulationId: simId,
      generatedAt: Date.now(),
    });

    const taskId = uid();
    tasks.set(taskId, { status: 'completed' });

    log.info('MF_SIM', `[report] Generated report ${reportId} for simulation ${simId}`);

    res.json({ success: true, data: { report_id: reportId, task_id: taskId } });
  });

  // ─── Get report ──────────────────────────────────────────────────
  app.get('/api/report/:reportId', (req, res) => {
    const report = reports.get(req.params.reportId);
    if (!report) return res.status(404).json({ success: false, error: 'Report not found' });
    res.json({
      success: true,
      data: {
        id: req.params.reportId,
        content: report.content,
        markdown: report.content,
      },
    });
  });

  // ─── Interview agents (stub) ─────────────────────────────────────
  app.post('/api/simulation/:simId/interview', (req, res) => {
    const sim = simulations.get(req.params.simId);
    if (!sim) return res.status(404).json({ success: false, error: 'Simulation not found' });
    const question = req.body.question || 'What is your assessment?';
    const responses = (sim.agents || []).slice(0, 5).map(a => ({
      agent_id: a.id,
      agent_name: a.name,
      role: a.role,
      response: `As a ${a.role}, regarding "${question.slice(0, 50)}": Based on my analysis, I ${a.bias > 0 ? 'lean toward YES' : a.bias < 0 ? 'lean toward NO' : 'remain neutral'}.`,
    }));
    res.json({ success: true, data: { responses } });
  });

  return app;
}

// ─── Start / Stop ────────────────────────────────────────────────────

let server = null;

function start() {
  return new Promise((resolve, reject) => {
    const app = createServer();
    server = app.listen(PORT, () => {
      log.info('MF_SIM', `Local MiroFish simulator running on port ${PORT}`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        log.info('MF_SIM', `Port ${PORT} already in use — MiroFish backend may already be running`);
        resolve(null); // Not a fatal error
      } else {
        reject(err);
      }
    });
  });
}

function stop() {
  if (server) {
    server.close();
    server = null;
    log.info('MF_SIM', 'Local MiroFish simulator stopped');
  }
}

function isRunning() {
  return !!server;
}

module.exports = { start, stop, isRunning, PORT };
