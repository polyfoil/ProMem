import fs from 'fs';
import path from 'path';

// Ledger entries must stay single-line: the shift-ledger format, pm compact,
// and cross-document TX references all assume one transaction per line.
export function sanitizeMessage(msg) {
  return String(msg).replace(/[\r\n]+/g, ' ').trim();
}

export function formatTxId(txNumber) {
  return `TX-${String(txNumber).padStart(4, '0')}`;
}

// The next transaction number is derived by scanning Memory.md and the
// Archive rather than kept in a counter file: stateless, survives manual
// edits, and stays monotonic across compactions.
export function nextTxNumber(pmDir) {
  let max = 0;
  // Only real entry lines count — anchoring to "- [TX-" keeps documentation
  // examples (like the format comment in the template) out of the sequence.
  const scan = (content) => {
    const re = /^\s*- \[TX-(\d+)/gm;
    let match;
    while ((match = re.exec(content)) !== null) {
      const n = Number(match[1]);
      if (n > max) max = n;
    }
  };

  const memoryPath = path.join(pmDir, '04_Execution', 'Memory.md');
  try {
    scan(fs.readFileSync(memoryPath, 'utf8'));
  } catch (err) {
    // No ledger yet — numbering starts from the archive scan below.
  }

  const archiveDir = path.join(pmDir, 'Archive');
  let archiveFiles = [];
  try {
    archiveFiles = fs.readdirSync(archiveDir).filter(f => f.endsWith('.md'));
  } catch (err) {
    // No archive yet.
  }
  for (const file of archiveFiles) {
    try {
      scan(fs.readFileSync(path.join(archiveDir, file), 'utf8'));
    } catch (err) {
      console.warn(`Warning: could not scan archive file ${file} for TX ids: ${err.message}`);
    }
  }

  return max + 1;
}

export function formatMemoryEntry(txNumber, agent, msg) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
  return `- [${formatTxId(txNumber)} | ${dateStr} ${timeStr} | Agent: ${sanitizeMessage(agent)}]: ${sanitizeMessage(msg)}\n`;
}
