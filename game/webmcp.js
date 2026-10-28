/** Optional structured controls. These call the same actions as the visible controls. */
export function registerGameTools(engine,ui){
 const ctx=document.modelContext;if(!ctx?.registerTool)return;
 const life=new AbortController();const schema=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
 const tools=[
  {name:'read_frontier_status',description:'現在の資源・お金・装備・拠点・目標と体力を読み取る。',inputSchema:schema(),annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>engine.getSnapshot()},
  {name:'set_frontier_pause',description:'ゲームを一時停止、または再開する。',inputSchema:schema({paused:{type:'boolean'}},['paused']),execute:input=>{if(typeof input?.paused!=='boolean')throw Error('paused must be a boolean');if(input.paused)ui.open('pause');else ui.close();return{paused:engine.paused};}},
  {name:'upgrade_frontier_equipment',description:'指定の装備の工房マークへ移動する。到着後1秒待機すると所持金で強化される。',inputSchema:schema({equipment:{type:'string',enum:['axe','boots','vitality','reach']}},['equipment']),execute:input=>{if(!['axe','boots','vitality','reach'].includes(input?.equipment))throw Error('Unknown equipment');const spot=engine.upgradeSpots?.[input.equipment];const result=spot?{ok:engine.navigateTo(spot.x,spot.z),action:'walk_to_upgrade_marker'}:engine.upgrade(input.equipment);ui.refresh(true);if(ui.panelType==='upgrades')ui.renderPanel();return result;}},
  {name:'list_frontier_building_sites',description:'現在の建設・強化・兵募集マークと費用を確認する。',inputSchema:schema(),annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>engine.interactionMarkers()},
  {name:'build_frontier_facility',description:'指定した建設・強化・兵募集マークへ歩く。現地で1秒待機すると費用を支払い実行する。',inputSchema:schema({facility:{type:'string'}},['facility']),execute:input=>{const marker=engine.interactionMarkers().find(m=>m.key===input?.facility);if(!marker)throw Error('Unknown site; list building sites first');return{ok:engine.navigateTo(marker.x,marker.z),action:'walk_to_marker'};}},
  {name:'claim_frontier_quest_reward',description:'現在の目標が達成済みの場合に報酬を受け取り、次の目標へ進む。',inputSchema:schema(),execute:()=>{const result=engine.claimQuest();ui.refresh(true);return result;}}
 ];
 for(const tool of tools){try{void Promise.resolve(ctx.registerTool({...tool,annotations:tool.annotations??{readOnlyHint:false,untrustedContentHint:false}},{signal:life.signal})).catch(()=>{});}catch{/* The game does not depend on WebMCP support. */}}
 window.addEventListener('pagehide',()=>life.abort(),{once:true});
}
