import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FIELD_REFERENCE,FIELD_BOUNDS,FIELD_COLLISION_FEATURES,WORLD_LOCATIONS,FIELD_WALK_ROUTE,referenceToField} from '../src/config/field.ts';
import {MAPS} from '../src/config/maps.ts';
import {PLAYER} from '../src/config/player.ts';
const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const body=p=>({x:p.x-PLAYER.width/2,y:p.y-PLAYER.height/2,width:PLAYER.width,height:PLAYER.height});
const walkable=p=>!FIELD_COLLISION_FEATURES.some(r=>overlaps(body(p),r));
test('REFERENCE is the existing PNG, unchanged and with audited dimensions',()=>{
 const bytes=readFileSync(new URL(FIELD_REFERENCE.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'4813475e0740357aed595f54d6e04fa038bbfced1e79d59523844178dcd781da');
 assert.equal(bytes.readUInt32BE(16),FIELD_REFERENCE.width);assert.equal(bytes.readUInt32BE(20),FIELD_REFERENCE.height);
 assert.equal(FIELD_REFERENCE.status,'DEV_REFERENCE_BACKGROUND');
});
test('reference conversion preserves corners and aspect ratio',()=>{
 assert.deepEqual(referenceToField(0,0),{x:0,y:0});
 assert.deepEqual(referenceToField(1448,1086),{x:FIELD_BOUNDS.width,y:FIELD_BOUNDS.height});
 assert.equal(FIELD_BOUNDS.width/FIELD_BOUNDS.height,FIELD_REFERENCE.width/FIELD_REFERENCE.height);
});
test('both provisional landmarks map to existing locations and target spawns',()=>{
 assert.deepEqual(Object.values(WORLD_LOCATIONS).map(l=>l.mapId),['map_01_starting_place','map_02_starting_town']);
 for(const l of Object.values(WORLD_LOCATIONS)){
  assert.equal(l.classification,'DEV_PLACEHOLDER_WORLD_POSITION');assert.ok(MAPS[l.mapId].spawns[l.targetSpawnId]);
  assert.ok(walkable(l.position));
  assert.ok(l.markerBounds.x>=0&&l.markerBounds.y>=0&&l.markerBounds.x+l.markerBounds.width<=FIELD_BOUNDS.width&&l.markerBounds.y+l.markerBounds.height<=FIELD_BOUNDS.height);
 }
});
test('arrival Body clears all triggers and terrain, not just its center',()=>{
 for(const s of Object.values(MAPS.field_starting_region.spawns)){
  assert.ok(walkable(s));
  for(const e of MAPS.field_starting_region.exits)assert.equal(overlaps(body(s),e.bounds),false);
 }
});
test('landmarks and map exits share one coordinate definition; spawn stays nearby',()=>{
 for(const l of Object.values(WORLD_LOCATIONS)){
  const e=MAPS.field_starting_region.exits.find(e=>e.targetMapId===l.mapId);assert.deepEqual(e.bounds,l.triggerBounds);
  assert.ok(Math.hypot(l.fieldSpawn.x-l.position.x,l.fieldSpawn.y-l.position.y)<150);
 }
});
test('a full-size Player can walk both ways over the entire route and into both landmarks',()=>{
 const route=[WORLD_LOCATIONS.startingPlace.position,...FIELD_WALK_ROUTE,WORLD_LOCATIONS.startingTown.position];
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i];assert.ok(a.x===b.x||a.y===b.y,'four-direction route');
  const steps=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y));
  for(let n=0;n<=steps;n++){
   const p={x:a.x+(b.x-a.x)*n/steps,y:a.y+(b.y-a.y)*n/steps};
   assert.ok(walkable(p),`blocked route segment ${i} at ${JSON.stringify(p)}`);
  }
 }
});
test('open sea, large mountain, cliff and river are blocked; southwest bridge is passable',()=>{
 for(const [x,y] of [[80,80],[700,950],[410,240],[950,350],[350,720],[940,630]])assert.equal(walkable(referenceToField(x,y)),false,`${x},${y}`);
 assert.equal(walkable(referenceToField(365,768)),true);
});


test('all six building return spawns clear doors with the full Player body',()=>{
 const town=MAPS.map_02_starting_town;
 for(const building of town.buildings){
  const spawn=town.spawns[building.frontSpawnId];
  for(const other of town.buildings)assert.equal(overlaps(body(spawn),other.door),false,building.id);
 }
});
