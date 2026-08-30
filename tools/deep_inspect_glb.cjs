/**
 * Deep inspection of GLB model: extract actual vertex positions for each mesh
 * to determine which mesh is which body part.
 */
const fs = require('fs');
const path = require('path');

const glbPath = path.join(__dirname, '..', 'public', 'male_anatomy.glb');
const buf = fs.readFileSync(glbPath);

const chunk0Length = buf.readUInt32LE(12);
const jsonStr = buf.toString('utf8', 20, 20 + chunk0Length);
const gltf = JSON.parse(jsonStr);

// Binary chunk starts after JSON chunk
const binaryChunkStart = 20 + chunk0Length;
const chunk1Length = buf.readUInt32LE(binaryChunkStart);
const chunk1Type = buf.readUInt32LE(binaryChunkStart + 4);
const binaryData = buf.subarray(binaryChunkStart + 8, binaryChunkStart + 8 + chunk1Length);

function readAccessor(accessorIdx) {
  const acc = gltf.accessors[accessorIdx];
  const bvIdx = acc.bufferView;
  const bv = gltf.bufferViews[bvIdx];
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const count = acc.count;
  const componentSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType];
  const typeSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[acc.type];
  const stride = componentSize * typeSize;

  const data = [];
  for (let i = 0; i < count; i++) {
    const vals = [];
    for (let j = 0; j < typeSize; j++) {
      if (acc.componentType === 5126) {
        vals.push(buf.readFloatLE(offset + i * stride + j * 4));
      } else if (acc.componentType === 5125) {
        vals.push(buf.readUInt32LE(offset + i * stride + j * 4));
      } else if (acc.componentType === 5122) {
        vals.push(buf.readInt16LE(offset + i * stride + j * 2));
      }
    }
    data.push(vals);
  }
  return data;
}

// For each mesh, extract the actual vertices and compute statistics
console.log('=== MESH ANALYSIS ===\n');

for (let i = 0; i < gltf.meshes.length; i++) {
  const mesh = gltf.meshes[i];
  const node = gltf.nodes[i + 4]; // Offset by 4 root nodes
  const prim = mesh.primitives[0];
  const posAccIdx = prim.attributes.POSITION;
  const posAcc = gltf.accessors[posAccIdx];

  const vertices = readAccessor(posAccIdx);

  // Compute centroid and spread
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

  // Sample vertices to understand shape distribution
  // Count how many vertices are in different Z bands
  const zBands = {
    'head_high': 0,    // Z > 0.4
    'shoulders': 0,    // Z 0.25-0.4
    'chest': 0,        // Z 0.1-0.25
    'abs': 0,          // Z -0.05 to 0.1
    'hips': 0,         // Z -0.2 to -0.05
    'thighs': 0,       // Z -0.35 to -0.2
    'calves': 0,       // Z < -0.35
  };

  const yBands = {
    'back': 0,         // Y < -0.05
    'center': 0,       // Y -0.05 to 0.05
    'front': 0,        // Y > 0.05
  };

  for (const v of vertices) {
    const z = v[2], y = v[1];
    if (z > 0.4) zBands.head_high++;
    else if (z > 0.25) zBands.shoulders++;
    else if (z > 0.1) zBands.chest++;
    else if (z > -0.05) zBands.abs++;
    else if (z > -0.2) zBands.hips++;
    else if (z > -0.35) zBands.thighs++;
    else zBands.calves++;

    if (y < -0.05) yBands.back++;
    else if (y > 0.05) yBands.front++;
    else yBands.center++;
  }

  const total = vertices.length;
  const zPcts = {};
  for (const [k, v] of Object.entries(zBands)) zPcts[k] = ((v / total) * 100).toFixed(1) + '%';
  const yPcts = {};
  for (const [k, v] of Object.entries(yBands)) yPcts[k] = ((v / total) * 100).toFixed(1) + '%';

  console.log(`--- Mesh ${i}: "${mesh.name}" (Node: "${node?.name}") ---`);
  console.log(`  Vertices: ${total}`);
  console.log(`  Centroid: (${cx.toFixed(4)}, ${cy.toFixed(4)}, ${cz.toFixed(4)})`);
  console.log(`  Size: X=${sizeX.toFixed(4)} Y=${sizeY.toFixed(4)} Z=${sizeZ.toFixed(4)}`);
  console.log(`  Z distribution:`, zPcts);
  console.log(`  Y distribution (front/back):`, yPcts);
  console.log(`  Position acc bounds: min=[${posAcc.min.map(v=>v.toFixed(4)).join(',')}] max=[${posAcc.max.map(v=>v.toFixed(4)).join(',')}]`);
  console.log();
}
