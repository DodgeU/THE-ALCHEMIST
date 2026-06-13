// --- META PROGRESSION (LOCAL STORAGE) ---
let metaProgression = {
    souls: 0,
    maxAscension: 0,
    discoveredCards: [],
    discoveredRelics: [],
    upgrades: { hpBonus: 0, strBonus: 0, relicBonus: 0 }
};
const upgradeCosts = { hpBonus: [10, 20, 40], strBonus: [30, 60], relicBonus: [50] };
const upgradeTitles = { hpBonus: 'Simyacının Direnci (+10 Max Can)', strBonus: 'Savaşçı Ruhu (+1 Başlangıç Gücü)', relicBonus: 'Zengin Başlangıç (1 Rastgele Yadigâr)' };

function loadMeta() {
    const saved = localStorage.getItem('alchemist_meta');
    if (saved) {
        let p = JSON.parse(saved);
        metaProgression.souls = p.souls || 0;
        metaProgression.upgrades = p.upgrades || { hpBonus: 0, strBonus: 0, relicBonus: 0 };
        metaProgression.maxAscension = p.maxAscension || 0;
        metaProgression.discoveredCards = p.discoveredCards || [];
        metaProgression.discoveredRelics = p.discoveredRelics || [];
    }
}
function saveMeta() { localStorage.setItem('alchemist_meta', JSON.stringify(metaProgression)); }
loadMeta();

function discoverCard(id) { if(!metaProgression.discoveredCards.includes(id)) { metaProgression.discoveredCards.push(id); saveMeta(); } }
function discoverRelic(id) { if(!metaProgression.discoveredRelics.includes(id)) { metaProgression.discoveredRelics.push(id); saveMeta(); } }

function showMetaScreen() {
    switchScreen('meta-screen'); document.getElementById('meta-souls-text').innerText = metaProgression.souls;
    const container = document.getElementById('meta-upgrades-container'); container.innerHTML = '';
    ['hpBonus', 'strBonus', 'relicBonus'].forEach(key => {
        const lvl = metaProgression.upgrades[key]; const maxLvl = upgradeCosts[key].length; const cost = lvl < maxLvl ? upgradeCosts[key][lvl] : 'MAX';
        const card = document.createElement('div'); card.className = 'class-card';
        card.innerHTML = `<div style="font-size: 3rem; margin-bottom: 1rem;">${key==='hpBonus'?'❤️':key==='strBonus'?'💪':'💎'}</div><h3 style="color:var(--accent-gold);">${upgradeTitles[key]}</h3><p style="margin-top:1rem; color:#aaa;">Seviye: ${lvl} / ${maxLvl}</p><button class="main-btn" style="padding: 0.5rem 1rem; font-size: 1rem; margin-top:1rem; width:100%; border-color:${lvl<maxLvl&&metaProgression.souls>=cost?'var(--accent-green)':'#555'}; color:${lvl<maxLvl&&metaProgression.souls>=cost?'#fff':'#555'}" ${lvl<maxLvl&&metaProgression.souls>=cost?'':'disabled'}>${cost === 'MAX' ? 'TAMAMLANDI' : cost + ' Ruh ile Al'}</button>`;
        if(lvl < maxLvl && metaProgression.souls >= cost) { card.querySelector('button').onclick = () => { playSound('heal'); metaProgression.souls -= cost; metaProgression.upgrades[key]++; saveMeta(); showMetaScreen(); }; }
        container.appendChild(card);
    });
}

// --- ASCENSION & COMPENDIUM UI ---
let currentAscension = 0;
function changeAscension(dir) {
    playSound('click');
    currentAscension += dir;
    if(currentAscension < 0) currentAscension = 0;
    if(currentAscension > metaProgression.maxAscension) currentAscension = metaProgression.maxAscension;
    if(currentAscension > 3) currentAscension = 3;
    
    document.getElementById('ascension-display').innerText = currentAscension;
    let desc = "Standart Zorluk";
    if(currentAscension === 1) desc = "Zorluk 1: Elit düşmanlar %20 daha güçlü.";
    if(currentAscension === 2) desc = "Zorluk 2: Kamplar daha az iyileştirir.";
    if(currentAscension === 3) desc = "Zorluk 3: Boss'lar %25 daha ölümcül.";
    document.getElementById('ascension-desc').innerText = desc;
}

function showCompendiumScreen() {
    switchScreen('compendium-screen'); renderCompendium('cards');
}
function renderCompendium(tab) {
    document.getElementById('tab-cards').style.borderColor = tab === 'cards' ? 'var(--accent-purple)' : '#555';
    document.getElementById('tab-relics').style.borderColor = tab === 'relics' ? 'var(--accent-purple)' : '#555';
    const grid = document.getElementById('compendium-grid'); grid.innerHTML = '';
    
    if(tab === 'cards') {
        Object.keys(cardTemplates).forEach(id => {
            const isDisc = metaProgression.discoveredCards.includes(parseInt(id));
            const cardEl = document.createElement('div'); cardEl.className = 'card';
            cardEl.innerHTML = createCardHTML(cardTemplates[id], true);
            if(!isDisc) { cardEl.style.filter = 'brightness(0)'; cardEl.innerHTML = '<div style="font-size:3rem; margin-top:50px;">❓</div><div style="margin-top:20px;">Keşfedilmedi</div>'; }
            grid.appendChild(cardEl);
        });
    } else {
        Object.keys(relicsData).forEach(id => {
            const isDisc = metaProgression.discoveredRelics.includes(id);
            const cardEl = document.createElement('div'); cardEl.className = 'card'; cardEl.style.height = '300px';
            cardEl.innerHTML = createRelicHTML(relicsData[id]);
            if(!isDisc) { cardEl.style.filter = 'brightness(0)'; cardEl.innerHTML = '<div style="font-size:3rem; margin-top:50px;">❓</div><div style="margin-top:20px;">Keşfedilmedi</div>'; }
            grid.appendChild(cardEl);
        });
    }
}

// --- GAME STATE ---
let player = { hp: 65, maxHp: 65, energy: 3, maxEnergy: 3, shield: 0, status: { strength: 0, intangible: 0 }, classType: 'alchemist' };
let enemy = { name: '', hp: 1, maxHp: 1, baseAttack: 0, intent: { type: 'attack', value: 0 }, status: { poison: 0, burn: 0 }, powers: { thorns: 0, regen: 0, platedArmor: 0 }, type: 'normal' };
let gameState = { floor: 1, deck: [], relics: [], potions: [null, null, null], draftType: null };

// --- WEB AUDIO API (SYNTHESIZER) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    if(audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    if(type === 'click') { osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1); gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
    else if(type === 'swish') { osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(300, now + 0.15); gainNode.gain.setValueAtTime(0.2, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.15); osc.start(now); osc.stop(now + 0.15); }
    else if(type === 'hit') { osc.type = 'square'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(10, now + 0.2); gainNode.gain.setValueAtTime(0.4, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
    else if(type === 'shield') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(800, now + 0.3); gainNode.gain.setValueAtTime(0.3, now); gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
    else if(type === 'heal') { osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.setValueAtTime(800, now + 0.1); osc.frequency.setValueAtTime(1000, now + 0.2); gainNode.gain.setValueAtTime(0.2, now); gainNode.gain.linearRampToValueAtTime(0.01, now + 0.4); osc.start(now); osc.stop(now + 0.4); }
}

// --- DATA ---
const potionData = {
    'health': { id: 'health', icon: '🍷', name: 'Can İksiri', desc: 'Anında 20 HP iyileştirir.', color: '#ff2a4a' },
    'explosive': { id: 'explosive', icon: '💣', name: 'Patlayıcı Şişe', desc: 'Düşmana anında 15 Hasar vurur.', color: '#ffaa00' },
    'ghost': { id: 'ghost', icon: '👻', name: 'Hayalet İksiri', desc: '1 Tur Dokunulmazlık.', color: '#aaaaaa' }
};

const mapEvents = [
    { title: 'Kanlı Altar', desc: 'Taştan bir sunak buldun. Kanını akıtıp güce sahip olacak mısın?', choices: [{ text: 'Kanını Akıt (15 Hasar Al, Yadigâr Kazan)', action: () => { takePlayerDamage(15); if(player.hp>0) { let avail = Object.keys(relicsData).filter(id => !hasRelic(id)); if(avail.length>0) gainRelic(avail[Math.floor(Math.random()*avail.length)]); } gameState.floor++; showMapScreen(); } }, { text: 'Ayrıl', action: () => { gameState.floor++; showMapScreen(); } }] },
    { title: 'Ölü Simyacı', desc: 'Çürümüş cesette şişeler var. Birini alabilirsin.', choices: [{ text: 'İksir Al', action: () => { const p = gainRandomPotion(); if(p) alert(`Aldığın İksir: ${potionData[p].name}`); gameState.floor++; showMapScreen(); } }, { text: 'Kart Al', action: () => { showRewardScreen(false, true); } }, { text: 'Dokunma', action: () => { gameState.floor++; showMapScreen(); } }] }
];

const cardTemplates = {
    1: { id: 1, title: 'Sarmaşık', type: 'Yetenek', cost: 1, value: 4, desc: 'Düşmana 4 Zehir uygular.', color1: '#00ff88', color2: '#005522', shape: 'polygon(50% 0%, 80% 100%, 20% 100%)', effect: 'apply_poison', particle: 'poison' },
    2: { id: 2, title: 'Katalizör', type: 'Yetenek', cost: 2, value: 2, desc: 'Düşmanın Zehrini 2\'ye katlar.', color1: '#00ff00', color2: '#002200', shape: 'circle(50% at 50% 50%)', effect: 'double_poison', particle: 'poison' },
    3: { id: 3, title: 'Zehirli Hançer', type: 'Saldırı', cost: 1, baseValue: 3, value: 2, desc: '{D} Hasar vurur, 2 Zehir uygular.', color1: '#00ff88', color2: '#555', shape: 'polygon(50% 0%, 60% 100%, 40% 100%)', effect: 'attack_poison', particle: 'poison' },
    4: { id: 4, title: 'Zehir Kalkanı', type: 'Defans', cost: 2, value: 2, desc: 'Düşmandaki her Zehir için 2 Kalkan kazan.', color1: '#00ff88', color2: '#00aaff', shape: 'polygon(0% 20%, 100% 20%, 80% 100%, 20% 100%)', effect: 'shield_per_poison', particle: 'shield' },
    5: { id: 5, title: 'Ölümcül Karışım', type: 'Yetenek', cost: 1, value: 3, desc: 'Düşmanda Zehir varsa 3 kart çek.', color1: '#88ff00', color2: '#225500', shape: 'circle(40% at 50% 50%)', effect: 'draw_if_poison', particle: 'draw' },
    6: { id: 6, title: 'Veba', type: 'Yetenek', cost: 2, value: 0, desc: 'Zehrini siler, sildiği kadar Kalkan kazandırır.', color1: '#00ffaa', color2: '#003322', shape: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', effect: 'convert_poison', particle: 'shield' },
    7: { id: 7, title: 'Çürütme', type: 'Yetenek', cost: 0, value: 2, desc: '2 Zehir uygular.', color1: '#55ff55', color2: '#113311', shape: 'polygon(0% 0%, 100% 100%, 0% 100%)', effect: 'apply_poison', particle: 'poison' },
    8: { id: 8, title: 'Kara Lotus', type: 'Yetenek', cost: 1, value: 10, desc: '10 Zehir uygular. Kendine 3 hasar vur.', color1: '#33ff33', color2: '#000000', shape: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)', effect: 'lotus_poison', particle: 'blood' },
    9: { id: 9, title: 'Kükürt', type: 'Saldırı', cost: 1, baseValue: 6, desc: '{D} Hasar vurur.', color1: '#ffaa00', color2: '#ff2a4a', shape: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)', effect: 'attack', particle: 'fire' },
    10: { id: 10, title: 'Kızgın Yağ', type: 'Yetenek', cost: 1, value: 3, desc: '3 Yanık uygular.', color1: '#ff5500', color2: '#880000', shape: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)', effect: 'apply_burn', particle: 'fire' },
    11: { id: 11, title: 'Ateşle', type: 'Saldırı', cost: 1, baseValue: 3, desc: '{D} Hasar. (Yanık başına +3 Hasar)', color1: '#ff0000', color2: '#ffff00', shape: 'polygon(50% 0%, 100% 100%, 0% 100%)', effect: 'combo_burn', particle: 'fire' },
    12: { id: 12, title: 'Ejderha Nefesi', type: 'Saldırı', cost: 2, baseValue: 10, value: 2, desc: '{D} Hasar. 2 Yanık uygular.', color1: '#ff2a4a', color2: '#550000', shape: 'polygon(0% 50%, 100% 0%, 100% 100%)', effect: 'attack_burn', particle: 'fire' },
    13: { id: 13, title: 'Ateş Dansı', type: 'Yetenek', cost: 0, value: 0, desc: 'Yanıkları siler. Silinen kadar Enerji kazan.', color1: '#ffaa00', color2: '#ff0000', shape: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', effect: 'dance_burn', particle: 'fire' },
    14: { id: 14, title: 'Kıvılcım', type: 'Saldırı', cost: 0, baseValue: 2, value: 1, desc: '{D} Hasar. 1 Yanık uygular.', color1: '#ffcc00', color2: '#ff5500', shape: 'circle(30% at 50% 50%)', effect: 'attack_burn', particle: 'fire' },
    15: { id: 15, title: 'Cehennem Ateşi', type: 'Saldırı', cost: 3, baseValue: 20, value: 5, desc: '{D} Hasar. 5 Yanık uygular.', color1: '#ff0000', color2: '#000000', shape: 'polygon(0% 0%, 100% 0%, 50% 100%)', effect: 'attack_burn', particle: 'fire' },
    16: { id: 16, title: 'Ay Suyu', type: 'Defans', cost: 1, value: 6, desc: '6 Kalkan kazan.', color1: '#00aaff', color2: '#0022ff', shape: 'polygon(0% 20%, 100% 20%, 80% 100%, 20% 100%)', effect: 'defend', particle: 'shield' },
    17: { id: 17, title: 'Buz Zırhı', type: 'Defans', cost: 2, value: 12, desc: '12 Kalkan kazan.', color1: '#88ccff', color2: '#0055ff', shape: 'polygon(20% 0%, 80% 0%, 100% 50%, 50% 100%, 0% 50%)', effect: 'defend', particle: 'shield' },
    18: { id: 18, title: 'Dondurucu Rüzgar', type: 'Defans', cost: 1, value: 4, desc: '4 Kalkan. Düşman Atağını 3 azaltır.', color1: '#ccffff', color2: '#00aaff', shape: 'polygon(0% 0%, 100% 50%, 0% 100%)', effect: 'defend_weaken', particle: 'shield' },
    19: { id: 19, title: 'Simya Taşı', type: 'Güç', cost: 2, value: 2, desc: '+2 Güç kazan.', color1: '#ff2a4a', color2: '#550000', shape: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', effect: 'apply_strength', particle: 'draw' },
    20: { id: 20, title: 'Adrenalin', type: 'Yetenek', cost: 0, value: 1, desc: '1 Enerji kazan. 1 Kart çek.', color1: '#ffffff', color2: '#aaaaaa', shape: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', effect: 'adrenaline', particle: 'draw' },
    21: { id: 21, title: 'Konsantrasyon', type: 'Yetenek', cost: 1, value: 3, desc: '3 Kart çek.', color1: '#ddddff', color2: '#5555aa', shape: 'circle(40% at 50% 50%)', effect: 'draw', particle: 'draw' },
    22: { id: 22, title: 'Ayna', type: 'Yetenek', cost: 2, value: 0, desc: 'Bu kart hiçbir şey yapmaz.', color1: '#ffffff', color2: '#0000ff', shape: 'polygon(20% 0%, 80% 0%, 80% 100%, 20% 100%)', effect: 'mirror', particle: 'draw' },
    23: { id: 23, title: 'Buz Duvarı', type: 'Defans', cost: 3, value: 20, desc: '20 Kalkan. Sonraki tur Enerji yenilenmez.', color1: '#ffffff', color2: '#00aaff', shape: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', effect: 'ice_wall', particle: 'shield' },
    24: { id: 24, title: 'Kan Bağışı', type: 'Yetenek', cost: 0, value: 2, desc: 'Kendine 3 Hasar vur, 2 Enerji kazan.', color1: '#ff0000', color2: '#550000', shape: 'circle(50% at 50% 50%)', effect: 'blood_energy', particle: 'blood' },
    25: { id: 25, title: 'Vampir Isırığı', type: 'Saldırı', cost: 2, baseValue: 5, desc: '{D} Hasar vurur. Hasarın yarısı kadar iyileş.', color1: '#880000', color2: '#000000', shape: 'polygon(20% 0%, 80% 0%, 50% 100%)', effect: 'lifesteal', particle: 'blood' },
    26: { id: 26, title: 'Kara Büyü', type: 'Saldırı', cost: 1, baseValue: 6, desc: '{D} Hasar. Canın %50 altındaysa 3 kat vurur.', color1: '#220044', color2: '#ff0000', shape: 'polygon(50% 0%, 100% 100%, 0% 100%)', effect: 'dark_magic', particle: 'blood' },
    27: { id: 27, title: 'Fedakarlık', type: 'Defans', cost: 1, value: 10, desc: '10 Kalkan kazan. Rastgele 1 kart at.', color1: '#555555', color2: '#000000', shape: 'polygon(0% 20%, 100% 20%, 80% 100%, 20% 100%)', effect: 'sacrifice', particle: 'shield' },
    28: { id: 28, title: 'Kanlı Bıçak', type: 'Saldırı', cost: 1, baseValue: 8, desc: '{D} Hasar. Bu tur can kaybettiysen Enerjini iade eder.', color1: '#ff0000', color2: '#ffaaaa', shape: 'polygon(50% 0%, 60% 100%, 40% 100%)', effect: 'blood_knife', particle: 'blood' },
    29: { id: 29, title: 'Öfke', type: 'Saldırı', cost: 1, baseValue: 4, desc: '{D} Hasar. Kaybettiğin her 10 HP için +2 Hasar.', color1: '#ff5500', color2: '#550000', shape: 'polygon(0% 0%, 100% 50%, 0% 100%)', effect: 'rage', particle: 'fire' },
    30: { id: 30, title: 'Ruh Çekimi', type: 'Yetenek', cost: 2, value: 0, desc: 'Düşmanın Maksimum HP\'sini %20 düşürür.', color1: '#800080', color2: '#000000', shape: 'circle(40% at 50% 50%)', effect: 'soul_drain', particle: 'draw' }
};

const enemyTemplates = {
    normal: [{ name: 'Kayıp Ruh', hp: 45, attackBase: 6, color: '#aaa', powers: {} }, { name: 'Zehirli Kurbağa', hp: 55, attackBase: 8, color: '#00ff88', powers: { regen: 5 } }, { name: 'Çamur Golemi', hp: 70, attackBase: 5, color: '#8b4513', powers: { platedArmor: 2 } }, { name: 'Yarasa Sürüsü', hp: 35, attackBase: 10, color: '#444', powers: {} }],
    elite: [{ name: 'Kızıl Baş Şövalye', hp: 130, attackBase: 12, color: '#ff2a4a', powers: { thorns: 1, platedArmor: 1 } }, { name: 'Alev İblisi', hp: 110, attackBase: 15, color: '#ffaa00', powers: { thorns: 2 } }, { name: 'Buz Devi', hp: 160, attackBase: 10, color: '#00aaff', powers: { platedArmor: 3 } }],
    act1boss: [{ name: 'Alev Lordu', hp: 200, attackBase: 10, color: '#ffaa00', powers: { thorns: 1 } }],
    act2boss: [{ name: 'Baş Simyacı', hp: 350, attackBase: 12, color: '#b026ff', powers: { regen: 10, thorns: 1, platedArmor: 2 } }]
};

const relicsData = {
    'stone': { id: 'stone', icon: '💎', name: 'Filozof Taşı', desc: '+1 Maksimum Enerji.' }, 'chalice': { id: 'chalice', icon: '🍷', name: 'Kanlı Kadeh', desc: 'Savaş sonu 5 HP iyileş.' }, 'needle': { id: 'needle', icon: '💉', name: 'Zehirli İğne', desc: 'Savaş başı düşmana 3 Zehir.' },
    'heart': { id: 'heart', icon: '❤️‍🔥', name: 'Alevli Yürek', desc: 'Tur başı 2 Kalkan kazan.' }, 'flask': { id: 'flask', icon: '🧪', name: 'Eski İksir Şişesi', desc: 'Kampta %50 iyileş.' }, 'frog': { id: 'frog', icon: '🐸', name: 'Altın Kurbağa', desc: 'Tur başı fazladan 1 Kart çek.' },
    'claw': { id: 'claw', icon: '🐾', name: 'Kara Kedi Pençesi', desc: '%25 İhtimalle saldırılar 2 kat vurur.' }, 'anvil': { id: 'anvil', icon: '🔨', name: 'Paslı Örs', desc: 'Savaş başı 1 Güç kazan.' }, 'amulet': { id: 'amulet', icon: '❄️', name: 'Buzlu Tılsım', desc: 'Savaş başı 10 Kalkan kazan.' },
};

let drawPile = []; let discardPile = []; let hand = [];
let skipEnergyRegen = false; let tookDamageThisTurn = false;

// --- UTILS ---
function shuffle(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } }
function switchScreen(screenId) { document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); document.getElementById(screenId).classList.add('active'); toggleRelicBar(screenId); }
function toggleRelicBar(screenId) { document.getElementById('relic-bar').style.display = (screenId === 'start-screen' || screenId === 'class-select-screen' || screenId === 'meta-screen' || screenId === 'compendium-screen') ? 'none' : 'flex'; }
function hasRelic(id) { return gameState.relics.includes(id); }

function upgradeCard(cardTemplate) {
    let cloned = { ...cardTemplate, upgraded: true, title: cardTemplate.title + '+' };
    if(cloned.baseValue) cloned.baseValue = Math.floor(cloned.baseValue * 1.5);
    if(cloned.value) {
        if(cloned.effect === 'draw' || cloned.effect === 'draw_if_poison' || cloned.effect === 'adrenaline') cloned.value += 1;
        else cloned.value = Math.floor(cloned.value * 1.5);
    }
    return cloned;
}

function createCardHTML(card, isReward = false) {
    let finalDesc = card.desc;
    if(!isReward && finalDesc.includes('{D}')) finalDesc = finalDesc.replace('{D}', `<strong style="color:var(--health-color); font-size:1.2em;">${calculateDamage(card)}</strong>`);
    else if(isReward && finalDesc.includes('{D}')) finalDesc = finalDesc.replace('{D}', card.baseValue);
    
    let titleStyle = `color: ${card.color1}`;
    if(card.upgraded) titleStyle += `; text-shadow: 0 0 10px #00ff00; font-weight: bold;`;
    
    return `<div class="card-cost">${card.cost}</div><div class="card-art" style="background: radial-gradient(circle at 50% 50%, ${card.color1}40 0%, transparent 70%);"><div class="css-icon" style="background: linear-gradient(135deg, ${card.color1}, ${card.color2}); clip-path: ${card.shape}; box-shadow: 0 0 20px ${card.color1};"></div></div><div class="card-content"><div class="card-title" style="${titleStyle}">${card.title}</div><div class="card-type">${card.type}</div><div class="card-desc">${finalDesc}</div></div>`;
}
function createRelicHTML(relic) {
    return `<div class="card-art" style="height: 120px; font-size: 4rem;">${relic.icon}</div><div class="card-content"><div class="card-title" style="color: var(--accent-gold); font-size: 1.3rem;">${relic.name}</div><div class="card-desc" style="font-size: 1.1rem; color: #fff; margin-top: 1rem;">${relic.desc}</div></div>`;
}

// --- INITIALIZATION ---
document.getElementById('btn-start-game').onclick = () => { playSound('click'); document.getElementById('ascension-display').innerText = currentAscension; switchScreen('class-select-screen'); };
document.getElementById('btn-restart-game').onclick = () => { playSound('click'); switchScreen('class-select-screen'); };
document.getElementById('btn-victory-restart').onclick = () => { playSound('click'); switchScreen('class-select-screen'); };
document.getElementById('btn-close-deck').onclick = () => { playSound('click'); document.getElementById('deck-overlay').classList.remove('active'); };
document.querySelector('.deck').onclick = () => { playSound('click'); showDeckViewOverlay('view'); };
document.getElementById('skip-reward-btn').onclick = () => { 
    playSound('click'); 
    if(gameState.draftType === 'relic') { showRewardScreen(false); } 
    else { gameState.floor++; showMapScreen(); }
};
document.getElementById('end-turn-btn').addEventListener('click', () => {
    playSound('click'); applyEndOfTurnStatus();
    if(enemy.hp <= 0 && player.hp > 0) { winCombat(); return; }
    takePlayerDamage(enemy.intent.value);
    if(player.hp <= 0) return; 
    discardPile.push(...hand); hand = []; updateCombatUI();
    setTimeout(() => { startTurn(); }, 800);
});

function initGameWithClass(classId) {
    playSound('click');
    let baseHp = 65; if (classId === 'bloodmage') baseHp = 80;
    baseHp += metaProgression.upgrades.hpBonus * 10;
    
    player = { hp: baseHp, maxHp: baseHp, energy: 3, maxEnergy: 3, shield: 0, status: { strength: metaProgression.upgrades.strBonus, intangible: 0 }, classType: classId };
    gameState = { floor: 1, deck: [], relics: [], potions: [null, null, null], draftType: null };
    
    const pushCard = (id) => { gameState.deck.push({...cardTemplates[id]}); discoverCard(id); };
    
    if(classId === 'alchemist') {
        for(let i=0; i<4; i++) pushCard(9); 
        for(let i=0; i<4; i++) pushCard(16); 
        pushCard(1); pushCard(10); 
    } else if(classId === 'bloodmage') {
        for(let i=0; i<4; i++) pushCard(9); 
        for(let i=0; i<4; i++) pushCard(16); 
        pushCard(25); pushCard(24); 
    } else if(classId === 'elementalist') {
        for(let i=0; i<4; i++) pushCard(9); 
        for(let i=0; i<4; i++) pushCard(16); 
        pushCard(18); pushCard(14); 
    }
    
    gameState.potions[0] = 'health';
    if(metaProgression.upgrades.relicBonus > 0) {
        const keys = Object.keys(relicsData); gainRelic(keys[Math.floor(Math.random() * keys.length)]);
    }
    
    renderRelics(); renderPotions(); showMapScreen();
}

function renderRelics() {
    const bar = document.getElementById('relic-bar'); bar.innerHTML = '';
    gameState.relics.forEach(id => { const r = relicsData[id]; bar.innerHTML += `<div class="relic-icon" data-tooltip="${r.name}: ${r.desc}">${r.icon}</div>`; });
}
function gainRelic(id) {
    if(!gameState.relics.includes(id)) {
        gameState.relics.push(id); discoverRelic(id); playSound('heal');
        if(id === 'stone') player.maxEnergy += 1;
        renderRelics();
    }
}

function renderPotions() {
    for(let i=0; i<3; i++) {
        const slot = document.getElementById(`potion-slot-${i}`); const pId = gameState.potions[i];
        if(pId) {
            const p = potionData[pId]; slot.className = 'potion-slot filled'; slot.innerHTML = p.icon; slot.style.borderColor = p.color; slot.setAttribute('data-tooltip', `${p.name}: ${p.desc}`);
            slot.onclick = () => usePotion(i);
        } else { slot.className = 'potion-slot'; slot.innerHTML = ''; slot.style.borderColor = '#555'; slot.removeAttribute('data-tooltip'); slot.onclick = null; }
    }
}
function gainRandomPotion() {
    const emptyIdx = gameState.potions.findIndex(p => p === null);
    if(emptyIdx !== -1) {
        const keys = Object.keys(potionData); const p = keys[Math.floor(Math.random() * keys.length)];
        gameState.potions[emptyIdx] = p; renderPotions(); playSound('heal'); return p;
    }
    return null;
}
function usePotion(index) {
    if(!gameState.potions[index]) return;
    const pId = gameState.potions[index]; gameState.potions[index] = null; renderPotions(); playSound('heal');
    emitParticles(window.innerWidth/2, window.innerHeight/2, (pId==='health'?'#ff2a4a':pId==='explosive'?'#ffaa00':'#fff'));
    if(pId === 'health') { player.hp = Math.min(player.maxHp, player.hp + 20); } 
    else if(pId === 'explosive') { dealDamage(15, false); } 
    else if(pId === 'ghost') { player.status.intangible += 1; }
    updateCombatUI(); if(enemy.hp <= 0 && player.hp > 0) setTimeout(() => winCombat(), 500);
}

// --- EVENT & CAMP ---
function showEventScreen() {
    switchScreen('event-screen'); playSound('click');
    const ev = mapEvents[Math.floor(Math.random() * mapEvents.length)];
    document.getElementById('event-title').innerText = ev.title; document.getElementById('event-desc').innerText = ev.desc;
    const btns = document.getElementById('event-buttons'); btns.innerHTML = '';
    ev.choices.forEach(c => {
        const b = document.createElement('button'); b.className = 'main-btn'; b.innerText = c.text;
        b.style.fontSize = '1.2rem'; b.style.padding = '1rem 2rem';
        b.onclick = () => { playSound('click'); c.action(); }; btns.appendChild(b);
    });
}
function showCampScreen() {
    switchScreen('camp-screen'); playSound('click');
    document.getElementById('camp-player-hp-fill').style.width = (player.hp / player.maxHp * 100) + '%';
    document.getElementById('camp-player-hp-text').innerText = `${player.hp} / ${player.maxHp}`;
    
    // Ascension 2 modifier
    let basePerc = currentAscension >= 2 ? 0.15 : 0.3;
    let perc = hasRelic('flask') ? (basePerc * 1.66) : basePerc; // roughly 25% or 50%
    document.getElementById('camp-heal-amount').innerText = `Canını %${Math.floor(perc*100)} Yenile`;
    
    document.getElementById('btn-camp-rest').onclick = () => {
        playSound('heal'); const heal = Math.floor(player.maxHp * perc);
        player.hp = Math.min(player.maxHp, player.hp + heal); gameState.floor++; showMapScreen();
    };
    document.getElementById('btn-camp-meditate').onclick = () => {
        playSound('click'); showDeckViewOverlay('remove', (idx) => {
            playSound('swish'); gameState.deck.splice(idx, 1); document.getElementById('deck-overlay').classList.remove('active');
            gameState.floor++; showMapScreen();
        });
    };
    document.getElementById('btn-camp-smith').onclick = () => {
        playSound('click'); showDeckViewOverlay('upgrade', (idx) => {
            playSound('shield'); 
            gameState.deck[idx] = upgradeCard(gameState.deck[idx]); 
            document.getElementById('deck-overlay').classList.remove('active');
            gameState.floor++; showMapScreen();
        });
    };
}
function showDeckViewOverlay(mode, onSelectCallback = null) {
    // mode: 'view', 'remove', 'upgrade'
    document.getElementById('deck-overlay').classList.add('active');
    let title = "Mevcut Desten";
    if(mode === 'remove') title = "Silmek istediğin kartı seç";
    if(mode === 'upgrade') title = "Geliştirmek istediğin kartı seç";
    document.getElementById('deck-overlay-title').innerText = title;
    
    const grid = document.getElementById('deck-overlay-grid'); grid.innerHTML = '';
    gameState.deck.forEach((card, idx) => {
        const cEl = document.createElement('div'); cEl.className = 'card'; cEl.innerHTML = createCardHTML(card, true);
        if(mode === 'upgrade' && card.upgraded) { cEl.style.filter = 'grayscale(1)'; cEl.style.opacity = '0.5'; }
        else if(mode !== 'view') {
            cEl.onclick = () => { playSound('click'); onSelectCallback(idx); };
        }
        grid.appendChild(cEl);
    });
}

// --- MAP LOGIC ---
function showMapScreen() {
    switchScreen('map-screen');
    document.getElementById('floor-number').innerText = gameState.floor;
    document.getElementById('map-player-hp-fill').style.width = (player.hp / player.maxHp * 100) + '%';
    document.getElementById('map-player-hp-text').innerText = `${player.hp} / ${player.maxHp}`;
    document.getElementById('map-deck-count').innerText = gameState.deck.length;

    const pathsContainer = document.getElementById('map-paths'); pathsContainer.innerHTML = '';
    
    if(gameState.floor === 15) {
        const node = document.createElement('div'); node.className = `map-node elite`;
        node.innerHTML = `<span class="node-icon">👹</span><div class="node-title" style="color:#ffaa00">ACT 1 BOSS</div><div class="node-desc">1. Bölümün Sonu.</div>`;
        node.onclick = () => { playSound('click'); startCombat('act1boss'); }; pathsContainer.appendChild(node);
    } else if(gameState.floor === 30) {
        const node = document.createElement('div'); node.className = `map-node elite`;
        node.innerHTML = `<span class="node-icon">💀</span><div class="node-title" style="color:#ff2a4a">FİNAL BOSS</div><div class="node-desc">Baş Simyacı seni bekliyor.</div>`;
        node.onclick = () => { playSound('click'); startCombat('act2boss'); }; pathsContainer.appendChild(node);
    } else if (gameState.floor % 7 === 0) {
        const node = document.createElement('div'); node.className = `map-node camp`;
        node.innerHTML = `<span class="node-icon">⛺</span><div class="node-title">Dinlenme Kampı</div><div class="node-desc">Hak edilmiş bir mola.</div>`;
        node.onclick = () => { playSound('click'); showCampScreen(); }; pathsContainer.appendChild(node);
    } else {
        const paths = [ { type: 'normal', icon: '⚔️', title: 'Normal Savaş', desc: 'Standart düşman.' }, { type: 'elite', icon: '🔥', title: 'Elit Savaş', desc: 'Yadigâr ödülü!' }, { type: 'mystery', icon: '❓', title: 'Gizem', desc: 'Bilinmeyen olay.' } ];
        shuffle(paths); const selectedPaths = paths.slice(0, 2);
        selectedPaths.forEach(p => {
            const node = document.createElement('div'); node.className = `map-node ${p.type}`;
            node.innerHTML = `<span class="node-icon">${p.icon}</span><div class="node-title">${p.title}</div><div class="node-desc">${p.desc}</div>`;
            node.onclick = () => { if(p.type === 'mystery') showEventScreen(); else { playSound('click'); startCombat(p.type); } };
            pathsContainer.appendChild(node);
        });
    }
}

// --- REWARD LOGIC ---
function showRewardScreen(wasElite, isEventCard = false) {
    switchScreen('reward-screen'); playSound('heal');
    const container = document.getElementById('reward-cards'); container.innerHTML = '';
    
    if(wasElite) {
        gameState.draftType = 'relic';
        document.getElementById('reward-title').innerText = `Efsanevi Yadigârını Seç!`;
        const avail = Object.keys(relicsData).filter(id => !hasRelic(id)); shuffle(avail); const chosenIds = avail.slice(0, 3);
        if(chosenIds.length === 0) { document.getElementById('reward-title').innerText = `Alınacak Yadigâr Kalmadı, Kart Seç:`; gameState.draftType = 'card'; }
        else {
            chosenIds.forEach(id => {
                const r = relicsData[id]; const cardEl = document.createElement('div'); cardEl.className = 'card'; cardEl.style.height = '300px';
                cardEl.innerHTML = createRelicHTML(r);
                cardEl.onclick = () => { playSound('swish'); gainRelic(id); showRewardScreen(false); };
                container.appendChild(cardEl);
            });
            return;
        }
    }
    
    gameState.draftType = 'card';
    document.getElementById('reward-title').innerText = isEventCard ? "Bir Kart Seç (Etkinlik Ödülü)" : "Destene eklemek için bir kart seç";
    
    const allIds = Object.keys(cardTemplates); shuffle(allIds); const chosenIds = allIds.slice(0, 3);
    chosenIds.forEach(id => {
        const template = cardTemplates[id]; const cardEl = document.createElement('div'); cardEl.className = 'card'; cardEl.innerHTML = createCardHTML(template, true);
        cardEl.onclick = () => { playSound('swish'); gameState.deck.push({...template}); discoverCard(template.id); gameState.floor++; showMapScreen(); };
        container.appendChild(cardEl);
    });
}

// --- COMBAT LOGIC ---
function startCombat(type) {
    switchScreen('combat-screen');
    const possibleEnemies = enemyTemplates[type];
    const template = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)];
    
    const scale = 1 + ((gameState.floor - 1) * 0.10);
    enemy.name = template.name; enemy.maxHp = Math.floor(template.hp * scale); 
    enemy.baseAttack = Math.floor(template.attackBase * scale); 
    
    // Ascension modifiers
    if(currentAscension >= 1 && type === 'elite') { enemy.maxHp = Math.floor(enemy.maxHp * 1.2); enemy.baseAttack = Math.floor(enemy.baseAttack * 1.2); }
    if(currentAscension >= 3 && (type === 'act1boss' || type === 'act2boss')) { enemy.maxHp = Math.floor(enemy.maxHp * 1.25); enemy.baseAttack = Math.floor(enemy.baseAttack * 1.25); }
    
    enemy.hp = enemy.maxHp; enemy.status = { poison: 0, burn: 0 };
    enemy.powers = { thorns: template.powers.thorns || 0, regen: template.powers.regen || 0, platedArmor: template.powers.platedArmor || 0 }; enemy.type = type;
    
    player.status = { strength: metaProgression.upgrades.strBonus, intangible: 0 }; skipEnergyRegen = false;
    if(hasRelic('needle')) enemy.status.poison += 3; if(hasRelic('anvil')) player.status.strength += 1; if(hasRelic('amulet')) player.shield += 10;
    
    drawPile = gameState.deck.map(c => ({...c, instanceId: Math.random()})); shuffle(drawPile);
    discardPile = []; hand = [];
    
    const sprite = document.querySelector('.enemy-sprite');
    sprite.style.background = `linear-gradient(135deg, ${template.color}, #000)`; sprite.style.boxShadow = `0 0 20px ${template.color}80`;
    document.getElementById('enemy-name').innerText = enemy.name; document.getElementById('enemy-name').style.color = template.color; document.getElementById('enemy-name').style.textShadow = `0 0 10px ${template.color}`;
    
    startTurn();
}

function startTurn() {
    if(!skipEnergyRegen) player.energy = player.maxEnergy;
    skipEnergyRegen = false; tookDamageThisTurn = false;
    if(player.status.intangible > 0) player.status.intangible -= 1;
    if(enemy.powers.regen > 0) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.powers.regen);
    if(hasRelic('heart')) player.shield += 2;
    
    const variance = Math.floor(Math.random() * 3) - 1;
    enemy.intent.value = Math.max(1, enemy.baseAttack + variance);
    
    drawCards(hasRelic('frog') ? 6 : 5); updateCombatUI();
}

function drawCards(amount) {
    for(let i=0; i<amount; i++) {
        if(drawPile.length === 0) {
            if(discardPile.length === 0) break;
            drawPile = [...discardPile]; discardPile = []; shuffle(drawPile);
        }
        hand.push(drawPile.pop());
    }
}

function calculateDamage(card) {
    let dmg = card.baseValue ? card.baseValue + player.status.strength : 0;
    if(card.effect === 'combo_burn') dmg += (enemy.status.burn * 3);
    if(card.effect === 'dark_magic' && player.hp < player.maxHp / 2) dmg *= 3;
    if(card.effect === 'rage') dmg += Math.floor((player.maxHp - player.hp) / 10) * 2;
    return dmg;
}

function die() {
    metaProgression.souls += gameState.floor; saveMeta();
    document.getElementById('game-over-stats').innerText = `Ulaşılan Kat: ${gameState.floor} | Kazanılan Ruh: ${gameState.floor}`;
    switchScreen('game-over-screen'); 
}

function takePlayerDamage(amount) {
    if(amount <= 0) return;
    if(player.status.intangible > 0) amount = 1;
    tookDamageThisTurn = true; playSound('hit');
    if(player.shield > 0) {
        if(player.shield >= amount) { player.shield -= amount; amount = 0; }
        else { amount -= player.shield; player.shield = 0; }
    }
    if(amount > 0) {
        player.hp -= amount; if(player.hp < 0) player.hp = 0;
        document.body.style.animation = 'screen-shake 0.5s'; setTimeout(() => document.body.style.animation = '', 500);
    }
    if(player.hp <= 0) die();
}

function dealDamage(amount, isDirectAttack = false) {
    if(amount <= 0) return 0;
    if(isDirectAttack && hasRelic('claw') && Math.random() < 0.25) amount *= 2; 
    if(isDirectAttack && enemy.powers.platedArmor > 0) { amount -= enemy.powers.platedArmor; if(amount < 0) amount = 0; }
    
    enemy.hp -= amount; if(enemy.hp < 0) enemy.hp = 0; playSound('hit');
    document.body.style.animation = 'screen-shake 0.3s'; setTimeout(() => document.body.style.animation = '', 300);
    const sprite = document.querySelector('.enemy-sprite');
    sprite.classList.add('take-damage'); setTimeout(() => sprite.classList.remove('take-damage'), 300);
    
    if(isDirectAttack && enemy.powers.thorns > 0) takePlayerDamage(enemy.powers.thorns);
    return amount;
}

function winCombat() {
    updateCombatUI();
    setTimeout(() => {
        if(gameState.floor === 30) {
            metaProgression.maxAscension = Math.max(metaProgression.maxAscension, currentAscension + 1);
            saveMeta();
            switchScreen('victory-screen');
        }
        else {
            if(hasRelic('chalice')) player.hp = Math.min(player.maxHp, player.hp + 5);
            showRewardScreen(enemy.type === 'elite' || enemy.type === 'act1boss');
        }
    }, 800);
}

function playCard(cardInstanceId, element) {
    const cardIndex = hand.findIndex(c => c.instanceId === cardInstanceId);
    if(cardIndex === -1) return; const card = hand[cardIndex];
    if(player.energy < card.cost) { element.style.animation = 'shake 0.4s'; setTimeout(() => element.style.animation = '', 400); return; }
    
    player.energy -= card.cost; playSound('swish');
    if(card.effect.includes('defend') || card.effect.includes('shield')) playSound('shield');
    
    const rect = element.getBoundingClientRect(); const cx = rect.left + rect.width/2; const cy = rect.top + rect.height/2;
    triggerVFX(card.particle, cx, cy);
    
    switch(card.effect) {
        case 'attack': case 'combo_burn': case 'dark_magic': case 'rage': dealDamage(calculateDamage(card), true); break;
        case 'apply_burn': enemy.status.burn += card.value; break;
        case 'apply_poison': enemy.status.poison += card.value; break;
        case 'double_poison': enemy.status.poison *= 2; break;
        case 'apply_strength': player.status.strength += card.value; break;
        case 'defend': player.shield += card.value; break;
        case 'adrenaline': player.energy += 1; drawCards(1); break;
        case 'attack_poison': dealDamage(calculateDamage(card), true); enemy.status.poison += card.value; break;
        case 'shield_per_poison': player.shield += (enemy.status.poison * card.value); break;
        case 'draw_if_poison': if(enemy.status.poison > 0) drawCards(card.value); break;
        case 'convert_poison': player.shield += enemy.status.poison; enemy.status.poison = 0; break;
        case 'lotus_poison': enemy.status.poison += 10; takePlayerDamage(3); break;
        case 'attack_burn': dealDamage(calculateDamage(card), true); enemy.status.burn += card.value; break;
        case 'dance_burn': player.energy += enemy.status.burn; enemy.status.burn = 0; break;
        case 'defend_weaken': player.shield += card.value; enemy.intent.value = Math.max(0, enemy.intent.value - 3); break;
        case 'draw': drawCards(card.value); break;
        case 'ice_wall': player.shield += card.value; skipEnergyRegen = true; break;
        case 'blood_energy': takePlayerDamage(3); player.energy += 2; break;
        case 'lifesteal': let dmgDealt = dealDamage(calculateDamage(card), true); player.hp = Math.min(player.maxHp, player.hp + Math.floor(dmgDealt/2)); playSound('heal'); break;
        case 'sacrifice': player.shield += 10; if(hand.length > 1) { let dropIdx = hand.findIndex(c => c.instanceId !== cardInstanceId); hand.splice(dropIdx, 1); } break;
        case 'blood_knife': dealDamage(calculateDamage(card), true); if(tookDamageThisTurn) player.energy += 1; break;
        case 'soul_drain': enemy.maxHp = Math.floor(enemy.maxHp * 0.8); enemy.hp = Math.min(enemy.hp, enemy.maxHp); break;
    }
    
    hand.splice(cardIndex, 1); 
    if(card.effect !== 'çürütme') discardPile.push(card); 
    
    element.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; element.style.transform = 'translateY(-300px) scale(0.3) rotate(20deg)'; element.style.opacity = '0'; element.style.pointerEvents = 'none';
    setTimeout(() => { if(enemy.hp <= 0 && player.hp > 0) { winCombat(); } else if(player.hp > 0) { updateCombatUI(); } }, 300);
}

function applyEndOfTurnStatus() {
    if(enemy.status.poison > 0) { dealDamage(enemy.status.poison); enemy.status.poison -= 1; }
    if(enemy.status.burn > 0) { dealDamage(enemy.status.burn); enemy.status.burn -= 1; }
}

function updateCombatUI() {
    document.querySelector('.player-info .health-bar-fill').style.width = (player.hp / player.maxHp * 100) + '%';
    let playerHealthText = `${player.hp} / ${player.maxHp}`;
    if(player.shield > 0) playerHealthText += ` <span style="color:#00aaff;">(+${player.shield})</span>`;
    document.getElementById('combat-player-hp-text').innerHTML = playerHealthText;
    
    const playerStatusEl = document.getElementById('player-status'); playerStatusEl.innerHTML = '';
    if(player.status.strength > 0) playerStatusEl.innerHTML += `<div class="status-icon status-strength">💪 ${player.status.strength}</div>`;
    if(player.status.intangible > 0) playerStatusEl.innerHTML += `<div class="status-icon status-intangible" title="Dokunulmaz">👻 ${player.status.intangible}</div>`;

    document.querySelector('#enemy-area .health-bar-fill').style.width = (enemy.hp / enemy.maxHp * 100) + '%';
    document.getElementById('enemy-hp-text').innerText = `${enemy.hp} / ${enemy.maxHp}`;
    
    const enemyStatusEl = document.getElementById('enemy-status'); enemyStatusEl.innerHTML = '';
    if(enemy.status.poison > 0) enemyStatusEl.innerHTML += `<div class="status-icon status-poison">☠️ ${enemy.status.poison}</div>`;
    if(enemy.status.burn > 0) enemyStatusEl.innerHTML += `<div class="status-icon status-burn">🔥 ${enemy.status.burn}</div>`;
    if(enemy.powers.thorns > 0) enemyStatusEl.innerHTML += `<div class="status-icon status-thorns" title="Diken">🌵 ${enemy.powers.thorns}</div>`;
    if(enemy.powers.regen > 0) enemyStatusEl.innerHTML += `<div class="status-icon status-regen" title="Yenilenme">🌿 ${enemy.powers.regen}</div>`;
    if(enemy.powers.platedArmor > 0) enemyStatusEl.innerHTML += `<div class="status-icon status-plated" title="Sert Kabuk">🛡️ ${enemy.powers.platedArmor}</div>`;
    
    document.getElementById('energy-value').innerText = player.energy;
    document.querySelector('.intent-indicator').innerHTML = `<span>⚔️</span><span>${enemy.intent.value} Hasar</span>`;
    document.querySelector('.deck').innerText = drawPile.length; document.querySelector('.discard').innerText = discardPile.length;
    
    const handArea = document.getElementById('hand-area'); handArea.innerHTML = '';
    hand.forEach((card, index) => {
        const cardEl = document.createElement('div'); cardEl.classList.add('card');
        const middleIndex = (hand.length - 1) / 2; const offset = index - middleIndex;
        const rotation = offset * 6; const translateY = Math.abs(offset) * Math.abs(offset) * 4;
        cardEl.style.transform = `translateY(${translateY}px) rotate(${rotation}deg)`;
        cardEl.innerHTML = createCardHTML(card);
        cardEl.addEventListener('click', () => { playCard(card.instanceId, cardEl); });
        handArea.appendChild(cardEl);
    });
}

// --- PARTICLE VFX ---
const canvas = document.getElementById('vfx-canvas'); const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
let particles = [];
function emitParticles(x, y, colorCode, count = 30) { for(let i=0; i<count; i++) { particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 2, life: 1.0, size: Math.random() * 8 + 3, color: colorCode }); } }
function triggerVFX(type, startX, startY) {
    let color = '#fff'; if(type === 'fire') color = '#ff5500'; if(type === 'poison') color = '#00ff88'; if(type === 'blood') color = '#ff0000'; if(type === 'shield') color = '#00aaff'; if(type === 'draw') color = '#ffffff';
    const ex = window.innerWidth / 2; const ey = window.innerHeight * 0.3;
    for(let i=0; i<20; i++) { particles.push({ x: startX, y: startY, vx: (ex - startX) * 0.05 + (Math.random() - 0.5) * 5, vy: (ey - startY) * 0.05 + (Math.random() - 0.5) * 5, life: 1.0, size: Math.random() * 6 + 2, color: color }); }
}
function animateVFX() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        if(p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1.0; requestAnimationFrame(animateVFX);
}
animateVFX();
