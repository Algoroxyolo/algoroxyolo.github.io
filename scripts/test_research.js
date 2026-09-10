const assert = require('node:assert/strict');
const {populationValues, matchesPaper} = require('../assets/js/research.js');
const tight = populationValues(90, 12);
const varied = populationValues(90, 90);
const drift = populationValues(12, 90);
const span = people => Math.max(...people.map(p => p.response)) - Math.min(...people.map(p => p.response));
const error = people => people.reduce((sum,p) => sum + Math.abs(p.target-p.simulated), 0);
assert.deepEqual(tight.map(p=>p.simulated), varied.map(p=>p.simulated), 'Changing diversity must preserve profile fidelity');
assert.deepEqual(varied.map(p=>p.response), drift.map(p=>p.response), 'Changing fidelity must preserve response diversity');
assert.ok(span(varied) > span(tight) * 5);
assert.ok(error(drift) > error(varied) * 5);
for (const fit of [0,100]) for (const spread of [0,100]) {
  const people=populationValues(fit,spread);
  assert.equal(people.length,24);
  assert.ok(people.every(p=>Object.values(p).every(x=>Number.isFinite(x)&&x>=0&&x<=1)));
}
assert.equal(error(populationValues(100,90)),0);
assert.equal(span(populationValues(90,0)),0);
const paper=['Sentipolis Yunze Xiao social simulation',['social-simulation','trustworthy-agents'],'published'];
assert.ok(matchesPaper(...paper,{q:' YUNZE ',topic:'social-simulation',status:'published'}));
assert.ok(!matchesPaper(...paper,{q:'Yunze',topic:'social-simulation',status:'preprint'}));
assert.ok(!matchesPaper(...paper,{q:'absent',topic:'',status:''}));
assert.ok(matchesPaper(...paper,{q:'',topic:'',status:''}));
console.log('Population independence, boundary conditions, and combined archive filters passed.');
