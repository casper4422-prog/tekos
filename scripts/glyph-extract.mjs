// Extract normalized digit glyphs from fixtures -> montage PNG + JSON of
// binary bitmaps (for building template-matcher references). Dev tool.
import sharp from 'sharp';
const FILES=process.argv.slice(2);
const NW=16,NH=24; // normalized glyph size
function median(a){const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]||0;}
async function regionRGB(file,box,w,h){const left=Math.max(0,Math.round(box.x)),top=Math.max(0,Math.round(box.y)),width=Math.max(1,Math.round(box.w)),height=Math.max(1,Math.round(box.h));return await sharp(file).extract({left,top,width,height}).resize(w,h,{fit:'fill'}).removeAlpha().raw().toBuffer();}
function minCh(rgb,w,h){const mn=new Uint8Array(w*h);for(let p=0,i=0;p<w*h;p++,i+=3)mn[p]=Math.min(rgb[i],rgb[i+1],rgb[i+2]);return mn;}
function adaptiveBin(mn,w,h){const ii=new Float64Array((w+1)*(h+1));for(let y=0;y<h;y++){let rs=0;for(let x=0;x<w;x++){rs+=mn[y*w+x];ii[(y+1)*(w+1)+(x+1)]=ii[y*(w+1)+(x+1)]+rs;}}const rad=Math.max(6,Math.round(h*0.07)),C=9;const bin=new Uint8Array(w*h);for(let y=0;y<h;y++){const y0=Math.max(0,y-rad),y1=Math.min(h-1,y+rad);for(let x=0;x<w;x++){const x0=Math.max(0,x-rad),x1=Math.min(w-1,x+rad);const ar=(x1-x0+1)*(y1-y0+1);const sm=ii[(y1+1)*(w+1)+(x1+1)]-ii[y0*(w+1)+(x1+1)]-ii[(y1+1)*(w+1)+x0]+ii[y0*(w+1)+x0];bin[y*w+x]=(mn[y*w+x]>sm/ar+C&&mn[y*w+x]>55)?1:0;}}const cl=new Uint8Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const p=y*w+x;if(!bin[p])continue;let n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if((dy||dx)&&bin[(y+dy)*w+(x+dx)])n++;cl[p]=n>=2?1:0;}return cl;}
async function panelBox(file,W0,H0){const W=120,H=Math.round(H0/W0*W);const rgb=await sharp(file).resize(W,H,{fit:'fill'}).removeAlpha().raw().toBuffer();const lum=new Float32Array(W*H);for(let i=0,p=0;p<W*H;p++,i+=3)lum[p]=0.299*rgb[i]+0.587*rgb[i+1]+0.114*rgb[i+2];const cm=[];for(let x=0;x<W;x++){let s=0;for(let y=0;y<H;y++)s+=lum[y*W+x];cm.push(s/H);}const md=median(cm);const ok=x=>cm[x]>Math.max(28,md*0.45)&&cm[x]<md+38;let b0=0,b1=-1,s=-1;for(let i=0;i<=W;i++){const on=i<W&&ok(i);if(on){if(s<0)s=i;}else if(s>=0){if(i-1-s>b1-b0){b0=s;b1=i-1;}s=-1;}}const sx=W0/W;return{x:b0*sx,w:(b1-b0+1)*sx};}
// normalize a glyph CC's bitmap into NW x NH (scale to fit, center)
function normGlyph(bin,w,c){const gw=c.bw,gh=c.bh;const sc=Math.min(NW/gw,NH/gh);const tw=Math.max(1,Math.round(gw*sc)),th=Math.max(1,Math.round(gh*sc));const ox=Math.floor((NW-tw)/2),oy=Math.floor((NH-th)/2);const out=new Uint8Array(NW*NH);for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const sx2=c.mnx+Math.floor(x/sc),sy2=c.mny+Math.floor(y/sc);if(bin[sy2*w+sx2])out[(oy+y)*NW+(ox+x)]=1;}return out;}
const all=[];
for(const FILE of FILES){
  const meta=await sharp(FILE).metadata();const W0=meta.width,H0=meta.height;
  const pb=await panelBox(FILE,W0,H0);const px=pb.w*0.04;const xx0=Math.max(0,pb.x-px);const box={x:xx0,y:0,w:Math.min(W0-xx0,pb.w+px*2),h:H0};
  const scale=Math.max(0.25,Math.min(8,1500/box.h));const w=Math.round(box.w*scale),h=Math.round(box.h*scale);
  const bin=adaptiveBin(minCh(await regionRGB(FILE,box,w,h),w,h),w,h);
  const lab=new Int32Array(w*h),stk=new Int32Array(w*h);let nc=0;const comps=[];
  for(let p0=0;p0<w*h;p0++){if(!bin[p0]||lab[p0])continue;nc++;let sp=0;stk[sp++]=p0;lab[p0]=nc;let a=w,b=0,c=h,d=0,cnt=0;while(sp){const p=stk[--sp];const py=(p/w)|0,pxx=p%w;cnt++;if(pxx<a)a=pxx;if(pxx>b)b=pxx;if(py<c)c=py;if(py>d)d=py;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const ny=py+dy,nx=pxx+dx;if(ny<0||nx<0||ny>=h||nx>=w)continue;const q=ny*w+nx;if(bin[q]&&!lab[q]){lab[q]=nc;stk[sp++]=q;}}}comps.push({mnx:a,mxx:b,mny:c,mxy:d,cnt,bw:b-a+1,bh:d-c+1});}
  const medH=median(comps.filter(c=>c.cnt>50&&c.bh>=12&&c.bh<=80).map(c=>c.bh))||20;
  const glyphs=comps.filter(c=>c.cnt>=40&&c.bh>medH*0.55&&c.bh<=medH*1.5&&c.bw>=medH*0.16&&c.bw<=medH*1.1).sort((a,b)=>(a.mny-b.mny)||(a.mnx-b.mnx));
  for(const c of glyphs)all.push(normGlyph(bin,w,c));
}
console.log('glyphs',all.length);
// montage: 20 per row, each NW*NH scaled x3, 6px gap
const PER=20,SC=3,GAP=6,cellW=NW*SC+GAP,cellH=NH*SC+GAP;const cols=PER,rowsN=Math.ceil(all.length/PER);
const MW=cols*cellW+GAP,MH=rowsN*cellH+GAP;const img=Buffer.alloc(MW*MH,200);
all.forEach((g,i)=>{const cx=(i%PER)*cellW+GAP,cy=Math.floor(i/PER)*cellH+GAP;for(let y=0;y<NH;y++)for(let x=0;x<NW;x++){const v=g[y*NW+x]?0:255;for(let yy=0;yy<SC;yy++)for(let xx=0;xx<SC;xx++)img[(cy+y*SC+yy)*MW+(cx+x*SC+xx)]=v;}});
await sharp(img,{raw:{width:MW,height:MH,channels:1}}).png().toFile('/tmp/glyphs.png');
const fs=await import('fs');fs.writeFileSync('/tmp/glyphs.json',JSON.stringify({NW,NH,PER,glyphs:all.map(g=>Array.from(g))}));
console.log('montage /tmp/glyphs.png  ('+PER+' per row, '+rowsN+' rows)  json /tmp/glyphs.json');
