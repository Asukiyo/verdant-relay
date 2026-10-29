import{SiegeEngine as GameEngine}from'./siege-engine.js';
import{SiegeRenderer as WorldRenderer}from'./siege-renderer.js';
import{GameInput}from'./input.js';
import{GrowthUI as GameUI}from'./growth-ui.js';
import{GameAudio}from'./audio.js';
import{registerGameTools}from'./webmcp.js';

try{
 let storage=null;try{storage=localStorage;}catch{/* Device storage is optional. */}
 const engine=new GameEngine({storage}),canvas=document.getElementById('world'),renderer=new WorldRenderer(canvas,engine),audio=new GameAudio(engine),ui=new GameUI(engine,renderer,audio);
 const input=new GameInput(canvas,engine,renderer,{onKey:(k,e)=>ui.key(k,e),onInteract:()=>audio.unlock()});ui.setInput(input);
 let last=performance.now(),alive=true;
 function frame(now){if(!alive)return;const dt=Math.min(.05,(now-last)/1000);last=now;engine.update(dt,input.vector());renderer.draw(dt);ui.refresh();requestAnimationFrame(frame);}
 const resize=new ResizeObserver(()=>renderer.resize());resize.observe(canvas);
 document.addEventListener('visibilitychange',()=>{input.clear();engine.paused=document.hidden||ui.panel.open;if(document.hidden)engine.save();last=performance.now();});
 let resetting=false;engine.on('reset',()=>{resetting=true;alive=false;});
 window.addEventListener('pagehide',()=>{if(!resetting)engine.save();});
 registerGameTools(engine,ui);
 if(!storage)ui.toast('このブラウザでは自動保存が使えません。ページを閉じると進行状況が消えます。');
 requestAnimationFrame(frame);
}catch(error){document.getElementById('load-error').textContent='3D画面を開始できませんでした。ブラウザのハードウェアアクセラレーションを有効にして、再読み込みしてください。';document.getElementById('load-error').hidden=false;console.error('Game initialization failed:',error);}
