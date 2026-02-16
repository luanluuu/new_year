// --- 音效管理器 (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const soundEnabled = true;

// 简单的音效合成器
const SoundManager = {
    // 爆炸音效：白噪声 + 指数衰减
    playExplosion() {
        if (!soundEnabled || audioCtx.state === 'suspended') return;
        
        const t = audioCtx.currentTime;
        const gainNode = audioCtx.createGain();
        gainNode.connect(audioCtx.destination);
        
        // 创建白噪声缓冲
        const bufferSize = audioCtx.sampleRate * 2; // 2秒
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        // 低通滤波器，让声音更低沉柔和
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, t); // 降低频率到300Hz，消除尖锐感
        filter.frequency.linearRampToValueAtTime(100, t + 0.5); // 频率随时间降低
        
        noise.connect(filter);
        filter.connect(gainNode);
        
        // 音量包络 - 增加起音和释音时间
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.15, t + 0.05); // 降低最大音量至0.15，并添加淡入
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.8); // 缓慢淡出
        
        noise.start(t);
        noise.stop(t + 1);
    },
    
    // 发射音效：啸叫声
    playLaunch() {
        if (!soundEnabled || audioCtx.state === 'suspended') return;
        
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t); // 降低起始频率
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.5); // 降低结束频率
        
        // 降低整体音量
        gainNode.gain.setValueAtTime(0, t);
        gainNode.gain.linearRampToValueAtTime(0.03, t + 0.1); // 降低最大音量至0.03
        gainNode.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        
        osc.start(t);
        osc.stop(t + 0.5);
    }
};

// 监听点击事件以恢复 AudioContext (浏览器策略)
window.addEventListener('click', () => {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}, { once: false });
// -----------------------------------

// 倒计时逻辑
let isNewYear = false; // 是否已经到了新年
let fireworksInterval = null;

function updateTimer() {
    const now = new Date();
    
    // --- 模拟模式开关 ---
    // 正常模式：设置为未来的春节日期 (例如 2026-02-17)
    // const targetDate = new Date('2026-02-17T00:00:00'); 
    
    // 模拟模式：设置为当前时间 + 10秒，方便预览效果
    // 每次刷新页面都会重新开始10秒倒计时
    if (!window.simulatedTargetDate) {
        window.simulatedTargetDate = new Date(Date.now() + 10000);
    }
    const targetDate = window.simulatedTargetDate;
    // -------------------
    
    if (now >= targetDate) {
       if (!isNewYear) {
           isNewYear = true;
           document.querySelector('.countdown').innerHTML = "<h1 class='new-year-text'>新年快乐！🎉</h1>";
           // 开启狂欢模式：增加烟花频率
           startCelebration();
       }
       return;
    }

    const diff = targetDate - now;

    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    document.getElementById('hours').innerText = String(hours).padStart(2, '0');
    document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
    document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
}

setInterval(updateTimer, 1000);
updateTimer();

// 烟花效果 (升级版)
const canvas = document.getElementById('fireworks');
const ctx = canvas.getContext('2d');

let width, height;

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

// 粒子类
class Particle {
    constructor(x, y, color, velocity) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
        this.friction = 0.95; // 增加摩擦力，让爆炸扩散范围稍微收一点
        this.gravity = 0.06;  // 稍微增加重力
        this.decay = Math.random() * 0.02 + 0.015; // 加快消失速度，避免过多残留
    }

    draw() {
        // 性能优化：移除 ctx.save/restore 和 shadowBlur
        // 使用 fillRect 代替 arc (圆形绘制非常消耗性能)
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3); // 小矩形模拟粒子
        ctx.globalAlpha = 1; // 重置透明度
    }

    update() {
        this.velocity.x *= this.friction;
        this.velocity.y *= this.friction;
        this.velocity.y += this.gravity;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= this.decay;
    }
}

// 烟花类（上升阶段）
class Firework {
    constructor(x, targetY) {
        this.x = x;
        this.y = height;
        this.targetY = targetY;
        
        // 动态计算初速度，确保能到达目标高度
        // v^2 = 2as => v = sqrt(2as)
        // a = 0.1 (重力加速度), s = height - targetY
        // 稍微增加一点随机速度系数 (1.0 - 1.05)，确保不仅能到，还能稍微冲一点点或者刚好
        const distance = height - targetY;
        const speed = Math.sqrt(2 * 0.1 * distance); 
        
        this.velocity = { x: 0, y: -speed }; // 上升速度
        
        this.color = `hsl(${Math.random() * 360}, 50%, 50%)`;
        this.particles = [];
        this.exploded = false;
        
        // 发射音效
        SoundManager.playLaunch();
    }

    draw() {
        if (!this.exploded) {
            ctx.fillStyle = '#fff'; // 上升时是白色亮点
            ctx.fillRect(this.x, this.y, 4, 4); // 使用矩形代替圆形
        }
        this.particles.forEach(p => p.draw());
    }

    update() {
        if (!this.exploded) {
            this.y += this.velocity.y;
            this.velocity.y += 0.1; // 模拟重力减速

            // 到达最高点或速度接近0时爆炸
            if (this.velocity.y >= 0 || this.y <= this.targetY) {
                this.explode();
            }
        }

        this.particles.forEach((p, i) => {
            p.update();
            if (p.alpha <= 0) this.particles.splice(i, 1);
        });
    }

    explode() {
        this.exploded = true;
        SoundManager.playExplosion(); // 播放爆炸音效
        
        // 性能优化：减少粒子数量 (100 -> 60)，移动端更流畅
        const particleCount = 60;
        const colorHsl = Math.random() * 360;
        const color = `hsl(${colorHsl}, 100%, 60%)`;
        
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2) / particleCount * i;
            const velocity = {
                x: Math.cos(angle) * (Math.random() * 6),
                y: Math.sin(angle) * (Math.random() * 6)
            };
            this.particles.push(new Particle(this.x, this.y, color, velocity));
        }
    }
}

let fireworks = [];

function animate() {
    requestAnimationFrame(animate);
    
    // 使用 destination-out 模式来淡出上一帧的内容，实现拖尾效果
    // 这样不会遮挡背景图片，且能消除残影
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // 增加数值可以让残影消失得更快，减少爆炸后的拖尾
    ctx.fillRect(0, 0, width, height);
    
    // 重置混合模式为 lighter，让烟花叠加时更亮
    ctx.globalCompositeOperation = 'lighter';

    fireworks.forEach((fw, i) => {
        fw.update();
        fw.draw();
        // 如果烟花爆炸且所有粒子都消失了，移除该烟花对象
        if (fw.exploded && fw.particles.length === 0) {
            fireworks.splice(i, 1);
        }
    });

    // 自动发射烟花
    // 如果是新年（倒计时结束），大大增加发射概率
    const launchProbability = isNewYear ? 0.2 : 0.03;
    
    // 性能优化：限制同屏最大烟花数量，防止卡顿
    if (fireworks.length < 15 && Math.random() < launchProbability) {
        const x = Math.random() * width;
        // 调整爆炸高度范围：让它更靠上 (10% - 40% 的屏幕高度)
        // 移动端屏幕较高，如果太靠下会显得很低
        const minH = height * 0.1;
        const maxH = height * 0.4;
        const targetY = minH + Math.random() * (maxH - minH);
        
        fireworks.push(new Firework(x, targetY));
    }
}

function startCelebration() {
    // 瞬间发射一波烟花
    for(let i=0; i<8; i++) { // 增加数量
        setTimeout(() => {
            const x = Math.random() * width;
            const targetY = height * 0.1 + Math.random() * (height * 0.3); // 集中在上方
            fireworks.push(new Firework(x, targetY));
        }, i * 100);
    }
}

animate();

// 点击发射
window.addEventListener('click', (e) => {
    // 简单的点击直接爆炸效果，或者创建一个新的Firework
    // 这里为了即时反馈，直接在点击处生成粒子
    const particleCount = 50;
    const color = `hsl(${Math.random() * 360}, 100%, 60%)`;
    const tempParticles = [];
    
    // 我们这里偷个懒，直接借用Firework类逻辑，或者创建一个不带上升过程的烟花
    // 为了简单，我们直接往fireworks数组里推一个已经exploded的烟花对象
    const fw = new Firework(e.clientX, e.clientY);
    fw.exploded = true;
    fw.y = e.clientY; // 修正y坐标
    SoundManager.playExplosion(); // 点击立即爆炸
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        const velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
        fw.particles.push(new Particle(e.clientX, e.clientY, color, velocity));
    }
    fireworks.push(fw);
});