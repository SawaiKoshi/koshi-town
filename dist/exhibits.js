"use strict";

function waitingExhibit(container) {
  container.innerHTML = `
    <p class="source">説明用サンプル · 架空の受付記録</p>
    <div class="time-fields">
      <label>受付時刻<input type="time" value="12:10" required></label>
      <label>案内時刻<input type="time" value="12:25" required></label>
    </div>
    <div class="time-result"><span>待ち時間</span><output aria-live="polite"></output></div>
    <div class="time-adjust"><button type="button">案内を5分早める</button><button type="button">案内を5分遅らせる</button></div>`;
  const [arrival,seated] = container.querySelectorAll("input");
  const result = container.querySelector("output");
  const update = () => {
    const wait = (seated.valueAsNumber-arrival.valueAsNumber)/60000;
    result.textContent = Number.isNaN(wait) ? "両方の時刻を入力してください" :
      wait<0 ? "同日の受付以降の時刻を指定してください" : wait+" 分";
  };
  container.oninput = update;
  container.querySelectorAll("button").forEach((button,i) => {
    button.onclick = () => {
      const current = Number.isFinite(seated.valueAsNumber) ? seated.valueAsNumber : 0;
      seated.valueAsNumber = Math.max(0,Math.min(1439*60000,current+(i ? 5 : -5)*60000));
      update();
    };
  });
  update();
}

function dishExhibit(container) {
  container.innerHTML = `
    <p class="source">実装に基づく平面デモ · Unity / DishDetector.cs</p>
    <p class="board-help" id="dish-help">台をタップするか、台を選んで矢印キーで移動します。点線の円は半径2の検出範囲です。</p>
    <div class="dish-board" tabindex="0" role="group" aria-label="皿の判定台" aria-describedby="dish-help">
      <span class="radius"></span><span class="detector" aria-hidden="true"></span>
    </div>
    <div class="dish-result">選ばれた皿 <output aria-live="polite"></output></div>`;
  const board = container.querySelector(".dish-board");
  const output = container.querySelector("output");
  const radius = board.querySelector(".radius"), detector = board.querySelector(".detector");
  const dishes = [[1.7,1.35],[4.2,3.55],[6.45,1.6]];
  const names = ["A","B","C"];
  const place = (el,[x,y]) => { el.style.left = x/8*100+"%"; el.style.top = y/5*100+"%"; };
  const plates = dishes.map((point,i) => {
    const plate = document.createElement("span");
    plate.className = "plate";
    plate.textContent = names[i];
    board.append(plate);
    place(plate,point);
    return plate;
  });
  let point;
  function move(x,y) {
    point = [Math.max(0,Math.min(8,x)),Math.max(0,Math.min(5,y))];
    place(radius,point);
    place(detector,point);
    const distances = dishes.map(dish=>distance(dish,point));
    const nearest = Math.min(...distances);
    const selected = nearest<=2 ? distances.indexOf(nearest) : -1;
    plates.forEach((plate,i)=>plate.classList.toggle("selected",selected===i));
    output.textContent = selected===-1 ? "範囲内になし" : "皿 "+names[selected];
  }
  board.onclick = e => {
    const rect = board.getBoundingClientRect();
    move((e.clientX-rect.left)/rect.width*8,(e.clientY-rect.top)/rect.height*5);
  };
  board.onkeydown = e => {
    const step = {ArrowLeft:[-.25,0],ArrowRight:[.25,0],ArrowUp:[0,-.25],ArrowDown:[0,.25]}[e.key];
    if (step) { e.preventDefault(); move(point[0]+step[0],point[1]+step[1]); }
  };
  move(3.4,2.9);
}

function sisterExhibit(container) {
  container.innerHTML = `
    <p class="source">実画面 · SISTERの試作サイトより</p>
    <div class="view-switch" role="group" aria-label="表示する実画面"><button>店の入口</button><button>店内</button></div>
    <img class="site-shot" alt="">`;
  const image = container.querySelector("img");
  const buttons = container.querySelectorAll("button");
  function show(i) {
    image.src = "assets/sister-"+(i ? "interior" : "exterior")+".webp";
    image.alt = "SISTER 試作サイトの実画面（"+buttons[i].textContent+"）";
    buttons.forEach((b,j)=>b.setAttribute("aria-pressed",String(i===j)));
  }
  buttons.forEach((b,i)=>b.onclick=()=>show(i));
  show(0);
}

const EXHIBITS = {omachido:waitingExhibit,bushdush:dishExhibit,sister:sisterExhibit};
