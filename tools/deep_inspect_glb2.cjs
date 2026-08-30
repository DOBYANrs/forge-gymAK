/**
 * Correct GLB vertex extraction using proper POSITION attribute indices
 */
const fs = require('fs');
const path = require('path');

const glbPath = path.join(__dirname, '..', 'public', 'male_anatomy.glb');
const buf = fs.readFileSync(glbPath);

const chunk0Length = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + chunk0Length);
const gltf = JSON.parse(jsonStr);

const binaryChunkStart = 20 + chunk0Length;
const chunk1Length = buf.readUInt32LE(binaryChunkStart);

function readAccessor(accessorIdx) {
  const acc = gltf.accessors[accessorIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const count = acc.count;
  const typeSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  const componentSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType];
  const stride = (bv.byteStride || 0) || (componentSize * typeSize);

  const data = [];
  for (let i = 0; i < count; i++) {
    const vals = [];
    for (let j = 0; j < typeSize; j++) {
      const pos = offset + i * stride + j * componentSize;
      if (acc.componentType === 5126) vals.push(buf.readFloatLE(pos));
      else if (acc.componentType === 5125) vals.push(buf.readUInt32LE(pos));
      else if (acc.componentType === 5122) vals.push(buf.readInt16LE(pos));
    }
    data.push(vals);
  }
  return data;
}

console.log('=== MESH ANALYSIS (Correct POSITION extraction) ===\n');

for (let i = 0; i < gltf.meshes.length; i++) {
  const mesh = gltf.meshes[i];
  const node = gltf.nodes[i + 4];
  const prim = mesh.primitives[0];
  
  // Use the CORRECT POSITION attribute index
  const posAccIdx = prim.attributes.POSITION;
  const posAcc = gltf.accessors[posAccIdx];
  
  console.log(`Mesh ${i} "${mesh.name}": POSITION accessor #${posAccIdx}`);
  
  const vertices = readAccessor(posAccIdx);
  
  // Verify we got 3D vectors
  if (vertices.length === 0 || vertices[0].length !== 3) {
    console.log(`  ERROR: Expected VEC3, got ${vertices[0]?.length || 'empty'}-component`);
    continue;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let sumX = 0, sumY = 0, sumZ = 0;

  for (const v of vertices) {
    sumX += v[0]; sumY += v[1]; sumZ += v[2];
    if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0];
    if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1];
    if (v[2] < minZ) minZ = v[2]; if (v[2] > maxZ) maxZ = v[2];
  }

  const cx = sumX / vertices.length;
  const cy = sumY / vertices.length;
  const cz = sumZ / vertices.length;
  const sizeX = maxX - minX;
  const sizeY = maxY - minY;
  const sizeZ = maxZ - minZ;

  // Z = height axis (largest extent), Y = front/back, X = left/right
  // Determine dominant regions
  const yPct = sizeY > 0 ? ((maxY - minY) / Math.max(sizeX, sizeY, sizeZ) * 100).toFixed(0) : 0;
  const frontPct = cy > 0 ? 'FRONT-heavy' : 'BACK-heavy';
  
  // Determine approximate body region by Z centroid (height)
  let region = 'UNKNOWN';
  if (cz > 0.3) region = 'HEAD/NECK';
  else if (cz > 0.15) region = 'UPPER TORSO (Chest/Shoulders)';
  else if (cz > 0.0) region = 'MID TORSO (Abs/Back)';
  else if (cz > -0.15) region = 'LOWER TORSO (Hips/Glutes)';
  else if (cz > -0.3) region = 'UPPER LEGS (Quads/Hamstrings)';
  else region = 'LOWER LEGS (Calves/Feet)';

  // Determine front vs back
  let side = 'BALANCED';
  if (cy > 0.03) side = 'FRONT (Chest/Abs)';
  else if (cy < -0.03) side = 'BACK (Lats/Back)';

  // Determine lateral (arms vs torso)
  let laterality = 'TORSO';
  if (Math.abs(cx) > 0.08) laterality = 'LATERAL (Arms/Shoulders)';

  console.log(`  Vertices: ${vertices.length}`);
  console.log(`  Centroid: X=${cx.toFixed(4)} Y=${cy.toFixed(4)} Z=${cz.toFixed(4)}`);
  console.log(`  Size: X=${sizeX.toFixed(4)} Y=${sizeY.toFixed(4)} Z=${sizeZ.toFixed(4)}`);
  console.log(`  Dominant axis: Z(height)=${sizeZ.toFixed(3)} Y(front/back)=${sizeY.toFixed(3)} X(width)=${sizeX.toFixed(3)}`);
  console.log(`  Region: ${region}`);
  console.log(`  Side: ${side} (${frontPct})`);
  console.log(`  Laterality: ${laterality}`);
  console.log(`  Accessor bounds: min=[${posAcc.min.map(v=>v.toFixed(4)).join(',')}] max=[${posAcc.max.map(v=>v.toFixed(4)).join(',')}]`);
  console.log();
}
