import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
export const runtime = "nodejs";
export const maxDuration = 300;
const phraseSets: Record<string,string[]> = {
 "定番・挨拶":["おはよう","おやすみ","お疲れ様","ありがとう","よろしく！","ごめん！","今どこ？","向かってます"],
 "返答・相槌":["了解！","りょ！","それな","助かる","なるほど","いいね","厳しい","お断りします"],
 "感情・リアクション":["神","最高","泣いた","限界","しんどい","圧倒的感謝","尊い","草"],
 "作業":["作業中","終わった！","集中","確認します","落ちます","お願いします","バグった","沼"],
 "シュール":["記憶にございません","虚無","息してる？","現場からは以上です","計画通り","解せぬ"]
};
const emojiIdeas=["❤️","✨","💦","💢","❓","❗","💤","🎉","🙏","🔥","💀","🌱","☁️","⭐"];
const faceIdeas=["満面の笑顔","大泣き","怒りで震える","眠くて半目","驚いて目を見開く","虚無の真顔","照れて赤面","ドヤ顔","困り顔","疲れ切ってぐったり","大爆笑","感動して涙"];
function choose<T>(items:T[],n:number):T[]{const shuffled=[...items].sort(()=>Math.random()-.5);return Array.from({length:n},(_,i)=>shuffled[i%shuffled.length]);}
function makePrompts(count:number,mode:string,theme:string){
 const all=Object.values(phraseSets).flat(), pool=theme==="おまかせ"?all:(phraseSets[theme]||all);
 const hints:Record<string,string>={"定番・挨拶":"friendly greeting and daily communication situations","返答・相槌":"quick replies, agreement, hesitation, acknowledgement and reactions","感情・リアクション":"strong emotional reactions such as joy, sadness, gratitude, surprise and exhaustion","作業":"work, focus, checking, finishing tasks, logging off and troubleshooting","シュール":"dry humor, absurdity, deadpan reactions and slightly sarcastic situations","おまかせ":"a balanced mix of greetings, replies, emotions, work and dry humor"};
 const hint=hints[theme]||hints["おまかせ"];
 if(mode==="text")return choose(pool,count).map((p,i)=>`Sticker ${i+1}: Japanese phrase exactly "${p}". Create a distinct expressive pose matching the phrase.`);
 if(mode==="emoji")return choose(emojiIdeas,count).map((p,i)=>`Sticker ${i+1}: ${hint}. Communicate one distinct situation using the visual symbol ${p}; no letters, words, numbers, or speech bubbles.`);
 return choose(faceIdeas,count).map((p,i)=>`Sticker ${i+1}: ${hint}. Show ${p} in a way that clearly communicates a distinct everyday reaction; no text, letters, emoji, symbols, icons, or speech bubbles.`);
}
async function openAIImage(image:Buffer,prompt:string){
 const key=process.env.OPENAI_API_KEY;
 if(!key)throw new Error("OPENAI_API_KEYが設定されていません。Vercelの環境変数を確認してください。");
 const form=new FormData();
 form.append("model",process.env.OPENAI_IMAGE_MODEL||"gpt-image-2.5-sunburst");
 form.append("prompt",prompt);form.append("size","1024x1024");form.append("quality","medium");
 form.append("background","transparent");form.append("output_format","png");
 form.append("image[]",new Blob([new Uint8Array(image)],{type:"image/png"}),"reference.png");
 const res=await fetch("https://api.openai.com/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:form});
 const data=await res.json();if(!res.ok)throw new Error(data?.error?.message||"画像生成APIでエラーが発生しました。");
 const b64=data?.data?.[0]?.b64_json;if(!b64)throw new Error("画像生成APIから画像データが返りませんでした。");
 return Buffer.from(b64,"base64");
}
export async function POST(req:NextRequest){
 try{
  const fd=await req.formData(),upload=fd.get("image");
  if(!(upload instanceof File))return NextResponse.json({error:"画像をアップロードしてください。"},{status:400});
  const count=Math.min(40,Math.max(1,Math.floor(Number(fd.get("count")||16))));
  const mode=String(fd.get("mode")||"text"),theme=String(fd.get("theme")||"おまかせ");
  const font=String(fd.get("font")||"丸ゴシック"),extra=String(fd.get("extra")||"");
  const raw=Buffer.from(await upload.arrayBuffer());
  const reference=await sharp(raw).rotate().resize(1024,1024,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  const prompts=makePrompts(count,mode,theme),generated:Buffer[]=[];
  for(let i=0;i<prompts.length;i++){
   const textRule=mode==="text"?`Render the Japanese phrase exactly and legibly. Typography style: ${font}. The phrase is part of the sticker artwork.`:"Do not include any text.";
   const prompt=["Edit the supplied reference image into ONE standalone LINE chat sticker.","Preserve the exact same main character identity, species, face design, colors, costume, proportions, and distinctive details from the reference.","Do not add extra characters. Use a new pose and composition, centered, full subject visible, with generous transparent padding on every side.","Clean polished sticker illustration, crisp edges, visually readable at small size. No frame, no panel, no grid, no background, no watermark.","Transparent background. The output must have real alpha transparency, not a checkerboard or white fill.",prompts[i],textRule,extra?`Additional direction: ${extra}`:""].filter(Boolean).join("\n");
   generated.push(await openAIImage(reference,prompt));
  }
  const cols=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/cols),cell=512,gutter=28,outer=32;
  const width=outer*2+cols*cell+(cols-1)*gutter,height=outer*2+rows*cell+(rows-1)*gutter;
  const composites:sharp.OverlayOptions[]=[];
  for(let i=0;i<generated.length;i++){
   const x=outer+(i%cols)*(cell+gutter),y=outer+Math.floor(i/cols)*(cell+gutter);
   const tile=await sharp(generated[i]).resize(cell,cell,{fit:"contain"}).png().toBuffer();
   composites.push({input:tile,left:x,top:y});
  }
  const sheet=await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).png().toBuffer();
  return new NextResponse(new Uint8Array(sheet),{headers:{"Content-Type":"image/png","Content-Disposition":'attachment; filename="stamp-sheet.png"',"Cache-Control":"no-store"}});
 }catch(e){const message=e instanceof Error?e.message:"生成処理に失敗しました。";return NextResponse.json({error:message},{status:500});}
}