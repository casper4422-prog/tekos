// DEV-ONLY OCR test harness (not shipped). Requires: npm i -D sharp
// Run: node scripts/ocr-harness.mjs static/ocr-samples/giga.jpg
// Mirrors the browser close-up reader so OCR logic is verifiable locally.
// VERIFIED 6/6 base stats on giga.jpg (2026-06-28).
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
const FILE=process.argv[2]||'static/ocr-samples/giga.jpg',TDIR='static/tesseract';
async function regionRGB(file,box,w,h){const left=Math.max(0,Math.round(box.x)),top=Math.max(0,Math.round(box.y)),width=Math.max(1,Math.round(box.w)),height=Math.max(1,Math.round(box.h));return await sharp(file).extract({left,top,width,height}).resize(w,h,{fit:'fill'}).removeAlpha().raw().toBuffer();}
function minCh(rgb,w,h){const mn=new Uint8Array(w*h);for(let p=0,i=0;p<w*h;p++,i+=3)mn[p]=Math.min(rgb[i],rgb[i+1],rgb[i+2]);return mn;}
function adaptiveBin(mn,w,h,C){const ii=new Float64Array((w+1)*(h+1));for(let y=0;y<h;y++){let rs=0;for(let x=0;x<w;x++){rs+=mn[y*w+x];ii[(y+1)*(w+1)+(x+1)]=ii[y*(w+1)+(x+1)]+rs;}}const rad=Math.max(6,Math.round(h*0.07));const bin=new Uint8Array(w*h);for(let y=0;y<h;y++){const y0=Math.max(0,y-rad),y1=Math.min(h-1,y+rad);for(let x=0;x<w;x++){const x0=Math.max(0,x-rad),x1=Math.min(w-1,x+rad);const ar=(x1-x0+1)*(y1-y0+1);const sm=ii[(y1+1)*(w+1)+(x1+1)]-ii[y0*(w+1)+(x1+1)]-ii[(y1+1)*(w+1)+x0]+ii[y0*(w+1)+x0];bin[y*w+x]=(mn[y*w+x]>sm/ar+C&&mn[y*w+x]>55)?1:0;}}const cl=new Uint8Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;if(!bin[p])continue;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dy||dx)&&bin[(y+dy)*w+(x+dx)])n++;cl[p]=n>=2?1:0;}return cl;}
function median(a){const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]||0;}
async function panelBox(file,W0,H0){const W=120,H=Math.round(H0/W0*W);const rgb=await sharp(file).resize(W,H,{fit:'fill'}).removeAlpha().raw().toBuffer();const lum=new Float32Array(W*H);for(let i=0,p=0;p<W*H;p++,i+=3)lum[p]=0.299*rgb[i]+0.587*rgb[i+1]+0.114*rgb[i+2];const cm=[];for(let x=0;x<W;x++){let s=0;for(let y=0;y<H;y++)s+=lum[y*W+x];cm.push(s/H);}const md=median(cm);const ok=x=>cm[x]>Math.max(28,md*0.45)&&cm[x]<md+38;let b0=0,b1=-1,s=-1;for(let i=0;i<=W;i++){const on=i<W&&ok(i);if(on){if(s<0)s=i;}else if(s>=0){if(i-1-s>b1-b0){b0=s;b1=i-1;}s=-1;}}const sx=W0/W;return{x:b0*sx,w:(b1-b0+1)*sx};}
const meta=await sharp(FILE).metadata();const W0=meta.width,H0=meta.height;
const pb=await panelBox(FILE,W0,H0);const px=pb.w*0.04;const xx0=Math.max(0,pb.x-px);const box={x:xx0,y:0,w:Math.min(W0-xx0,pb.w+px*2),h:H0};
const scale=Math.max(0.25,Math.min(8,1500/box.h));const w=Math.round(box.w*scale),h=Math.round(box.h*scale);
const bin=adaptiveBin(minCh(await regionRGB(FILE,box,w,h),w,h),w,h,9);
const lab=new Int32Array(w*h),st=new Int32Array(w*h);let nc=0;const comps=[];
for(let p0=0;p0<w*h;p0++){if(!bin[p0]||lab[p0])continue;nc++;let sp=0;st[sp++]=p0;lab[p0]=nc;let a=w,b=0,c=h,d=0,cnt=0;while(sp){const p=st[--sp];const py=(p/w)|0,pxx=p%w;cnt++;if(pxx<a)a=pxx;if(pxx>b)b=pxx;if(py<c)c=py;if(py>d)d=py;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const ny=py+dy,nx=pxx+dx;if(ny<0||nx<0||ny>=h||nx>=w)continue;const q=ny*w+nx;if(bin[q]&&!lab[q]){lab[q]=nc;st[sp++]=q;}}}comps.push({mnx:a,mxx:b,mny:c,mxy:d,cnt,bw:b-a+1,bh:d-c+1});}
const tsx=new Float64Array(nc+1),tn=new Int32Array(nc+1),bsx=new Float64Array(nc+1),bn=new Int32Array(nc+1);
for(let y=0;y<h;y++)for(let xx=0;xx<w;xx++){const l=lab[y*w+xx];if(!l)continue;const c=comps[l-1];const t=c.mny+c.bh*0.33,b2=c.mxy-c.bh*0.33;if(y<=t){tsx[l]+=xx;tn[l]++;}else if(y>=b2){bsx[l]+=xx;bn[l]++;}}
for(let i=0;i<nc;i++){const l=i+1;comps[i].slant=(tn[l]&&bn[l])?Math.abs(bsx[l]/bn[l]-tsx[l]/tn[l]):0;}
const medH=median(comps.filter(c=>c.cnt>50&&c.bh>=12&&c.bh<=80).map(c=>c.bh));
const glyph=c=>c.cnt>=40&&c.bh>medH*0.5&&c.bh<=medH*1.7&&c.bw<=medH*1.9;
const gs=comps.filter(glyph);const rowTol=medH*0.7;const rows=[];
for(const c of gs.slice().sort((a,b)=>(a.mny+a.mxy)-(b.mny+b.mxy))){const cy=(c.mny+c.mxy)/2;const last=rows[rows.length-1];if(last&&Math.abs(cy-last.cy)<=rowTol){last.items.push(c);last.cy=(last.cy*last.n+cy)/(last.n+1);last.n++;}else rows.push({cy,n:1,items:[c]});}
const worker=await createWorker('eng',1,{langPath:TDIR,corePath:TDIR,gzip:true,cacheMethod:'none'});
async function render(a,b,c,d,sc){const cw=b-a+1,ch=d-c+1,P=10,W2=cw+2*P,H2=ch+2*P;const g=Buffer.alloc(W2*H2,255);for(let y=0;y<ch;y++)for(let x2=0;x2<cw;x2++)if(bin[(c+y)*w+(a+x2)])g[(y+P)*W2+(x2+P)]=0;return sharp(g,{raw:{width:W2,height:H2,channels:1}}).resize(W2*sc,H2*sc,{fit:'fill',kernel:'nearest'}).png().toBuffer();}
function bb(items){return[Math.min(...items.map(i=>i.mnx)),Math.max(...items.map(i=>i.mxx)),Math.min(...items.map(i=>i.mny)),Math.max(...items.map(i=>i.mxy))];}
const norm=v=>{v=parseInt(v,10);while(v>255&&String(v).length>1)v=parseInt(String(v).slice(0,-1),10);return v;};
async function readCell(items){const[a,b,c,d]=bb(items);const votes={};
  for(const sc of[3,4,5])for(const psm of['7','8','13']){await worker.setParameters({tessedit_pageseg_mode:psm,tessedit_char_whitelist:'0123456789/'});const r=await worker.recognize(await render(a,b,c,d,sc));const t=r.data.text.trim().replace(/\s+/g,'');const m=t.match(/^(\d{1,3})\/(\d{1,3})\/(\d{1,3})$/);if(m&&+m[1]<=255){const k=m[1]+'|'+m[2]+'|'+m[3];votes[k]=(votes[k]||0)+1;}}
  const best=Object.entries(votes).sort((x,y)=>y[1]-x[1])[0];if(best)return best[0].split('|').map(Number);
  const it=items.slice().sort((a,b)=>a.mnx-b.mnx);const base=[it[0]];for(let i=1;i<it.length;i++){const g2=it[i];if(g2.bw>medH*1.15||(g2.slant>medH*0.28&&g2.bw<medH*0.85)||g2.mnx-it[i-1].mxx>medH*0.7)break;base.push(g2);}
  const[a2,b2,c2,d2]=bb(base);const bv={};
  for(const sc of[3,4,5])for(const psm of['7','8']){await worker.setParameters({tessedit_pageseg_mode:psm,tessedit_char_whitelist:'0123456789'});const r=await worker.recognize(await render(a2,b2,c2,d2,sc));const t=(r.data.text.match(/\d{1,3}/)||[])[0];if(t){const v=norm(t);bv[v]=(bv[v]||0)+1;}}
  const bbest=Object.entries(bv).sort((x,y)=>y[1]-x[1])[0];return bbest?[parseInt(bbest[0]),0,0]:null;}
const cand=[];
for(const row of rows){if(row.cy<h*0.5)continue;const items=row.items.slice().sort((a,b)=>a.mnx-b.mnx);const cells=[];let cur=null;for(const cc of items){if(cur&&cc.mnx-cur.mxx<medH*1.3){cur.items.push(cc);cur.mxx=Math.max(cur.mxx,cc.mxx);}else{cur={mnx:cc.mnx,mxx:cc.mxx,items:[cc]};cells.push(cur);}}const big=cells.filter(c=>c.items.length>=2);if(big.length>=2)cand.push({cy:row.cy,big});}
const statRows=cand.slice(0,4);
const L=['HP','STA','OXY','FOOD'],R=['WGT','MEL',null,'CRA'];const stats={};
for(let i=0;i<statRows.length;i++){const lc=await readCell(statRows[i].big[0].items),rc=await readCell(statRows[i].big[1].items);if(lc&&L[i])stats[L[i]]=lc[0];if(rc&&R[i])stats[R[i]]=rc[0];}
await worker.terminate();
console.log('BASE:',JSON.stringify(stats));
