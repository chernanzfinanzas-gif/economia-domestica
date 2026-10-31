/* APP NUEVA · Mis Decisiones · «Ya revisadas» como bloque propio (Carlos, 31-oct-2026, en el ensayo: «es muy pequeño,
   buscaba algo más visible como Listado de decisiones»).
   La línea pequeña «✔ Ya revisadas…» del recuadro de avisos pasa a ser un bloque plegable, con una fila por empresa:
   empresa · decisión vigente · revisado el · qué estaba roto cuando dijiste «sigo igual». */
(function(){
  if(typeof _diInvalHTML!=='function'||window._nrev) return; window._nrev=true;
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function txt(h){ var d=document.createElement('div'); d.innerHTML=h||''; return (d.textContent||'').trim(); }
  var o=_diInvalHTML;
  _diInvalHTML=function(INV){
    INV=INV||(typeof diarioInvalidaciones==='function'?diarioInvalidaciones():null);
    var h=o.call(this,INV);
    try{
      var rev=((INV&&INV.todas)||[]).filter(function(x){ return x.ack; });
      if(!rev.length) return h;
      h=h.replace(/<div class="muted" style="font-size:11\.5px;margin-top:[^"]*">✔ Ya revisadas[\s\S]*?<\/div>(?=<\/div><\/div><\/div>$)/,'');
      rev.sort(function(a,b){ return (a.ack.fecha<b.ack.fecha)?1:-1; });
      var filas=rev.map(function(x){ var e=x.e||{};
        var rot=(x.rot||[]).map(function(r){ return txt(r.txt); }).filter(Boolean).join(' · ');
        return '<tr><td><b class="nrv-tk" data-ficha="'+esc(e.ticker)+'">'+esc(e.ticker)+'</b></td>'+
          '<td><span class="nrv-tipo">'+esc((e.tipo||'').toUpperCase())+'</span> <span class="muted">'+esc(e.fecha||'')+'</span></td>'+
          '<td>'+esc(x.ack.fecha||'')+'</td><td class="nrv-rot">'+esc(rot)+'</td></tr>'; }).join('');
      var abierto=!!window._nRevOpen;
      h+='<div class="pos-blk'+(abierto?' open':'')+'" data-diblk="rev"><div class="pos-blk-h"><span class="arw">▶</span><span class="bt">✔ Revisadas · «sigo igual»</span>'+
        '<span class="bsum">'+rev.length+' empresa'+(rev.length>1?'s':'')+' · no vuelven a avisar salvo que empeoren de verdad</span></div>'+
        '<div class="pos-blk-b"><div class="blk-pad"><table class="nrv-t"><thead><tr><th>Empresa</th><th>Decisión vigente</th><th>Revisado el</th><th>Lo que estaba roto</th></tr></thead><tbody>'+filas+'</tbody></table></div></div></div>';
    }catch(e){ console.warn('[revisadas]',e); }
    return h;
  };
  document.addEventListener('click',function(e){ var h=e.target.closest&&e.target.closest('.pos-blk[data-diblk="rev"] > .pos-blk-h'); if(h) setTimeout(function(){ window._nRevOpen=h.parentElement.classList.contains('open'); },0); },true);
  var st=document.createElement('style'); st.textContent=
    '#view-diario .pos-blk[data-diblk="rev"]{margin-bottom:14px}'+
    '#view-diario .pos-blk[data-diblk="rev"] .pos-blk-h{background:linear-gradient(120deg,#f0fdf4,#dcfce7);border-left:4px solid #16a34a}'+
    '#view-diario .pos-blk[data-diblk="rev"] .pos-blk-h .bt{color:#166534}'+
    '.nrv-t{width:100%;border-collapse:collapse;font-size:13px}.nrv-t th{text-align:left;font-size:11px;color:#64748b;padding:5px 8px;border-bottom:1px solid #e5e9ef}'+
    '.nrv-t td{padding:7px 8px;border-bottom:1px solid #f1f5f9;vertical-align:top}.nrv-tk{color:#1d4ed8;cursor:pointer}'+
    '.nrv-tipo{font-size:11px;font-weight:800;color:#0f766e;background:#ccfbf1;border-radius:999px;padding:1px 8px}.nrv-rot{color:#475569;font-size:12.5px}';
  document.head.appendChild(st);
})();
