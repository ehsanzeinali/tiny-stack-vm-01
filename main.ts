import{readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync}from"fs";import{join}from"path";
const S=256,C=64,M=256,L=1e6,O=65536,T={U:2,O:3,D:4,B:5,M:6,C:7,R:8,P:9,S:10,O:11},e=new TextEncoder;
function v(p,i){const n=p.length,d=new Int32Array(S);let s=0,c=new Int32Array(C),k=0,m=new Int32Array(M),o=new Uint8Array(O),l=0,h=0,u=0;
while(1){if(u===L)return{stdout:o.slice(0,l),exit:T.S};if(u<0||u>=n)return{stdout:o.slice(0,l),exit:T.P};
const x=p[u];switch(x){case 0:return{stdout:o.slice(0,l),exit:0};
case 1:if(u+1>=n)return{stdout:o.slice(0,l),exit:T.P};if(s>=S)return{stdout:o.slice(0,l),exit:T.O};d[s++]=(p[u+1]<<24)>>24;u+=2;break;
case 2:if(u+4>=n)return{stdout:o.slice(0,l),exit:T.P};if(s>=S)return{stdout:o.slice(0,l),exit:T.O};d[s++]=p[u+1]|p[u+2]<<8|p[u+3]<<16|p[u+4]<<24;u+=5;break;
case 3:if(s<1)return{stdout:o.slice(0,l),exit:T.U};s--;u++;break;
case 4:if(s<1)return{stdout:o.slice(0,l),exit:T.U};if(s+1>S)return{stdout:o.slice(0,l),exit:T.O};d[s]=d[s-1];s++;u++;break;
case 5:if(s<2)return{stdout:o.slice(0,l),exit:T.U};[d[s-1],d[s-2]]=[d[s-2],d[s-1]];u++;break;
case 6:if(s<2)return{stdout:o.slice(0,l),exit:T.U};if(s+1>S)return{stdout:o.slice(0,l),exit:T.O};d[s]=d[s-2];s++;u++;break;
case 7:if(s<3)return{stdout:o.slice(0,l),exit:T.U};[d[s-3],d[s-2],d[s-1]]=[d[s-2],d[s-1],d[s-3]];u++;break;
case 0x10:case 0x11:case 0x12:case 0x13:case 0x14:case 0x15:case 0x16:case 0x18:case 0x19:case 0x1a:case 0x1c:case 0x1d:case 0x1e:case 0x20:case 0x21:case 0x22:{
if(s<2)return{stdout:o.slice(0,l),exit:T.U};const b=d[--s],a=d[--s];let r;
switch(x){case 0x10:r=a+b|0;break;case 0x11:r=a-b|0;break;case 0x12:r=Math.imul(a,b);break;
case 0x13:if(b===0)return{stdout:o.slice(0,l),exit:T.D};r=a===-2147483648&&b===-1?a:a/b|0;break;
case 0x14:if(b===0)return{stdout:o.slice(0,l),exit:T.D};r=b===-1?0:a%b|0;break;
case 0x15:if(b===0)return{stdout:o.slice(0,l),exit:T.D};r=(a>>>0)/(b>>>0)|0;break;
case 0x16:if(b===0)return{stdout:o.slice(0,l),exit:T.D};r=(a>>>0)%(b>>>0)|0;break;
case 0x18:r=a&b;break;case 0x19:r=a|b;break;case 0x1a:r=a^b;break;
case 0x1c:r=a<<(b&31);break;case 0x1d:r=a>>(b&31);break;case 0x1e:r=(a>>>(b&31))|0;break;
case 0x20:r=a===b?1:0;break;case 0x21:r=a<b?1:0;break;case 0x22:r=(a>>>0)<(b>>>0)?1:0;break;
default:return{stdout:o.slice(0,l),exit:T.B}}
d[s++]=r;u++;break}
case 0x17:if(s<1)return{stdout:o.slice(0,l),exit:T.U};d[s-1]=-d[s-1]|0;u++;break;
case 0x1b:if(s<1)return{stdout:o.slice(0,l),exit:T.U};d[s-1]=~d[s-1];u++;break;
case 0x30:case 0x31:case 0x32:{if(u+2>=n)return{stdout:o.slice(0,l),exit:T.P};
const r=(p[u+1]|p[u+2]<<8)<<16>>16,w=u+3,t=x!==0x30;
if(t){if(s<1)return{stdout:o.slice(0,l),exit:T.U};const v=d[--s];t=x===0x31?v===0:v!==0}
u=t?w+r:w;break}
case 0x33:{if(u+2>=n)return{stdout:o.slice(0,l),exit:T.P};if(k===C)return{stdout:o.slice(0,l),exit:T.C};
c[k++]=u+3;u=p[u+1]|p[u+2]<<8;break}
case 0x34:if(k===0)return{stdout:o.slice(0,l),exit:T.R};u=c[--k];break;
case 0x40:if(s<1)return{stdout:o.slice(0,l),exit:T.U};{const a=d[s-1];if(a<0||a>=M)return{stdout:o.slice(0,l),exit:T.M};d[s-1]=m[a];u++;break}
case 0x41:if(s<2)return{stdout:o.slice(0,l),exit:T.U};{const a=d[s-1],v=d[s-2];if(a<0||a>=M)return{stdout:o.slice(0,l),exit:T.M};s-=2;m[a]=v;u++;break}
case 0x50:if(s<1)return{stdout:o.slice(0,l),exit:T.U};{const s=d[--s]+"";const b=e.encode(s);if(l+b.length>O)return{stdout:o.slice(0,l),exit:T.O};o.set(b,l);l+=b.length;u++;break}
case 0x51:if(s<1)return{stdout:o.slice(0,l),exit:T.U};if(l+1>O)return{stdout:o.slice(0,l),exit:T.O};o[l++]=d[--s]&255;u++;break;
case 0x52:if(s>=S)return{stdout:o.slice(0,l),exit:T.O};d[s++]=h<i.length?i[h++]:-1;u++;break;
case 0x53:if(s<1)return{stdout:o.slice(0,l),exit:T.U};return{stdout:o.slice(0,l),exit:d[--s]&255};
default:return{stdout:o.slice(0,l),exit:T.B}}
u++}
}
export function run(p,i){const{stdout,exit}=v(p,i);return{out:stdout,exit}}
function main(){const d=process.env.MAKEFUN_INPUT_DIR,o=process.env.MAKEFUN_OUTPUT_DIR;
if(!d||!o){console.error("MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR must be set");process.exit(1)}
for(const e of readdirSync(d,{withFileTypes:1}))if(e.isDirectory()&&e.name[0]==="i"){
const p=join(d,e.name,"program.bin"),i=join(d,e.name,"input.bin"),s=join(o,e.name,"stdout.bin"),x=join(o,e.name,"exit.txt");
try{const p=new Uint8Array(readFileSync(p)),i=new Uint8Array(readFileSync(i)),{stdout,exit}=v(p,i);
const D=join(o,e.name);if(!existsSync(D))mkdirSync(D,{recursive:1});
writeFileSync(s,stdout);writeFileSync(x,exit+"\n")}catch(e){console.error(e);process.exit(1)}}}
main();