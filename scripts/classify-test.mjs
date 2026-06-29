import sharp from 'sharp';import fs from 'fs';
const T=JSON.parse(fs.readFileSync('/tmp/templates.json','utf8'));const {NW,NH}=T;
// add digit 8 from montage glyphs.json (the "528" level -> index 14 is the 8)
const G=JSON.parse(fs.readFileSync('/tmp/glyphs.json','utf8'));
if(!T.templates[8]) T.templates[8]=G.glyphs[14];
fs.writeFileSync('/tmp/templates.json',JSON.stringify(T));
// montage to verify all 10
{const SC=4,GAP=4,cw=NW*SC+GAP,MW=10*cw+GAP,MH=NH*SC+2*GAP;const img=Buffer.alloc(MW*MH,200);for(let d=0;d<10;d++){const t=T.templates[d];if(!t)continue;const cx=d*cw+GAP;for(let y=0;y<NH;y++)for(let x=0;x<NW;x++){const v=t[y*NW+x]?0:255;for(let yy=0;yy<SC;yy++)for(let xx=0;xx<SC;xx++)img[(GAP+y*SC+yy)*MW+(cx+x*SC+xx)]=v;}}await sharp(img,{raw:{width:MW,height:MH,channels:1}}).png().toFile('/tmp/templates.png');}
// classifier
function classify(g){let best=-1,bestS=-1;for(let d=0;d<10;d++){const t=T.templates[d];if(!t)continue;let inter=0,uni=0;for(let i=0;i<NW*NH;i++){if(g[i]||t[i])uni++;if(g[i]&&t[i])inter++;}const s=uni?inter/uni:0;if(s>bestS){bestS=s;best=d;}}return best;}
// reuse pipeline + base-CC extraction to classify bases, compare to GT
const GT={'static/ocr-samples/giga.jpg':[51,47,53,50,55,0,47,0],'static/ocr-samples/mororex.png':[53,55,55,56,32,0,42,0],'static/ocr-samples/4wolf.webp':[65,59,51,56,61,0,52,0],'static/ocr-samples/lightning-wyvern.png':[59,62,52,57,53,0,50,0]};
function median(a){const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]||0;}
async function regionRGB(file,box,w,h){const left=Math.max(0,Math.round(box.x)),top=Math.max(0,Math.round(box.y)),width=Math.max(1,Math.round(box.w)),height=Math.max(1,Math.round(box.h));return await sharp(file).extract({left,top,width,height}).resize(w,h,{fit:'fill'}).removeAlpha().raw().toBuffer();}
function minCh(rgb,w,h){const mn=new Uint8Array(w*h);for(let p=0,i=0;p<w*h;p++,i+=3)mn[p]=Math.min(rgb[i],rgb[i+1],rgb[i+2]);return mn;}
function adaptiveBin(mn,w,h){const ii=new Float64Array((w+1)*(h+1));for(let y=0;y<h;y++){let rs=0;for(let x=0;x<w;x++){rs+=mn[y*w+x];ii[(y+1)*(w+1)+(x+1)]=ii[y*(w+1)+(x+1)]+rs;}}const rad=Math.max(6,Math.round(h*0.07)),C=9;const bin=new Uint8Array(w*h);for(let y=0;y<h;y++){const y0=Math.max(0,y-rad),y1=Math.min(h-1,y+rad);for(let x=0;x<w;x++){const x0=Math.max(0,x-rad),x1=Math.min(w-1,x+rad);const ar=(x1-x0+1)*(y1-y0+1);const sm=ii[(y1+1)*(w+1)+(x1+1)]-ii[y0*(w+1)+(x1+1)]-ii[(y1+1)*(w+1)+x0]+ii[y0*(w+1)+x0];bin[y*w+x]=(mn[y*w+x]>sm/ar+C&&mn[y*w+x]>55)?1:0;}}const cl=new Uint8Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;if(!bin[p])continue;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dy||dx)&&bin[(y+dy)*w+(x+dx)])n++;cl[p]=n>=2?1:0;}return cl;}
async function panelBox(file,W0,H0){const W=120,H=Math.round(H0/W0*W);const rgb=await sharp(file).resize(W,H,{fit:'fill'}).removeAlpha().raw().toBuffer();const lum=new Float32Array(W*H);for(let i=0,p=0;p<W*H;p++,i+=3)lum[p]=0.299*rgb[i]+0.587*rgb[i+1]+0.114*rgb[i+2];const cm=[];for(let x=0;x<W;x++){let s=0;for(let y=0;y<H;y++)s+=lum[y*W+x];cm.push(s/H);}const md=median(cm);const ok=x=>cm[x]>Math.max(28,md*0.45)&&cm[x]<md+38;let b0=0,b1=-1,s=-1;for(let i=0;i<=W;i++){const on=i<W&&ok(i);if(on){if(s<0)s=i;}else if(s>=0){if(i-1-s>b1-b0){b0=s;b1=i-1;}s=-1;}}const sx=W0/W;return{x:b0*sx,w:(b1-b0+1)*sx};}
function normGlyph(bin,w,c){const sc=Math.min(NW/c.bw,NH/c.bh);const tw=Math.max(1,Math.round(c.bw*sc)),th=Math.max(1,Math.round(c.bh*sc));const ox=Math.floor((NW-tw)/2),oy=Math.floor((NH-th)/2);const out=new Uint8Array(NW*NH);for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const sx2=c.mnx+Math.min(c.bw-1,Math.floor(x/sc)),sy2=c.mny+Math.min(c.bh-1,Math.floor(y/sc));if(bin[sy2*w+sx2])out[(oy+y)*NW+(ox+x)]=1;}return out;}
let tot=0,ok=0;
for(const FILE of Object.keys(GT)){
  const meta=await sharp(FILE).metadata();const W0=meta.width,H0=meta.height;
  const pb=await panelBox(FILE,W0,H0);const px=pb.w*0.04;const xx0=Math.max(0,pb.x-px);const box={x:xx0,y:0,w:Math.min(W0-xx0,pb.w+px*2),h:H0};
  const scale=Math.max(0.25,Math.min(8,1500/box.h));const w=Math.round(box.w*scale),h=Math.round(box.h*scale);
  const bin=adaptiveBin(minCh(await regionRGB(FILE,box,w,h),w,h),w,h);
  const lab=new Int32Array(w*h),stk=new Int32Array(w*h);let nc=0;const comps=[];
  for(let p0=0;p0<w*h;p0++){if(!bin[p0]||lab[p0])continue;nc++;let sp=0;stk[sp++]=p0;lab[p0]=nc;let a=w,b=0,c=h,d=0,cnt=0;while(sp){const p=stk[--sp];const py=(p/w)|0,pxx=p%w;cnt++;if(pxx<a)a=pxx;if(pxx>b)b=pxx;if(py<c)c=py;if(py>d)d=py;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const ny=py+dy,nx=pxx+dx;if(ny<0||nx<0||ny>=h||nx>=w)continue;const q=ny*w+nx;if(bin[q]&&!lab[q]){lab[q]=nc;stk[sp++]=q;}}}comps.push({mnx:a,mxx:b,mny:c,mxy:d,cnt,bw:b-a+1,bh:d-c+1});}
  const tsx=new Float64Array(nc+1),tn=new Int32Array(nc+1),bsx=new Float64Array(nc+1),bn=new Int32Array(nc+1);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const l=lab[y*w+x];if(!l)continue;const cc=comps[l-1];const t=cc.mny+cc.bh*0.33,b2=cc.mxy-cc.bh*0.33;if(y<=t){tsx[l]+=x;tn[l]++;}else if(y>=b2){bsx[l]+=x;bn[l]++;}}
  for(let i=0;i<nc;i++){const l=i+1;comps[i].slant=(tn[l]&&bn[l])?Math.abs(bsx[l]/bn[l]-tsx[l]/tn[l]):0;}
  const medH=median(comps.filter(c=>c.cnt>50&&c.bh>=12&&c.bh<=80).map(c=>c.bh))||20;
  const glyph=c=>c.cnt>=40&&c.bh>medH*0.5&&c.bh<=medH*1.7&&c.bw<=medH*1.9;const gs=comps.filter(glyph);
  const rowTol=medH*0.7;const rows=[];for(const c of gs.slice().sort((a,b)=>(a.mny+a.mxy)-(b.mny+b.mxy))){const cy=(c.mny+c.mxy)/2;const last=rows[rows.length-1];if(last&&Math.abs(cy-last.cy)<=rowTol){last.items.push(c);last.cy=(last.cy*last.n+cy)/(last.n+1);last.n++;}else rows.push({cy,n:1,items:[c]});}
  const cand=[];for(const row of rows){if(row.cy<h*0.5)continue;const items=row.items.slice().sort((a,b)=>a.mnx-b.mnx);const cells=[];let cur=null;for(const c of items){if(cur&&c.mnx-cur.mxx<medH*1.3){cur.push(c);cur.mxx=Math.max(cur.mxx,c.mxx);}else{cur=[c];cur.mxx=c.mxx;cells.push(cur);}}const big=cells.filter(c=>c.length>=2);if(big.length>=2)cand.push(big);}
  const stat=cand.slice(0,4);const gt=GT[FILE];const got=[];
  const baseCCs=(items)=>{const it=items.slice().sort((a,b)=>a.mnx-b.mnx);const base=[it[0]];for(let i=1;i<it.length;i++){const g=it[i];if(g.bw>medH*1.15||(g.slant>medH*0.28&&g.bw<medH*0.85)||g.mnx-it[i-1].mxx>medH*0.7)break;base.push(g);}return base;};
  for(let i=0;i<4;i++){for(let s=0;s<2;s++){const cell=stat[i]&&stat[i][s];const exp=gt[i*2+s];let val='';if(cell){for(const cc of baseCCs(cell))val+=classify(normGlyph(bin,w,cc));}const v=parseInt(val,10);tot++;if(v===exp)ok++;else got.push(`${['HP','WGT','STA','MEL','OXY','Spd','FOOD','Cra'][i*2+s]}:exp${exp}got${val||'?'}`);}}
  console.log(FILE.split('/').pop(),got.length?('MISS '+got.join(' ')):'ALL OK');
}
console.log(`\nTEMPLATE CLASSIFIER: ${ok}/${tot} base values correct`);
