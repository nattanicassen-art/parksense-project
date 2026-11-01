const FL=['ชั้น 1','ชั้น 2','ชั้น 3','ชั้น 4'],N=10,$=id=>document.getElementById(id);
const PAL=['#e11d48','#2563eb','#f1f5f9','#facc15','#16a34a','#7c3aed','#f97316','#475569'];
const CAR='<svg viewBox="0 0 40 80"><rect x="0" y="12" width="5" height="15" rx="2" fill="#111"/><rect x="35" y="12" width="5" height="15" rx="2" fill="#111"/><rect x="0" y="53" width="5" height="15" rx="2" fill="#111"/><rect x="35" y="53" width="5" height="15" rx="2" fill="#111"/><rect x="3" y="2" width="34" height="76" rx="13" style="fill:var(--cc)"/><rect x="7" y="15" width="26" height="15" rx="5" fill="#bfe3ff"/><rect x="9" y="33" width="22" height="20" rx="5" fill="#0003"/><rect x="8" y="56" width="24" height="10" rx="4" fill="#bfe3ff" opacity=".85"/><rect x="6" y="3" width="9" height="4" rx="2" fill="#fde68a"/><rect x="25" y="3" width="9" height="4" rx="2" fill="#fde68a"/><rect x="6" y="73" width="9" height="3" rx="1.5" fill="#ef4444"/><rect x="25" y="73" width="9" height="3" rx="1.5" fill="#ef4444"/></svg>';
const CARG=CAR.replace(/^<svg[^>]*>|<\/svg>$/g,'');

let sp=FL.map((_,f)=>Array.from({length:N},()=>Math.random()<[.75,.6,.4,.25][f]?1:0));
const nf=f=>sp[f].filter(x=>!x).length,tm=()=>new Date().toLocaleTimeString('th-TH');

function plan(f,ch,fx){
  const A=190,Y0=100,W=46,c=Math.cos(Math.PI/10),n=Math.sin(Math.PI/10),Lx=150*c,Ly=150*n,Y=k=>Y0+k*W;
  let s=`<svg class="plan" viewBox="40 40 285 575"><rect x="${A}" y="${Y0-10}" width="125" height="${Y(10)+50-Y0}" fill="var(--road)" opacity=".55"/><path class="ln" d="M${A},${Y0-10}V${Y(10)+40}M${A+125},${Y0-10}V${Y(10)+40}"/>`;
  for(let k=0;k<=10;k++)s+=`<path class="ln" d="M${A},${Y(k)}L${A-Lx},${Y(k)-Ly}"/>`;
  for(let k=0;k<10;k++){
    const v=sp[f][k],yk=Y(k),y1=Y(k+1),ym=(yk+y1)/2,cx=A-85*c,cy=ym-85*n,col=PAL[(f*7+k*3)%PAL.length],g='translate(-20 -40)';
    s+=`<polygon class="${v?'bo':'bf'}${!v&&fx&&k===ch?' fl2':''}" points="${A},${yk} ${A-Lx},${yk-Ly} ${A-Lx},${y1-Ly} ${A},${y1}"/><text class="mu" x="${A-132*c}" y="${ym-132*n+5}" text-anchor="middle" style="font-size:15px">${String(k+1).padStart(2,'0')}</text>`;
    if(!v)s+=`<text class="ok" x="${cx}" y="${cy+7}" text-anchor="middle" style="font-size:22px">ว่าง</text>`;
    else if(fx&&k===ch)s+=`<g style="--cc:${col}"><g transform="rotate(90) scale(.8) ${g}">${CARG}</g><animateMotion dur="1.7s" fill="freeze" rotate="auto" path="M${A+55},${Y(10)+30}L${A+55},${ym+95}Q${cx+114},${cy+37} ${cx},${cy}"/></g>`;
    else s+=`<g style="--cc:${col}" transform="translate(${cx} ${cy}) rotate(-72) scale(.8) ${g}">${CARG}</g>`;
  }
  for(const y of [Y(8)+10,Y(5),Y(2)])s+=`<path class="ln" d="M${A+50},${y+14}L${A+62},${y}L${A+74},${y+14}"/>`;
  return s+'</svg>';
}

function paint(f,ch,fx){
  const fr=nf(f),t=FL.reduce((s,_,k)=>s+nf(k),0);
  $('pv'+f).innerHTML=plan(f,ch,fx);
  $('a'+f).textContent=fr;
  $('b'+f).textContent=N-fr;
  $('lp'+f).className='lamp '+(fr?'g':'r');
  $('fc'+f).classList.toggle('full',!fr);
  $('nfree').textContent=t;
  $('nocc').textContent=N*FL.length-t;
}

$('grid').innerHTML=[3,2,1,0].map(f=>`<div class="fc" id="fc${f}"><div class="hd"><span class="fn">${f+1}</span><b>${FL[f]}</b><span class="lamp g" id="lp${f}"></span><div class="pls"><span class="pill g">ว่าง <em id="a${f}"></em></span><span class="pill r">ไม่ว่าง <em id="b${f}"></em></span></div></div><div class="pv" id="pv${f}"></div></div>`).join('');
FL.forEach((_,f)=>paint(f));

function evt(){
  const t=FL.reduce((s,_,f)=>s+nf(f),0),p=Math.min(.85,Math.max(.15,t/(N*FL.length))),enter=t>0&&Math.random()<p,want=enter?0:1;
  let c=[];sp.forEach((r,f)=>r.forEach((v,i)=>{if(v===want)c.push([f,i])}));
  if(c.length){
    if(enter&&Math.random()<.6){const lo=Math.min(...c.map(x=>x[0]));c=c.filter(x=>x[0]===lo)}
    const [f,i]=c[Math.floor(Math.random()*c.length)];sp[f][i]=enter?1:0;paint(f,i,1);
  }
  setTimeout(evt,1500+Math.random()*2000);
}

setInterval(()=>{$('clk').textContent=tm()},1000);
$('clk').textContent=tm();
setTimeout(evt,1200);