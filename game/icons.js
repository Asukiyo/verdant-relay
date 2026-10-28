// Small functional UI icons. All world objects are drawn by the game renderer.
const paths={
 fish:'<path d="M4 12C8 4 15 4 19 12c-4 8-11 8-15 0Z"/><path d="m4 12-3-4v8zM14 9v6"/><circle cx="16" cy="11" r=".6"/>',
 cash:'<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="4"/><path d="M5 9v6m14-6v6"/>',
 tree:'<path d="m12 3-6 8h3l-5 6h6v4h4v-4h6l-5-6h3z"/>',
 wood:'<path d="m4 8 5-4h10l2 4-4 4H2Zm-2 4v5l15 3 4-5V8M17 12v8"/>',
 meat:'<path d="M10 7c4-6 13-3 10 4-1 3-5 5-8 4l-6 5-3-3 6-6c-1-2 0-3 1-4Z"/><path d="m5 17 2 2m6-11c2-2 5-1 4 1"/>',
 stone:'<path d="m3 15 4-9 9-2 5 9-4 7H7z"/><path d="m7 6 5 8 9-1M3 15l9-1 5 6m0-16-5 10"/>',
 axe:'<path d="m6 21 9-17M11 6c4 0 6 1 9 4l-3 6c-2-3-5-4-9-4z"/>',
 home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-7h6v7"/>',
 tent:'<path d="m3 21 9-18 9 18ZM8 21l4-8 4 8M9 3l3 6 3-6"/>',
 tower:'<path d="M6 21 8 8M18 21 16 8M4 21h16M6 8h12V3h-3v2h-3V3H9v2H6ZM7 13h10M6 17h12"/>',
 boots:'<path d="M7 3h9v11l5 2v5H4v-6l3-2zM7 8h9M7 11h9M4 18h17"/>',
 heart:'<path d="M20 5c-2-2-6-2-8 2-2-4-6-4-8-2-3 4 1 9 8 15 7-6 11-11 8-15Z"/>',
 swing:'<path d="M4 17a9 9 0 0 1 13-12m1-2v5h-5M6 21 17 9M4 11l3 2M9 5l1 3"/>',
 flag:'<path d="M5 21V4m0 0c4-4 9 4 14 0v10c-5 4-10-4-14 0"/>',
 spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z"/>',
 muted:'<path d="M11 4 6 8H3v8h3l5 4zM16 9l5 6m0-6-5 6"/>',
 sound:'<path d="M11 4 6 8H3v8h3l5 4zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16"/>',
 pause:'<path d="M7 4v16M17 4v16" stroke-width="4"/>',
 play:'<path d="m7 3 14 9-14 9z"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',
 check:'<path d="m4 12 5 5L20 6"/>',
 expand:'<path d="M14 3h7v7M10 21H3v-7M21 3l-7 7M3 21l7-7"/>',
 save:'<path d="M4 3h13l4 4v14H3V3zM7 3v6h9V3M7 21v-8h10v8"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6z"/>',
 bear:'<path d="M5 8C0 4 6 0 8 5c2-1 6-1 8 0 3-5 8 0 3 3 3 9-1 13-7 13S2 17 5 8Z"/><path d="M8 11h.01M16 11h.01m-6 4 2 2 2-2"/>'
};
export function icon(name){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.spark}</svg>`;}
export function hydrateIcons(root=document){for(const el of root.querySelectorAll('[data-icon]'))el.innerHTML=icon(el.dataset.icon);}
