// node tests.cjs — runs the page's own script on a stub DOM and checks teaching content against it.
const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(__dirname+'/index.html','utf8');
const els={};
const stub=id=>els[id]||(els[id]={id,value:'',checked:false,hidden:false,type:'text',tagName:'DIV',selectedIndex:0,textContent:'',innerHTML:'',className:'',style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},setAttribute(){},removeAttribute(){},scrollIntoView(){},focus(){},showModal(){},close(){}});
for(const m of html.matchAll(/<(input|select)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
  const e=stub(m[2]);e.tagName=m[1].toUpperCase();
  const t=m[0].match(/type="([^"]+)"/);if(t)e.type=t[1];
  if(/\bchecked\b/.test(m[0]))e.checked=true;
}
// A select's selectedIndex=0 means its first option, which the page relies on when clearing fields.
for(const m of html.matchAll(/<select\b[^>]*\bid="([^"]+)"[^>]*>\s*<option value="([^"]*)"/g)){
  const e=els[m[1]];e.first=m[2];e.value=m[2];
  Object.defineProperty(e,'selectedIndex',{set(){e.value=e.first},get(){return 0}});
}
const body=stub('body');
const ctx=vm.createContext({document:{getElementById:stub,querySelectorAll:()=>[],querySelector:()=>stub('content'),body},window:{scrollTo(){},print(){},addEventListener(){},scrollY:0},location:{hash:'',pathname:'/',search:''},history:{replaceState(){}},navigator:{},confirm:()=>true,setTimeout});
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
vm.runInContext(scripts[0],ctx);
vm.runInContext(scripts[1],ctx);
const {CASES,QUIZ,MAP,BASE,SRC}=vm.runInContext('({CASES,QUIZ,MAP,BASE,SRC})',ctx);
const run=v=>{vm.runInContext('loadValues',ctx)(v,'t');vm.runInContext('recalc',ctx)();return vm.runInContext('getModel',ctx)()};
const stageText=()=>els.stageValue.textContent;

let pass=0,fail=0;
const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
const eq=(a,b,m)=>ok(a===b,`${m}: expected ${b}, got ${a}`);
const pct=(n,d=1)=>n==null?'—':n.toFixed(d)+'%';
const results=m=>({stage:stageText(),kdigo:`${m.g} · ${m.ac}`,fib:m.fib.value==null?'—':m.fib.value.toFixed(2),lsm:m.vcte.band,fast:m.vcte.fast==null?'—':m.vcte.fast.toFixed(3),cvd:pct(m.prevent),asc:pct(m.ascvdRisk),k2:pct(m.kfre2),k5:pct(m.kfre5),
  ldl:`Sampson ${m.lipid.sampson==null?'—':m.lipid.sampson.toFixed(1)}；Friedewald ${m.lipid.fried==null?'—':m.lipid.fried.toFixed(1)}；non-HDL ${m.lipid.nonhdl==null?'—':m.lipid.nonhdl.toFixed(1)}`});

// The six cases: every number shown on the page must equal what the engine produces.
eq(CASES.length,6,'case count');
eq(new Set(CASES.map(c=>c.id)).size,6,'case ids unique');
for(const c of CASES){
  for(const k of ['title','stem','ask','trap','tag'])ok(c[k],`${c.id} has ${k}`);
  ok(c.why.length&&c.next.length&&c.chips.length,`${c.id} lists`);
  c.cite.forEach(k=>ok(SRC[k],`${c.id} cite ${k}`));
  for(const v of c.visits){
    const m=run(v.values),r=results(m);
    for(const [k,e] of Object.entries(v.expect))eq(r[k],e,`${c.id} ${v.label} ${k}`);
    for(const k of Object.keys(v.values))ok(els[k]&&(els[k].tagName!=='DIV'),`${c.id} field ${k} exists`);
    const h=v.values.height/100,b=v.values.weight/(h*h);
    const chip=c.chips.find(x=>x.startsWith('BMI'));
    if(chip&&c.visits.length===1)eq(chip,'BMI '+b.toFixed(1),`${c.id} BMI chip`);
    eq(els.demoBanner.hidden,false,`${c.id} banner shown after loading`);
  }
}
// Claims made in case text that depend on the engine.
const byId=Object.fromEntries(CASES.map(c=>[c.id,c]));
run({...byId.c1.visits[0].values,fibrosis:'F2'});eq(stageText(),'Stage 3','c1: confirmed F2 moves to Stage 3');
const c2=run({...byId.c2.visits[0].values,age:60});ok(c2.fib.value<2.67,'c2 younger FIB-4 still below 2.67');
const c2same=run({...BASE,age:60,ast:43.3,alt:22,plt:228});ok(c2same.fib.value>1.3&&c2same.fib.label==='中間風險','c2: FIB-4 around 1.6 at 60 is intermediate');
ok(results(run(byId.c2.visits[0].values)).fib==='1.62'&&run(byId.c2.visits[0].values).fib.label==='較低風險','c2: 1.62 at 72 is lower risk');
const c3a=run(byId.c3.visits[0].values);ok(c3a.maybeCkd&&!c3a.ckd,'c3 visit 1 CKD awaits confirmation');
const c3b=run(byId.c3.visits[1].values);ok(c3b.ckd&&c3b.r===3&&c3b.kfre5<3,'c3 visit 2 very high KDIGO, 5-y KFRE <3%');
const c4a=run(byId.c4.visits[0].values);ok(c4a.kfre2>10&&c4a.kfre2<=40,'c4 visit 1 2-y KFRE between 10 and 40');
ok(byId.c4.why.join().includes(pct(c4a.kfre2)),'c4 text quotes visit 1 KFRE');
const c4b=run(byId.c4.visits[1].values);ok(byId.c4.why.join().includes(pct(c4b.kfre2)),'c4 text quotes visit 2 KFRE');ok(c4b.kfre2>40,'c4 visit 2 2-y KFRE above 40');ok(!c4b.kidneyFailure,'c4 visit 2 not kidney failure');
const c6=run(byId.c6.visits[0].values);ok(c6.lipid.fried===null&&c6.lipid.level==='warn','c6 Friedewald unavailable');ok(!c6.lipid.attention.some(x=>x.includes('填入 LDL-C')),'c6 LDL gap below the tool warning');eq(Math.round(Math.abs(c6.lipid.ldl-c6.lipid.sampson)),26,'c6 gap');eq(c6.fib.label,'中間風險','c6 FIB-4 band');
// Case 3 and case 4 stages must not change because of lipid or FIB-4 noise.
ok(!results(run(byId.c5.visits[0].values)).stage.includes('4a'),'c5 not 4a');

// Quiz structure.
eq(QUIZ.length,20,'question count');
eq(QUIZ.filter(q=>q.lv==='basic').length,10,'basic count');
eq(QUIZ.filter(q=>q.lv==='adv').length,10,'advanced count');
[0,1,2,3].forEach(a=>eq(QUIZ.filter(q=>q.a===a).length,5,'answer '+'ABCD'[a]));
let longest=0;
QUIZ.forEach((q,i)=>{
  const n='Q'+(i+1);
  eq(new Set(q.o).size,4,n+' four distinct options');
  ok(q.e&&q.s&&SRC[q.l],n+' explanation and source');
  const L=q.o.map(x=>x.length),max=Math.max(...L);
  if(L[q.a]===max&&L.filter(x=>x===max).length===1)longest++;
  if(q.check){
    const c=q.check,check=(chk,v,tag)=>{
      const m=run(v),r=results(m);
      if(chk.stage)eq(stageText(),chk.stage,n+tag+' stage');
      if(chk.fib)eq(r.fib,chk.fib,n+tag+' FIB-4');
      if(chk.kdigo)eq(r.kdigo,chk.kdigo,n+tag+' KDIGO');
      if(chk.r!==undefined)eq(m.r,chk.r,n+tag+' KDIGO risk');
      if(chk.lsm)eq(r.lsm,chk.lsm,n+tag+' VCTE');
      if(chk.maybeCkd)ok(m.maybeCkd,n+tag+' CKD unconfirmed');
      if(chk.friedNull)ok(m.lipid.fried===null,n+tag+' Friedewald null');
      if(chk.cvdNull)ok(m.prevent===null&&m.preventCalc.excluded,n+tag+' PREVENT excluded');
      if(chk.lipid)eq(m.lipid.level,chk.lipid,n+tag+' lipid level');
    };
    const v={...BASE,...c.v};check(c,v,'');
    if(c.alt)check(c.alt,{...v,...c.alt.v},' alt');
  }
});
ok(longest<=7,`correct option is the longest in ${longest}/20`);
eq(QUIZ[0].a,2,'fixed order');

// SHA 2026 Table 2 dyslipidemia thresholds.
const st=v=>{run({...BASE,...v});return stageText()};
eq(st({}),'Stage 0','normal lipids');
eq(st({tg:134}),'Stage 0','TG 134');
eq(st({tg:135}),'Stage 2','TG 135');
eq(st({tg:600}),'Stage 2','TG 600 still counted');
eq(st({tc:310,hdl:80,ldl:100,tg:90}),'Stage 0','TC 310');
eq(st({tc:311,hdl:80,ldl:100,tg:90}),'Stage 2','TC 311');
eq(st({ldl:100}),'Stage 0','LDL 100');
eq(st({tc:180,ldl:101}),'Stage 2','untreated LDL 101');
eq(st({tc:180,ldl:101,statinTx:'unknown'}),'Stage 2','LDL 101, statin unknown');
eq(st({tc:180,ldl:101,statinTx:'yes'}),'資料不足','LDL 101 on statin: not counted, and not Stage 0');
eq(st({tc:180,ldl:90,statinTx:'yes'}),'資料不足','on statin is not Stage 0');
eq(st({ldl:''}),'資料不足','missing LDL is not Stage 0');
eq(st({tc:''}),'資料不足','missing TC is not Stage 0');
eq(st({tc:180,hdl:50,tg:120,ldl:160}),'資料不足','contradictory lipids neither count nor give Stage 0');
ok(run({...BASE,tg:140}).shaLipid&&!run(BASE).shaLipid,'shaLipid flag');
eq(st({height:158,weight:60.4,waist:82,sex:'female'}),'Stage 1','adiposity only stays Stage 1');

// Mind map.
eq(MAP.length,6,'six branches');
eq(MAP.filter(n=>n.side==='l').length,3,'three left branches');
MAP.forEach(n=>{ok(n.items.length>=3&&n.step>=0&&n.step<=5,`map ${n.title}`);n.items.forEach(x=>ok(x[0]&&x[1],`map ${n.title} item`))});

// Engine values that the existing page relies on stay as they were.
eq(results(run(vm.runInContext('demos.a',ctx))).stage,'Stage 3','demo A');
eq(results(run(vm.runInContext('demos.b',ctx))).stage,'Stage 2','demo B: LDL-C 104 counts under SHA');
eq(results(run(vm.runInContext('demos.c',ctx))).stage,'Stage 4a','demo C');

// Page wiring.
['teach-cases','teach-quiz','teach-map','caseList','quizList','mindMap','quizScore','demoBanner','mapToggle','quizReset','demoToCases'].forEach(id=>ok(html.includes(`id="${id}"`),'page has '+id));
['cases','quiz','map'].forEach(v=>ok(html.includes(`data-view="${v}"`),'nav '+v));
ok(els.quizScore.textContent.includes('0／20'),'quiz score rendered');
ok(els.caseList.innerHTML.includes('病例 6'),'cases rendered');
ok(els.mindMap.innerHTML.includes('mm-root'),'map rendered');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
