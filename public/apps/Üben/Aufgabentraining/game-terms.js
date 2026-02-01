const termGame = {
    state: {
        config: null,
        currentTask: null,
        userTerm: [], // Array of strings (e.g. ["5", "+", "3"])
        isFinished: false,
        opsState: null // Will store the active state of operators
    },

    // UI Templates
    renderConfig() {
        // Initialize default

        if (!this.state.opsState) {
            this.state.opsState = {
                plus: true, minus: true, mult: true, div: true, brackets: false
            };
        }

        const ops = this.state.opsState;

        // Compact layout
        return `
            <div class="max-w-lg mx-auto static-card rounded-xl p-6 animate-fade-in flex flex-col justify-center min-h-[500px]">
                <h2 class="text-xl font-bold mb-4 text-center">Einstellungen</h2>
                
                <!-- Operators -->
                <div class="mb-4">
                    <label class="block text-xs font-medium mb-2 text-muted-foreground">Rechenzeichen</label>
                    <div class="grid grid-cols-5 gap-2">
                        ${this.renderOpToggle('plus', '+', ops.plus)}
                        ${this.renderOpToggle('minus', '-', ops.minus)}
                        ${this.renderOpToggle('mult', '×', ops.mult)}
                        ${this.renderOpToggle('div', '÷', ops.div)}
                        ${this.renderOpToggle('brackets', '( )', ops.brackets)}
                    </div>
                </div>

                <!-- Range -->
                <div class="mb-4">
                    <label class="block text-xs font-medium mb-2 text-muted-foreground">Zahlenraum</label>
                    <select id="config-range" class="w-full bg-[#1e293b] border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <option value="20">bis 20</option>
                        <option value="100" selected>bis 100</option>
                        <option value="1000">bis 1'000</option>
                    </select>
                </div>

                <!-- Difficulty -->
                <div class="mb-6">
                    <label class="block text-xs font-medium mb-2 text-muted-foreground">Schwierigkeitsgrad</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button onclick="termGame.selectDiff(this, 'normal')" class="diff-btn active px-2 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs transition-all bg-primary/20 ring-1 ring-primary/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]">Normal</button>
                        <button onclick="termGame.selectDiff(this, 'advanced')" class="diff-btn px-2 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs transition-all">Fortgeschritten</button>
                        <button onclick="termGame.selectDiff(this, 'profi')" class="diff-btn px-2 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs transition-all">Profi</button>
                    </div>
                </div>

                <div class="mt-auto">
                    <p id="config-error" class="hidden text-red-400 text-xs mb-2 text-center">Wähle mind. ein Punkt- und Strichzeichen!</p>
                    <button onclick="termGame.start()" class="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-lg hover:opacity-90 transition-opacity">
                        Übung starten
                    </button>
                </div>
            </div>
        `;
    },

    renderOpToggle(id, label, active) {
        const activeClass = active
            ? 'bg-primary text-primary-foreground ring-1 ring-primary ring-offset-1 ring-offset-[#0b1120] shadow-sm'
            : 'bg-white/5 text-muted-foreground hover:bg-white/10';

        return `
            <button id="op-btn-${id}" onclick="termGame.toggleOp('${id}')" 
                class="op-toggle-btn flex items-center justify-center p-2 rounded-md border border-white/5 transition-all duration-200 ${activeClass}"
                data-op="${id}">
                <span class="font-bold text-base">${label}</span>
            </button>
        `;
    },

    toggleOp(id) {
        this.state.opsState[id] = !this.state.opsState[id];
        const btn = document.getElementById(`op-btn-${id}`);
        if (this.state.opsState[id]) {
            btn.className = 'op-toggle-btn flex items-center justify-center p-2 rounded-md border border-white/5 transition-all duration-200 bg-primary text-primary-foreground ring-1 ring-primary ring-offset-1 ring-offset-[#0b1120] shadow-sm';
        } else {
            btn.className = 'op-toggle-btn flex items-center justify-center p-2 rounded-md border border-white/5 transition-all duration-200 bg-white/5 text-muted-foreground hover:bg-white/10';
        }
    },

    // Logic
    init() {
        const grid = document.getElementById('dashboard-grid');
        // Hide global text to save space
        const headerTitle = document.getElementById('section-title');
        const headerDesc = document.getElementById('section-desc');
        // Optional: Hide them completely for game mode if user wants "compact"
        // But for now let's keep them small.

        grid.className = "flex justify-center items-start min-h-[600px]"; // Use flex to center single card
        this.state.opsState = { plus: true, minus: true, mult: true, div: true, brackets: false };
        grid.innerHTML = this.renderConfig();

        window.termGame = this;
    },

    selectDiff(btn, level) {
        document.querySelectorAll('.diff-btn').forEach(b => {
            b.className = "diff-btn px-2 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs transition-all";
        });
        btn.className = "diff-btn active px-2 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs transition-all bg-primary/20 ring-1 ring-primary/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]";
        this.currentDiff = level;
    },

    start() {
        const ops = this.state.opsState;
        const range = parseInt(document.getElementById('config-range').value);

        const hasPoint = ops.mult || ops.div;
        const hasLine = ops.plus || ops.minus;

        if (!hasPoint || !hasLine) {
            document.getElementById('config-error').classList.remove('hidden');
            return;
        }

        this.state.config = { ops, range, difficulty: this.currentDiff || 'normal' };
        this.nextTask();
    },

    nextTask() {
        this.state.userTerm = [];
        this.state.isFinished = false;
        this.state.currentTask = this.generateTask();

        this.state.currentTask.elements.sort((a, b) => {
            if (a.type === b.type) return 0;
            return a.type === 'number' ? -1 : 1;
        });

        this.initGameUI();
    },

    generateTask() {
        const { range, ops } = this.state.config;
        const diff = this.state.config.difficulty;
        let task = null;
        let attempts = 0;
        while (!task && attempts < 50) {
            attempts++;
            try { task = this.createEquation(range, ops, diff); } catch (e) { }
        }
        if (!task) task = { target: 10, elements: [{ type: 'number', val: 5, id: 'n1' }, { type: 'number', val: 2, id: 'n2' }, { type: 'op', val: '×', id: 'o1' }] };
        return task;
    },

    createEquation(range, ops, diff) {
        const allowBrackets = ops.brackets;
        if (allowBrackets) {
            const lineOps = []; if (ops.plus) lineOps.push('+'); if (ops.minus) lineOps.push('-');
            const pointOps = []; if (ops.mult) pointOps.push('*'); if (ops.div) pointOps.push('/');
            if (lineOps.length === 0 || pointOps.length === 0) return this.createSimpleEquation(range, ops, 3);

            const op1 = lineOps[Math.floor(Math.random() * lineOps.length)];
            const op2 = pointOps[Math.floor(Math.random() * pointOps.length)];
            const a = Math.floor(Math.random() * 10) + 1;
            const b = Math.floor(Math.random() * 10) + 1;

            let c;
            let term1Res = (op1 === '+') ? a + b : a - b;

            if (op2 === '*') {
                c = Math.floor(Math.random() * 10) + 2;
            } else {
                const factors = [];
                for (let i = 2; i < Math.abs(term1Res); i++) if (term1Res % i === 0) factors.push(i);
                if (factors.length === 0) c = 1; else c = factors[Math.floor(Math.random() * factors.length)];
            }

            let target = (op2 === '*') ? term1Res * c : term1Res / c;
            if (target > range || target < 0) throw "Out of range";

            const elements = [
                { type: 'number', val: a, id: 'n1' },
                { type: 'number', val: b, id: 'n2' },
                { type: 'number', val: c, id: 'n3' },
                { type: 'op', val: op1, id: 'o1' },
                { type: 'op', val: op2 === '*' ? '×' : '÷', id: 'o2' },
                { type: 'op', val: '(', id: 'b1' },
                { type: 'op', val: ')', id: 'b2' }
            ];
            return { target, elements };
        } else {
            let numCount = 3;
            if (diff === 'advanced') numCount = 4;
            if (diff === 'profi') numCount = 5;
            return this.createSimpleEquation(range, ops, numCount);
        }
    },

    createSimpleEquation(range, ops, numElements) {
        const availOps = [];
        if (ops.plus) availOps.push('+'); if (ops.minus) availOps.push('-');
        if (ops.mult) availOps.push('*'); if (ops.div) availOps.push('/');
        if (availOps.length === 0) throw "No ops";

        let nums = [];
        let operators = [];

        for (let i = 0; i < numElements; i++) nums.push(Math.floor(Math.random() * 20) + 1);
        for (let i = 0; i < numElements - 1; i++) operators.push(availOps[Math.floor(Math.random() * availOps.length)]);

        let str = "";
        for (let i = 0; i < nums.length; i++) {
            str += nums[i];
            if (i < operators.length) str += " " + operators[i] + " ";
        }

        const res = eval(str);
        if (!Number.isInteger(res)) throw "Decimal";
        if (res < 0 || res > range) throw "Range";

        const elements = nums.map((n, i) => ({ type: 'number', val: n, id: 'n' + i }));
        operators.forEach((o, i) => elements.push({ type: 'op', val: o === '*' ? '×' : (o === '/' ? '÷' : o), id: 'o' + i }));

        return { target: res, elements };
    },

    initGameUI() {
        const grid = document.getElementById('dashboard-grid');

        // Highly Compact Game Layout
        grid.innerHTML = `
            <div class="w-full max-w-3xl mx-auto flex flex-col h-[calc(100vh-120px)] animate-fade-in relative">
                
                <!-- Target (Top) -->
                <div class="text-center py-2 flex-shrink-0">
                    <div class="text-xs text-muted-foreground uppercase tracking-widest">Zielzahl</div>
                    <div class="text-5xl font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-tight">
                        ${this.state.currentTask.target}
                    </div>
                </div>

                <!-- Equation Area (Middle - Grow) -->
                <div class="flex-1 flex flex-col justify-center items-center py-2 min-h-[100px]">
                    <div class="static-card w-full p-4 rounded-xl border-white/10 flex items-center justify-center relative min-h-[100px]">
                        <div id="equation-container" class="flex items-center flex-wrap justify-center gap-2">
                            <span class="text-white/20 italic text-lg">Wähle Zahlen & Zeichen...</span>
                        </div>
                        <span class="text-xl font-bold text-white/50 ml-3 absolute right-4">= ${this.state.currentTask.target}</span>

                         <button onclick="termGame.backspace()" class="absolute left-3 p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors" title="Rückgängig">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
                        </button>
                    </div>
                    
                    <!-- Feedback / Check Button -->
                    <div class="h-14 mt-4 w-full flex justify-center items-center relative">
                        <button id="check-btn" onclick="termGame.checkSolution()" disabled class="bg-primary text-primary-foreground text-sm font-bold px-8 py-2 rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all opacity-50 cursor-not-allowed">
                            Überprüfen
                        </button>
                        <div id="feedback-area" class="absolute w-full text-center pointer-events-none"></div>
                    </div>
                </div>

                <!-- Item Pool (Bottom) -->
                <div id="pool-container" class="flex flex-wrap justify-center gap-3 pb-4 content-end flex-shrink-0">
                    ${this.renderPool()}
                </div>
                
                <!-- Success Overlay -->
                <div id="success-area" class="hidden absolute inset-0 bg-background/90 backdrop-blur-md z-50 flex flex-col items-center justify-center rounded-xl animate-fade-in">
                    <h3 class="text-3xl font-bold text-green-400 mb-6">Richtig! 🎉</h3>
                    <button onclick="termGame.nextTask()" class="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-bold transition-colors shadow-lg shadow-green-900/20">
                        Nächste Aufgabe
                    </button>
                </div>
            </div>
        `;
    },

    renderPool() {
        // Filter out used IDs
        const usedIds = new Set(this.state.userTerm.map(e => e.id));
        return this.state.currentTask.elements.map(el => {
            if (usedIds.has(el.id)) return `<div style="width: 60px; height: 50px;"></div>`; // Placeholder to keep layout stable

            let colorClass = el.type === 'number' ? 'bg-blue-500/20 text-blue-100 border-blue-500/30' : 'bg-white/10 text-white border-white/10';
            return `
                <button id="btn-${el.id}" onclick="termGame.handleElementClick('${el.id}')" 
                    class="${colorClass} border w-[60px] h-[50px] rounded-lg text-lg font-bold hover:scale-110 active:scale-95 transition-all shadow-md backdrop-blur-sm flex items-center justify-center">
                    ${el.val}
                </button>
            `;
        }).join('');
    },

    updateGameUI() {
        const container = document.getElementById('equation-container');

        // Update equation
        const termHtml = this.state.userTerm.map(el => `
             <span class="text-2xl font-bold mx-1">${el.val}</span>
        `).join('');
        container.innerHTML = termHtml.length > 0 ? termHtml : '<span class="text-white/20 italic text-lg">Wähle Zahlen & Zeichen...</span>';

        // Update Pool (Re-render to handle placeholders correctly)
        document.getElementById('pool-container').innerHTML = this.renderPool();

        // Check Button Logic
        const checkBtn = document.getElementById('check-btn');
        if (checkBtn) {
            // Enable if at least 1 number and 1 operator are present (roughly)
            // Or simpler: Just length >= 3
            if (this.state.userTerm.length >= 3) {
                checkBtn.disabled = false;
                checkBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else {
                checkBtn.disabled = true;
                checkBtn.classList.add('opacity-50', 'cursor-not-allowed');
            }
        }
    },

    handleElementClick(elId) {
        if (this.state.isFinished) return;

        const btn = document.getElementById(`btn-${elId}`);
        if (!btn || btn.classList.contains('pointer-events-none')) return;

        // Disable interaction immediately to prevent double-click
        btn.classList.add('opacity-50', 'pointer-events-none');

        // Clone button for animation
        const rect = btn.getBoundingClientRect();
        const clone = btn.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.left = rect.left + 'px';
        clone.style.top = rect.top + 'px';
        clone.style.width = rect.width + 'px';
        clone.style.height = rect.height + 'px';
        clone.style.zIndex = '100';
        clone.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        clone.style.margin = '0';
        document.body.appendChild(clone);

        // Find target position (end of equation container)
        const container = document.getElementById('equation-container');
        const containerRect = container.getBoundingClientRect();

        // If container empty, center. Else, after last child.
        // Approximate center of container for simplicity, or slightly to the right of last child.
        // Let's aim for center of container for "flying in" effect
        const targetX = containerRect.left + containerRect.width / 2 - rect.width / 2; // Center
        const targetY = containerRect.top + containerRect.height / 2 - rect.height / 2;

        // Force reflow
        clone.getBoundingClientRect();

        // Animate
        clone.style.left = targetX + 'px';
        clone.style.top = targetY + 'px';
        clone.style.opacity = '0.5';
        clone.style.transform = 'scale(0.8)';

        // After animation, update state
        setTimeout(() => {
            clone.remove();

            // Logic update
            const elIndex = this.state.currentTask.elements.findIndex(e => e.id === elId);
            if (elIndex !== -1) {
                const element = this.state.currentTask.elements[elIndex];
                this.state.userTerm.push(element);
                this.updateGameUI();
            }
        }, 400);
    },

    backspace() {
        if (this.state.userTerm.length === 0) return;
        this.state.userTerm.pop();
        this.updateGameUI();
    },

    checkSolution() {
        if (this.state.isFinished) return;

        const feedback = document.getElementById('feedback-area');
        const checkBtn = document.getElementById('check-btn');
        const successArea = document.getElementById('success-area');

        // Reset previous feedback state
        checkBtn.textContent = 'Überprüfen';
        checkBtn.classList.remove('bg-red-500', 'hover:bg-red-600', 'animate-shake');
        checkBtn.classList.add('bg-primary');
        feedback.innerHTML = '';

        let termStr = this.state.userTerm.map(e => e.val.toString().replace('×', '*').replace('÷', '/')).join(' ');

        try {
            if (!/^[0-9+\-*/().\s]+$/.test(termStr)) throw "Format";
            const result = eval(termStr);

            if (result === this.state.currentTask.target) {
                const numbersUsed = this.state.userTerm.filter(e => e.type === 'number').length;
                if (numbersUsed >= 2) {
                    this.state.isFinished = true;
                    // Show success overlay
                    successArea.classList.remove('hidden');
                    return;
                }
                this.showError("Nutze mehr Zahlen!");
            } else {
                this.showError("Falsches Ergebnis");
            }
        } catch (e) {
            this.showError("Ungültige Rechnung");
        }
    },

    showError(msg) {
        const checkBtn = document.getElementById('check-btn');
        const feedback = document.getElementById('feedback-area');

        checkBtn.classList.add('animate-shake', 'bg-red-500', 'hover:bg-red-600');
        checkBtn.classList.remove('bg-primary');
        checkBtn.textContent = 'Falsch ❌';

        feedback.innerHTML = `<span class="text-red-400 font-bold bg-background/80 px-2 py-1 rounded shadow-sm">${msg}</span>`;

        setTimeout(() => {
            checkBtn.classList.remove('animate-shake');
        }, 500);
    },

    renderGame(success = false) {
        this.initGameUI();
    }
};
