const fs = require('fs');
const path = require('path');

// Simple GLTF parser - reads GLB binary and extracts mesh info
const glbPath = path.join(__dirname, '..', 'public', 'male_anatomy.glb');
const buf = fs.readFileSync(glbPath);

// GLB header: magic(4) + version(4) + length(4)
const magic = buf.readUInt32LE(0);
const version = buf.readUInt32LE(4);
const totalLength = buf.readUInt32LE(8);

console.log(`GLB: magic=${magic.toString(16)}, version=${version}, length=${totalLength}`);

// First chunk: JSON
const chunk0Length = buf.readUInt32LE(12);
const chunk0Type = buf.readUInt32LE(16);
console.log(`Chunk 0: type=${chunk0Type.toString(16)}, length=${chunk0Length}`);

const jsonStr = buf.toString('utf8', 20, 20 + chunk0Length);
const gltf = JSON.parse(jsonStr);

console.log(`\nMeshes: ${gltf.meshes?.length || 0}`);
console.log(`Nodes: ${gltf.nodes?.length || 0}`);
console.log(`Materials: ${gltf.materials?.length || 0}`);

// Print node info
if (gltf.nodes) {
  console.log('\n--- Nodes ---');
  gltf.nodes.forEach((node, i) => {
    const name = node.name || `Node_${i}`;
    const pos = node.translation || [0, 0, 0];
    const scale = node.scale || [1, 1, 1];
    const mesh = node.mesh !== undefined ? node.mesh : 'none';
    console.log(`  ${i}: "${name}" mesh=${mesh} pos=[${pos.map(v=>v.toFixed(2)).join(',')}] scale=[${scale.map(v=>v.toFixed(2)).join(',')}]`);
  });
}

// Print mesh info
if (gltf.meshes) {
  console.log('\n--- Meshes ---');
  gltf.meshes.forEach((mesh, i) => {
    console.log(`  ${i}: "${mesh.name || 'unnamed'}" primitives=${mesh.primitives?.length || 0}`);
  });
}

// Accessor bounds
if (gltf.accessors) {
  console.log('\n--- Accessor Bounds (position) ---');
  gltf.accessors.forEach((acc, i) => {
    if (acc.max && acc.min && acc.type === 'VEC3') {
      console.log(`  Accessor ${i}: min=[${acc.min.map(v=>v.toFixed(2)).join(',')}] max=[${acc.max.map(v=>v.toFixed(2)).join(',')}]`);
    }
  });
}
