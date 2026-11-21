"use strict";
// Footprints and doors use the same ground coordinates as the character.
const PROJECTS = [
  { id:"omachido", number:"01", title:"おまちどう", venue:"まちの食堂", kind:"データ分析", tech:"Python · pandas", color:"#b94c32", tint:"#f7e9d9", sign:"OMACHI", form:"diner",
    lot:[1.55,3.55,3.45,2.5], door:[3.28,6.48], height:3.15, intro:"飲食店で「あと何分ですか？」と聞かれた経験から始めた、待ち時間予測の個人開発です。",
    role:"ウェイティングスタッフとしての経験から課題を整理し、受付・案内時刻や人数、予約の有無を集めて、予測に使うデータを整えています。",
    exhibit:"待ち時間の観察台", about:"モデルを作る前に、何を「待ち時間」として学習させるかを決めます。架空の受付記録で、案内時刻を変えてみてください。", phase:"データ整備・モデル開発中" },
  { id:"bushdush", number:"02", title:"BushDush V2", venue:"ゲーム工房", kind:"ゲーム開発", tech:"Unity · C#", color:"#396575", tint:"#e3ecea", sign:"BUSH DUSH", form:"studio",
    lot:[6.05,1.65,3.35,2.8], door:[7.72,4.9], height:3.8, intro:"Unityで制作している3Dゲームの試作です。工房では、プレイヤーがどの皿を選ぶかを決める処理を体験できます。",
    role:"皿が意図どおりに選ばれない場面を調べ、検出範囲と距離を確認。シーン上に判定範囲を描き、挙動を目で追えるようにしています。",
    exhibit:"皿の判定実験", about:"DishDetector.cs の判定を平面に置き換えた展示です。下の台を押してプレイヤーを動かすと、半径2以内でいちばん近い皿が光ります。", phase:"プロトタイプ開発中" },
  { id:"sister", number:"03", title:"SISTER", venue:"川辺の理容室", kind:"Webデザイン", tech:"Web · UI/UX", color:"#526841", tint:"#e8edde", sign:"SISTER", form:"salon",
    lot:[10.0,4.15,2.95,2.55], door:[11.46,7.12], height:2.8, intro:"父が営む理美容店「SISTER」のWebサイトを再設計しています。店舗の木や緑、入り口から店内へ進む感覚をWebに取り入れました。",
    role:"店舗の要望を聞いて、電話予約を軸にした構成や、スマートフォンでの使いやすさを設計。試作を比べながら表現を調整しています。",
    exhibit:"店頭から店内へ", about:"制作中のWebサイトの実画面です。入口と室内を切り替えて、来店するような画面の流れを見比べられます。", phase:"サイト再設計・試作中" }
];
const HOUSES = [
  {lot:[.9,.65,1.8,1.45], form:"house", roof:"#837f6e", wall:"#e6dac1", height:1.7},
  {lot:[3.15,.65,1.7,1.5], form:"house", roof:"#a57051", wall:"#eddfc1", height:1.5},
  {lot:[10.3,.65,1.75,1.6], form:"house", roof:"#82745f", wall:"#e8dac0", height:1.65},
  {lot:[12.4,1.1,1.4,1.5], form:"house", roof:"#717f70", wall:"#e7debf", height:1.25}
];
const BRIDGES = [[4.8,6.25],[11.65,13.05]];
const CANAL = [8.8,10.8];
const START = [7.35,7.75];
const ROOM_SIZE = [8,6.8];

