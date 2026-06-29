// DEV-ONLY OCR test harness (not shipped). Requires: npm i -D sharp
// Run: node scripts/ocr-harness.mjs static/ocr-samples/giga.jpg
// Runs the panel-reader pipeline headlessly against a fixture so OCR
// changes can be verified locally instead of via live phone testing.

import sharp from 'sharp';
import { createWorker } from 'tesseract.js';
const FILE=process.argv[2]||'/home/user/tekos/static/ocr-samples/giga.jpg',TDIR='/home/user/tekos/static/tesseract';
async function regionRGB(file,box,w,h){const left=Math.max(0,Math.round(box.x)),top=Math.max(0,Math.round(box.y)),width=Math.max(1,Math.round(box.w)),height=Math.max(1,Math.round(box.h));return await sharp(file).extract({left,top,width,height}).resize(w,h,{fit:'fill'}).removeAlpha().raw().toBuffer();}
function minChannel(rgb,w,h){const mn=new Uint8Array(w*h);for(let p=0,i=0;p<w*h;p++,i+=3)mn[p]=Math.min(rgb[i],rgb[i+1],rgb[i+2]);return mn;}
function adaptiveBin(mn,w,h){const ii=new Float64Array((w+1)*(h+1));for(let y=0;y<h;y++){let rs=0;for(let x=0;x<w;x++){rs+=mn[y*w+x];ii[(y+1)*(w+1)+(x+1)]=ii[y*(w+1)+(x+1)]+rs;}}const rad=Math.max(6,Math.round(h*0.07)),C=22;const bin=new Uint8Array(w*h);for(let y=0;y<h;y++){const y0=Math.max(0,y-rad),y1=Math.min(h-1,y+rad);for(let x=0;x<w;x++){const x0=Math.max(0,x-rad),x1=Math.min(w-1,x+rad);const area=(x1-x0+1)*(y1-y0+1);const sum=ii[(y1+1)*(w+1)+(x1+1)]-ii[y0*(w+1)+(x1+1)]-ii[(y1+1)*(w+1)+x0]+ii[y0*(w+1)+x0];bin[y*w+x]=(mn[y*w+x]>sum/area+C&&mn[y*w+x]>55)?1:0;}}return bin;}
function median(a){const s=a.slice().sort((x,y)=>x-y);return s[Math.floor(s.length/2)]||0;}
async function findPanelBox(file,W0,H0){const W=120,H=Math.max(1,Math.round(H0/W0*W));const rgb=await sharp(file).resize(W,H,{fit:'fill'}).removeAlpha().raw().toBuffer();const lum=new Float32Array(W*H);for(let i=0,p=0;p<W*H;p++,i+=3)lum[p]=0.299*rgb[i]+0.587*rgb[i+1]+0.114*rgb[i+2];const colM=[];for(let x=0;x<W;x++){let s=0;for(let y=0;y<H;y++)s+=lum[y*W+x];colM.push(s/H);}const cMed=median(colM);const cOK=x=>colM[x]>Math.max(28,cMed*0.45)&&colM[x]<cMed+38;let b0=0,b1=-1,s=-1;for(let i=0;i<=W;i++){const on=i<W&&cOK(i);if(on){if(s<0)s=i;}else if(s>=0){if(i-1-s>b1-b0){b0=s;b1=i-1;}s=-1;}}const sx=W0/W;return{x:b0*sx,y:0,w:(b1-b0+1)*sx,h:H0};}

const meta=await sharp(FILE).metadata();const W0=meta.width,H0=meta.height;
const pb=await findPanelBox(FILE,W0,H0);const px=pb.w*0.04;const x=Math.max(0,pb.x-px);const box={x,y:0,w:Math.min(W0-x,pb.w+px*2),h:H0};
const scale=Math.max(0.25,Math.min(8,1500/box.h));const w=Math.round(box.w*scale),h=Math.round(box.h*scale);
const bin=adaptiveBin(minChannel(await regionRGB(FILE,box,w,h),w,h),w,h);

// connected components (8-conn)
const lab=new Int32Array(w*h).fill(0);let nc=0;const comps=[];const stack=new Int32Array(w*h);
for(let p0=0;p0<w*h;p0++){if(!bin[p0]||lab[p0])continue;nc++;let sp=0;stack[sp++]=p0;lab[p0]=nc;let minx=w,maxx=0,miny=h,maxy=0,cnt=0;
  while(sp){const p=stack[--sp];const py=(p/w)|0,pxx=p%w;cnt++;if(pxx<minx)minx=pxx;if(pxx>maxx)maxx=pxx;if(py<miny)miny=py;if(py>maxy)maxy=py;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const ny=py+dy,nx=pxx+dx;if(ny<0||nx<0||ny>=h||nx>=w)continue;const q=ny*w+nx;if(bin[q]&&!lab[q]){lab[q]=nc;stack[sp++]=q;}}}
  comps.push({minx,maxx,miny,maxy,cnt,bw:maxx-minx+1,bh:maxy-miny+1});}
// slant: x-centroid shift top-third vs bottom-third (diagonal '/' vs vertical '1')
const topSX=new Float64Array(nc+1),topN=new Int32Array(nc+1),botSX=new Float64Array(nc+1),botN=new Int32Array(nc+1);
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const l=lab[y*w+x];if(!l)continue;const c=comps[l-1];const t=c.miny+c.bh*0.33,b=c.maxy-c.bh*0.33;if(y<=t){topSX[l]+=x;topN[l]++;}else if(y>=b){botSX[l]+=x;botN[l]++;}}
for(let i=0;i<comps.length;i++){const l=i+1;comps[i].slant=(topN[l]&&botN[l])?Math.abs(botSX[l]/botN[l]-topSX[l]/topN[l]):0;}
const medH=median(comps.filter(c=>c.cnt>50&&c.bh>=12&&c.bh<=80).map(c=>c.bh));
// classify
function isDigit(c){const fill=c.cnt/(c.bw*c.bh),aspect=c.bh/c.bw;
  if(c.cnt<40)return false;                 // noise speck
  if(c.bh<medH*0.5)return false;            // too short
  if(c.bh>medH*1.7||c.bw>medH*1.9)return false; // icon
  if(c.bh<=3)return false;                  // underline
  if(c.bw<medH*0.8&&c.bh>medH*0.55&&c.slant>medH*0.28)return false; // slash (diagonal)
  return true;}
const digits=comps.filter(isDigit);
console.log(`comps=${comps.length} medH=${medH} digits=${digits.length}`);
// DIAGNOSTIC: dump comps in HP row band
const band=comps.filter(c=>{const cy=(c.miny+c.maxy)/2;return cy>820&&cy<875&&c.cnt>=15;}).sort((a,b)=>a.minx-b.minx);
console.log('HP-row comps (x: bw x bh, cnt, fill, aspect):');
for(const c of band){const fill=(c.cnt/(c.bw*c.bh)).toFixed(2),asp=(c.bh/c.bw).toFixed(2);console.log(`  x${c.minx}-${c.maxx} ${c.bw}x${c.bh} cnt=${c.cnt} fill=${fill} asp=${asp}`);}

// render digit-only image
const out=new Uint8Array(w*h);
for(let p=0;p<w*h;p++){if(!bin[p])continue;const comp=comps[lab[p]-1];if(comp&&isDigit(comp))out[p]=1;}

const g=Buffer.alloc(w*h);for(let p=0;p<w*h;p++)g[p]=out[p]?0:255;
const png=await sharp(g,{raw:{width:w,height:h,channels:1}}).png().toBuffer();
await sharp(png).toFile('/tmp/digits.png');
const worker=await createWorker('eng',1,{langPath:TDIR,corePath:TDIR,gzip:true,cacheMethod:'none'});
await worker.setParameters({tessedit_pageseg_mode:'6',tessedit_char_whitelist:'0123456789 ',preserve_interword_spaces:'1'});
const r=await worker.recognize(png);
const leftStats=['HP','STA','OXY','FOOD'],rightStats=['WGT','MEL',null,'CRA'];const stats={};let si=0;
console.log('--- digits-only PSM6 ---');
for(const line of r.data.text.split('\n')){const nums=(line.match(/\d+/g)||[]).map(Number);if(nums.length>=6&&nums[0]<=255&&nums[3]<=255){console.log('STAT row:',nums.join(','));if(si<4){if(leftStats[si])stats[leftStats[si]]=nums[0];if(rightStats[si])stats[rightStats[si]]=nums[3];si++;}}else if(nums.length)console.log('  skip:',nums.join(','));}
await worker.terminate();
console.log('\nPARSED:',JSON.stringify(stats));
console.log('TRUTH: {"HP":51,"STA":53,"OXY":55,"FOOD":47,"WGT":47,"MEL":50}');
