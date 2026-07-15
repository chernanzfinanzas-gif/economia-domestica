/* ==========================================================================
   16-buzon.js — "Buzón del lunes"
   --------------------------------------------------------------------------
   Lee la carpeta buzon/ del repo, que rellenan tareas automáticas. Hoy hay dos:
     · Vigía (vigia.json)  → ESTIMA la fecha del próximo informe trimestral
                             (mismo motor que la vista Cobertura, sin internet).
     · Agenda (agenda.json)→ CONFIRMA con Yahoo la fecha de resultados y ex-dividend
                             (lo que el navegador no puede: llamar a internet).
   La app enseña primero lo CONFIRMADO (Agenda) y deja la ESTIMACIÓN (Vigía) como
   respaldo para lo que Yahoo aún no publica. SOLO LECTURA: la app nunca escribe.
   Para añadir una acción nueva basta con que deje su fichero en buzon/ y su entrada
   en buzon/index.json; este módulo lo listará automáticamente.
   ========================================================================== */
(function(){
  'use strict';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function dd(n){ return ('0'+n).slice(-2); }
  function fdt(iso){ try{ var d=new Date(iso); if(isNaN(d))return esc(iso||''); return dd(d.getDate())+'/'+dd(d.getMonth()+1)+'/'+d.getFullYear()+' '+dd(d.getHours())+':'+dd(d.getMinutes()); }catch(e){ return esc(iso||''); } }
  function fday(iso){ try{ var d=new Date(iso+'T00:00:00'); if(isNaN(d))return esc(iso||''); var dias=['dom','lun','mar','mié','jue','vie','sáb']; return dias[d.getDay()]+' '+dd(d.getDate())+'/'+dd(d.getMonth()+1); }catch(e){ return esc(iso||''); } }
  function eur(n){ if(n==null||n==='')return ''; try{ return (typeof fmt==='function')?fmt(n):(Number(n).toFixed(3)+' €'); }catch(e){ return esc(''+n); } }
  function jget(path){ return fetch(path,{cache:'no-store'}).then(function(r){ return r.ok? r.json() : null; }).catch(function(){ return null; }); }

  function tabla(titulo, arr, cols){
    if(!arr||!arr.length) return '';
    var body=arr.map(function(x){ return '<tr>'+cols.map(function(c){ return '<td'+(c.num?' class="num"':'')+'>'+c.f(x)+'</td>'; }).join('')+'</tr>'; }).join('');
    return '<h3 style="margin:14px 0 6px;font-size:14px">'+titulo+'</h3>'
      +'<table><thead><tr>'+cols.map(function(c){return '<th'+(c.num?' class="num"':'')+'>'+c.t+'</th>';}).join('')+'</tr></thead><tbody>'+body+'</tbody></table>';
  }

  // ---- Agenda confirmada (Yahoo): resultados + ex-dividend --------------------
  function agendaHtml(a){
    if(!a) return '';
    var emp=function(x){ return esc(x.empresa)+' <span class="muted">('+esc(x.ticker)+')</span>'; };
    var badge=function(conf){ return conf
      ? '<span style="background:#dcfce7;color:#166534;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700">confirmada</span>'
      : '<span style="background:#fef9c3;color:#854d0e;border-radius:6px;padding:1px 7px;font-size:11px;font-weight:700">estimada Yahoo</span>'; };
    var h='';
    h+='<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin:2px 0 10px">'
      +'<h2 style="margin:0">📌 Agenda confirmada</h2>'
      +'<span class="muted" style="font-size:12px">Yahoo Finance · generado '+fdt(a.generadoEl)+'</span></div>';
    h+='<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:10px 12px;margin-bottom:6px;font-size:13.5px;line-height:1.5">'+esc(a.resumenTexto||'')+'</div>';
    h+=tabla('📊 Próximos resultados', a.resultados, [
      {t:'Empresa',f:emp},
      {t:'Fecha',f:function(x){return fday(x.fecha);}},
      {t:'En',num:true,f:function(x){return (x.dias<0?'hace '+(-x.dias):'en '+x.dias)+' d';}},
      {t:'',f:function(x){return badge(x.confirmada);}}
    ]);
    if(!(a.resultados&&a.resultados.length)){
      h+='<p class="muted" style="margin:10px 0">Sin fecha de resultados confirmada por Yahoo en la ventana. Rige la estimación del Vigía (más abajo).</p>';
    }
    if(a.sinConfirmar&&a.sinConfirmar.length){
      h+='<p class="muted" style="margin:8px 0;font-size:12px">Sin fecha de resultados confirmada ('+a.sinConfirmar.length+'): '
        +a.sinConfirmar.map(function(x){return esc(x.ticker);}).join(', ')+'. Para estas rige la <b>estimación del Vigía</b>.</p>';
    }
    // Ex-dividend: secundario y discreto. Lo bueno son las fechas de resultados; para
    // dividendos manda TU sección de Dividendos (Yahoo es flojo con la bolsa española).
    if(a.exDividendos&&a.exDividendos.length){
      h+='<details style="margin-top:10px"><summary class="muted" style="cursor:pointer;font-size:12px">💶 Ex-dividend (orientativo, '+a.exDividendos.length+') — tus fechas exactas están en Dividendos</summary>'
        +'<div style="margin-top:6px">'+tabla('', a.exDividendos, [
          {t:'Empresa',f:emp},
          {t:'Ex-date',f:function(x){return fday(x.exFecha);}},
          {t:'Pago',f:function(x){return x.pagoFecha?fday(x.pagoFecha):'—';}},
          {t:'€/acción',num:true,f:function(x){return x.importe!=null?eur(x.importe):'—';}}
        ])+'</div></details>';
    }
    return h;
  }

  function vigiaHtml(v){
    if(!v) return '';
    var emp=function(x){ return esc(x.empresa)+' <span class="muted">('+esc(x.ticker)+')</span>'; };
    var per=function(x){ return esc(x.periodoLabel||x.periodoEsperado); };
    var fst=function(x){ return fday(x.fechaEstimada); };
    var h='';
    h+='<div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;margin:2px 0 10px">'
      +'<h2 style="margin:0">🗓️ Vigía de informes trimestrales</h2>'
      +'<span class="muted" style="font-size:12px">Estimación · generado '+fdt(v.generadoEl)+' · '+esc(v.totalEmpresas||0)+' empresas</span></div>';
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

  // Aviso compacto en el Panel (visible a diario) con acceso rápido al buzón.
  // Los lunes se resalta como recordatorio para "volcar el buzón".
  window.renderBuzonPanel=function(){
    var host=document.getElementById('panelBuzon'); if(!host) return;
    var esLunes=(new Date().getDay()===1);
    Promise.all([jget('buzon/index.json'), jget('buzon/vigia.json'), jget('buzon/agenda.json')]).then(function(r){
      var idx=r[0], v=r[1], a=r[2];
      var partes=[];
      if(a){
        var nR=(a.resultados||[]).length;
        if(nR) partes.push('📊 <b>'+nR+'</b> resultado'+(nR>1?'s':'')+' <span class="muted">confirmados</span>');
      }
      if(v){
        var nV=(v.vencidos||[]).length, nS=(v.estaSemana||[]).length, nP=(v.proximos14d||[]).length;
        var lv='';
        if(nV) lv+='<b style="color:#b91c1c">'+nV+' vencido'+(nV>1?'s':'')+'</b> · ';
        lv+=(nS? ('<b>'+nS+'</b> esta semana') : 'nada esta semana');
        if(nP) lv+=' · '+nP+' próx. 14 días';
        partes.push('🗓️ '+lv+' <span class="muted">(est.)</span>');
      }
      var linea = partes.length ? partes.join('<br>') : 'Se actualiza solo cada lunes por la mañana.';
      var bg=esLunes?'linear-gradient(90deg,#fff7ed,#ffedd5)':'#fff';
      var borde=esLunes?'#f59e0b':'var(--line)';
      var record=esLunes?'<div style="font-weight:700;color:#9a3412;font-size:12.5px;margin-top:4px">📌 Hoy es lunes: revisa y vuelca el buzón</div>':'';
      host.innerHTML='<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;'
        +'background:'+bg+';border:1px solid '+borde+';border-radius:12px;padding:12px 14px;margin:10px 0 6px">'
        +'<div style="min-width:200px;flex:1"><div style="font-weight:700;font-size:14px">📥 Buzón del lunes</div>'
        +'<div class="muted" style="font-size:13px;margin-top:2px">'+linea+'</div>'+record+'</div>'
        +'<button id="panelBuzonBtn" style="background:var(--brand);color:#fff;border:none;border-radius:9px;padding:8px 14px;font-weight:700;cursor:pointer;white-space:nowrap">Abrir buzón →</button></div>';
      var b=document.getElementById('panelBuzonBtn');
      if(b) b.addEventListener('click',function(){ if(typeof activarVista==='function') activarVista('buzon'); });
    });
  };

  window.renderBuzon=function(){
    var wrap=document.getElementById('buzonWrap'); if(!wrap) return;
    wrap.innerHTML='<p class="muted">Cargando buzón…</p>';
    jget('buzon/index.json').then(function(idx){
      var files=(idx&&idx.ficheros&&idx.ficheros.length)? idx.ficheros
                 : [{clave:'agenda',archivo:'agenda.json',titulo:'Agenda confirmada'},
                    {clave:'vigia',archivo:'vigia.json',titulo:'Vigía de informes trimestrales'}];
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
        if(it.meta.clave==='agenda'){ out+='<div style="margin-bottom:20px">'+agendaHtml(it.data)+'</div>'; }
        else if(it.meta.clave==='vigia'){ out+='<div style="margin-bottom:20px">'+vigiaHtml(it.data)+'</div>'; }
        else {
          out+='<div style="margin-bottom:20px"><h2>'+esc(it.meta.titulo||it.meta.clave)+'</h2>'
            +(it.data.resumenTexto?('<p style="line-height:1.5">'+esc(it.data.resumenTexto)+'</p>')
              :('<pre style="white-space:pre-wrap;font-size:12px">'+esc(JSON.stringify(it.data,null,2))+'</pre>'))+'</div>';
        }
      });
      if(!any){
        out+='<div style="background:#f8fafc;border:1px dashed var(--line);border-radius:10px;padding:18px;text-align:center;color:var(--muted)">'
          +'El buzón está vacío por ahora.<br><span style="font-size:12px">Las tareas del lunes (Agenda y Vigía) dejarán aquí las fechas de resultados y dividendos. Se actualiza solo cada lunes.</span></div>';
      }
      wrap.innerHTML=out;
      var rb=document.getElementById('buzonReload'); if(rb) rb.addEventListener('click',window.renderBuzon);
    });
  };
})();
