import fs from 'fs';
import path from 'path';

function detectNode(projectRoot) {
  const entries = [];
  const pkgPath = path.join(projectRoot, 'package.json');
  if (!fs.existsSync(pkgPath)) return entries;

  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const nodeVersion = (pkg.engines && pkg.engines.node) ? pkg.engines.node : 'Unknown';
    entries.push({ layer: 'Core', technology: 'Node.js', version: nodeVersion, purpose: 'Runtime environment' });
    if (pkg.dependencies) {
      for (const [dep, ver] of Object.entries(pkg.dependencies)) {
        entries.push({ layer: 'Dependency', technology: dep, version: ver, purpose: 'Application library' });
      }
    }
  } catch (e) {
    console.warn(`Warning: Failed to parse package.json: ${e.message}`);
  }
  return entries;
}

function detectPython(projectRoot) {
  const entries = [];

  const pyprojPath = path.join(projectRoot, 'pyproject.toml');
  if (fs.existsSync(pyprojPath)) {
    try {
      const content = fs.readFileSync(pyprojPath, 'utf8');
      const versionMatch = content.match(/requires-python\s*=\s*["']([^"']+)["']/);
      entries.push({ layer: 'Core', technology: 'Python', version: versionMatch ? versionMatch[1] : 'Unknown', purpose: 'Application runtime' });
      const depsMatch = content.match(/dependencies\s*=\s*\[([\s\S]*?)\]/);
      if (depsMatch) {
        const deps = depsMatch[1].split(',').map(d => d.trim().replace(/"/g, '').replace(/'/g, '')).filter(Boolean);
        for (const dep of deps) {
          entries.push({ layer: 'Dependency', technology: dep, version: 'Latest', purpose: 'Python package' });
        }
      }
    } catch (e) {
      console.warn(`Warning: Failed to parse pyproject.toml: ${e.message}`);
      entries.push({ layer: 'Core', technology: 'Python', version: 'Unknown', purpose: 'Application runtime' });
    }
    return entries;
  }

  const reqPath = path.join(projectRoot, 'requirements.txt');
  if (fs.existsSync(reqPath)) {
    entries.push({ layer: 'Core', technology: 'Python', version: 'Unknown', purpose: 'Application runtime' });
    try {
      const lines = fs.readFileSync(reqPath, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          entries.push({ layer: 'Dependency', technology: trimmed, version: 'Specified', purpose: 'Python dependency' });
        }
      }
    } catch (e) {
      console.warn(`Warning: Failed to read requirements.txt: ${e.message}`);
    }
  }
  return entries;
}

function detectGo(projectRoot) {
  const entries = [];
  const goModPath = path.join(projectRoot, 'go.mod');
  if (!fs.existsSync(goModPath)) return entries;

  let goVersion = 'Unknown';
  try {
    const match = fs.readFileSync(goModPath, 'utf8').match(/^go\s+([\d.]+)/m);
    if (match) goVersion = match[1];
  } catch (e) {
    console.warn(`Warning: Failed to read go.mod: ${e.message}`);
  }
  entries.push({ layer: 'Core', technology: 'Go', version: goVersion, purpose: 'Application runtime' });
  return entries;
}

function detectRust(projectRoot) {
  const entries = [];
  const cargoPath = path.join(projectRoot, 'Cargo.toml');
  if (!fs.existsSync(cargoPath)) return entries;

  entries.push({ layer: 'Core', technology: 'Rust', version: 'Unknown', purpose: 'Application runtime' });
  try {
    const content = fs.readFileSync(cargoPath, 'utf8');
    const depsSection = content.split(/^\[dependencies\]\s*$/m)[1];
    if (depsSection) {
      for (const line of depsSection.split('\n')) {
        if (line.trim().startsWith('[')) break;
        const depMatch = line.match(/^([\w-]+)\s*=\s*"?([^"{]*)"?/);
        if (depMatch) {
          entries.push({ layer: 'Dependency', technology: depMatch[1], version: depMatch[2].trim() || 'Unknown', purpose: 'Rust crate' });
        }
      }
    }
  } catch (e) {
    console.warn(`Warning: Failed to parse Cargo.toml: ${e.message}`);
  }
  return entries;
}

function detectPHP(projectRoot) {
  const entries = [];
  const composerPath = path.join(projectRoot, 'composer.json');
  if (!fs.existsSync(composerPath)) return entries;

  entries.push({ layer: 'Core', technology: 'PHP', version: 'Unknown', purpose: 'Application runtime' });
  try {
    const composer = JSON.parse(fs.readFileSync(composerPath, 'utf8'));
    for (const [dep, ver] of Object.entries(composer.require || {})) {
      entries.push({ layer: 'Dependency', technology: dep, version: ver, purpose: 'PHP package' });
    }
  } catch (e) {
    console.warn(`Warning: Failed to parse composer.json: ${e.message}`);
  }
  return entries;
}

function detectMarkerEcosystems(projectRoot) {
  const entries = [];
  let rootEntries = [];
  try {
    rootEntries = fs.readdirSync(projectRoot);
  } catch (e) {
    console.warn(`Warning: Failed to list project root: ${e.message}`);
    return entries;
  }

  if (rootEntries.some(f => f.endsWith('.csproj') || f.endsWith('.sln'))) {
    entries.push({ layer: 'Core', technology: '.NET / C#', version: 'Unknown', purpose: 'Application runtime' });
  }
  if (rootEntries.includes('pom.xml') || rootEntries.includes('build.gradle') || rootEntries.includes('build.gradle.kts')) {
    entries.push({ layer: 'Core', technology: 'Java / JVM', version: 'Unknown', purpose: 'Application runtime' });
  }
  if (rootEntries.includes('Gemfile')) {
    entries.push({ layer: 'Core', technology: 'Ruby', version: 'Unknown', purpose: 'Application runtime' });
  }
  return entries;
}

const TECH_DETECTORS = [detectNode, detectPython, detectGo, detectRust, detectPHP, detectMarkerEcosystems];

export function detectTechStack(projectRoot) {
  let stack = [];
  for (const detector of TECH_DETECTORS) {
    stack = stack.concat(detector(projectRoot));
  }
  if (stack.length === 0) {
    stack.push({ layer: 'Core', technology: 'Unknown Stack', version: 'N/A', purpose: 'Please update manually' });
  }
  return stack;
}
