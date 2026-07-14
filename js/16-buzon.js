/* ==========================================================================
   16-buzon.js — "Buzón del lunes"
   --------------------------------------------------------------------------
   Lee la carpeta buzon/ del repo, que rellenan tareas automáticas (la primera
   es el Vigía de informes trimestrales, que corre cada lunes por GitHub
   Actions y deja buzon/vigia.json). Muestra sus avisos y el calendario de
   próximos resultados. SOLO LECTURA: la app nunca escribe en el buzón.
   Para añadir una acción nueva basta con que deje su fichero en buzon/ y su
   entrada en buzon/index.json; este módulo lo listará automáticamente.
   ========================================================================== */
(function(){
  'use strict';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function dd(n){ return ('0'+n).slice(-2); }
  function fdt(iso){ try{ var d=new Date(iso); if(isNaN(d))return esc(iso||''); return dd(d.getDate())+'/'+dd(d.getMonth()+1)+'/'+d.getFullYear()+' '+dd(d.getHours())+':'+dd(d.getMinutes()); }catch(e){ return esc(iso||''); } }
  function fday(iso){ try{ var d=new Date(iso+'T00:00:00'); if(isNaN(d))return esc(iso||''); var dias=['dom','lun','mar','mié','jue','vie','sáb']; return dias[d.getDay()]+' '+dd(d.getDate())+'/'+dd(d.getMonth()+1); }catch(e){ return esc(iso||''); } }
  function jget(path){ return fetch(path,{cache:'no-store'}).then(function(r){ return r.ok? r.json() : null; }).catch(function(){ return null; }); }

  function tabla(titulo, arr, cols){
    if(!arr||!arr.length) return '';
    var body=arr.map(function(x){ return '<tr>'+cols.map(function(c){ return '<td'+(c.num?' class="num"':'')+'>'+c.f(x)+'</td>'; }).join('')+'</tr>'; }).join('');
    return '<h3 style="margin:14px 0 6px;font-size:14px">'+titulo+'</h3>'
      +'<table><thead><tr>'+cols.map(function(c){return '<th'+(c.num?' class="num"':'')+'>'+c.t+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table>';
  }

  function vigiaHtml(v){
    if(!v) return '';
    var emp=function(x){ return esc(x.empresa)+' <span class="muted">('+esc(x.ticker)+')</span>'; };
    var per=function(x){ return esc(x.periodoEsperado)+(x.gruesa?' <span class="muted" title="estimación gruesa">≈</span>':''); };
    var fst=function(x){ return fday(x.fechaEstimada); };
    var h='';
    h+='<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin:2px 0 10px">'
      +'<h2 style="margin:0">🗓️ Vigía de informes trimestrales</h2>'
      +'<span class="muted" style="font-size:12px">Generado '+fdt(v.generadoEl)+' · '+esc(v.totalEmpresas||0)+' empresas</span></div>';
    h+='<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:10px 12px;margin-bottom:6px;font-size:13.5px;line-height:1.5">'+esc(v.resumenTexto||'')+'</div>';
    h+=tabla('⚠️ Vencidos (aún sin registrar)', v.vencidos, [
      {t:'Empresa',f:emp},{t:'Periodo',f:per},{t:'Fecha est.',f:fst},{t:'Retraso',num:true,f:function(x){return '+'+x.diasVencido+' d';}}
    ]);
    h+=tabla('📅 Esta semana', v.estaSemana, [ {t:'Empresa',f:emp},{t:'Periodo',f:per},{t:'Fecha est.',f:fst} ]);
    h+=tabla('🔜 Próximos 14 días', v.proximos14d, [ {t:'Empresa',f:emp},{t:'Periodo',f:per},{t:'Fecha est.',f:fst} ]);
    var vac=!(v.vencidos&&v.vencidos.length)&&!(v.estaSemana&&v.estaSemana.length)&&!(v.proximos14d&&v.proximos14d.length);
    if(vac){
      var s=v.siguienteEvento;
      h+='<p class="muted" style="margin:10px 0">Sin resultados esperados en 14 días.'+(s?(' Siguiente: <b>'+esc(s.empresa)+'</b> ~'+fday(s.fechaEstimada)+' ('+esc(s.periodoEsperado)+').'):'')+'</p>';
    }
    if(v.sinDeterminar&&v.sinDeterminar.length){
      h+='<p class="muted" style="margin:8px 0;font-size:12px">Pte. Revisión ('+v.sinDeterminar.length+'): '+v.sinDeterminar.map(function(x){return esc(x.ticker||x.archivo);}).join(', ')+'.</p>';
    }
    h+='<p class="muted" style="font-size:12px;margin-top:10px">Para registrar un informe, dile al analista: <i>"analizar informe trimestral de [empresa]"</i>.</p>';
    return h;
  }

  window.renderBuzon=function(){
    var wrap=document.getElementById('buzonWrap'); if(!wrap) return;
    wrap.innerHTML='<p class="muted">Cargando buzón…</p>';
    jget('buzon/index.json').then(function(idx){
      var files=(idx&&idx.ficheros&&idx.ficheros.length)? idx.ficheros
                 : [{clave:'vigia',archivo:'vigia.json',titulo:'Vigía de informes trimestrales'}];
      return Promise.all(files.map(function(f){
        return jget('buzon/'+f.archivo).then(function(data){ return {meta:f,data:data}; });
      }));
    }).then(function(items){
      var out='<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">'
        +'<span class="muted" style="font-size:12px">📥 Buzón del lunes — lo rellenan las tareas automáticas del método</span>'
        +'<button id="buzonReload" style="background:none;border:1px solid var(--line);border-radius:8px;padding:5px 10px;cursor:pointer;font-size:12px;font-weight:600">↻ Refrescar</button></div>';
      var any=false;
      (items||[]).forEach(function(it){
        if(!it.data) return;
        any=true;
        if(it.meta.clave==='vigia'){ out+='<div style="margin-bottom:20px">'+vigiaHtml(it.data)+'</div>'; }
        else {
          out+='<div style="margin-bottom:20px"><h2>'+esc(it.meta.titulo||it.meta.clave)+'</h2>'
            +(it.data.resumenTexto?('<p style="line-height:1.5">'+esc(it.data.resumenTexto)+'</p>')
              :('<pre style="white-space:pre-wrap;font-size:12px">'+esc(JSON.stringify(it.data,null,2))+'</pre>'))+'</div>';
        }
      });
      if(!any){
        out+='<div style="background:#f8fafc;border:1px dashed var(--line);border-radius:10px;padding:18px;text-align:center;color:var(--muted)">'
          +'El buzón está vacío por ahora.<br><span style="font-size:12px">La tarea del lunes (Vigía) dejará aquí el aviso de resultados trimestrales. Se actualiza sola cada lunes.</span></div>';
      }
      wrap.innerHTML=out;
      var rb=document.getElementById('buzonReload'); if(rb) rb.addEventListener('click',window.renderBuzon);
    });
  };
})();
