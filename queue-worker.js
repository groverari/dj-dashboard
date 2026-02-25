#!/usr/bin/env node

/**
 * DJ Dashboard Agent Queue Worker
 * Reads AGENT_QUEUE.jsonl, processes pending tasks one at a time
 * Uses Qwen14b local model for code generation tasks
 */

const fs = require('fs');
const path = require('path');

const QUEUE_FILE = path.join(__dirname, 'AGENT_QUEUE.jsonl');

/**
 * Read queue file and parse JSONL
 */
function readQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    console.error('Queue file not found:', QUEUE_FILE);
    return [];
  }

  const content = fs.readFileSync(QUEUE_FILE, 'utf8');
  return content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

/**
 * Update task status in queue file
 */
function updateTaskStatus(taskId, newStatus) {
  const tasks = readQueue();
  const updated = tasks.map(task => 
    task.id === taskId ? { ...task, status: newStatus, updatedAt: new Date().toISOString() } : task
  );

  const content = updated.map(t => JSON.stringify(t)).join('\n') + '\n';
  fs.writeFileSync(QUEUE_FILE, content, 'utf8');
  console.log(`✅ Task ${taskId} updated to: ${newStatus}`);
}

/**
 * Find first pending task
 */
function getNextPendingTask() {
  const tasks = readQueue();
  return tasks.find(task => task.status === 'pending');
}

/**
 * Execute task via subprocess call to sessions_spawn
 * This will be invoked by the cron job with access to OpenClaw tools
 */
async function processTask(task) {
  console.log(`\n📋 Processing Task ${task.id}: ${task.title}`);
  console.log(`Description: ${task.task.substring(0, 100)}...`);
  
  // Update status to "in_progress"
  updateTaskStatus(task.id, 'in_progress');

  // The actual agent spawning will happen from the cron job
  // which has access to sessions_spawn tool
  // We just write a signal file that the cron job will pick up
  
  const signalFile = path.join(__dirname, `.queue-signal-${task.id}.json`);
  fs.writeFileSync(signalFile, JSON.stringify({
    taskId: task.id,
    title: task.title,
    task: task.task,
    processedAt: new Date().toISOString()
  }), 'utf8');

  console.log(`📤 Signal file created for cron job: ${signalFile}`);
}

/**
 * Main loop - called by cron job every 2 minutes
 */
async function run() {
  const nextTask = getNextPendingTask();

  if (!nextTask) {
    console.log('✅ Queue is empty or all tasks completed!');
    process.exit(0);
  }

  try {
    await processTask(nextTask);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error processing task:', error);
    updateTaskStatus(nextTask.id, 'failed');
    process.exit(1);
  }
}

// Run if invoked directly
if (require.main === module) {
  run();
}

module.exports = { readQueue, updateTaskStatus, getNextPendingTask, processTask };
