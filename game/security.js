/** Escape both text and quoted HTML attributes; never interpolate saved IDs raw. */
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validStructure=(s,kind)=>s&&typeof s.id==='string'&&new RegExp('^'+kind+'-[a-z0-9,.-]{1,80}$').test(s.id)&&Number.isFinite(s.x)&&Number.isFinite(s.z)&&Math.abs(s.x)<=64003&&Math.abs(s.z)<=64003;
