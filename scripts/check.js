import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
for(const file of readdirSync('game').filter(f=>f.endsWith('.js')))execFileSync(process.execPath,['--check','game/'+file],{stdio:'inherit'});
console.log('All game modules passed syntax checks.');
