import { db } from "./firebase.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const defaultDb = {
    athletes: [
        { id: 1, firstName: 'Carlos', lastName: 'Méndez', sex: 'M', birthDate: '2005-06-15', joinDate: '2024-01-10', club: 'Nitroblaze', compNumber: '105', category: 'Juvenil', active: true, photo: 'https://i.pravatar.cc/150?u=1' },
        { id: 2, firstName: 'Valentina', lastName: 'Rojas', sex: 'F', birthDate: '2008-02-10', joinDate: '2025-03-01', club: 'Nitroblaze', compNumber: '210', category: 'Pre-Juvenil', active: true, photo: 'https://i.pravatar.cc/150?u=2' },
        { id: 3, firstName: 'Mateo', lastName: 'Silva', sex: 'M', birthDate: '2006-11-20', joinDate: '2023-11-20', club: 'Nitroblaze', compNumber: '112', category: 'Juvenil', active: true, photo: 'https://i.pravatar.cc/150?u=3' },
        { id: 4, firstName: 'Sofía', lastName: 'Gómez', sex: 'F', birthDate: '2004-08-05', joinDate: '2022-05-15', club: 'Nitroblaze', compNumber: '089', category: 'Mayores', active: true, photo: 'https://i.pravatar.cc/150?u=4' }
    ],
    attendance: [],
    speed: [
        { id: 1, athleteId: 1, date: '2026-05-10', distance: 100, time: 10.5 },
        { id: 2, athleteId: 3, date: '2026-05-10', distance: 100, time: 10.1 },
        { id: 3, athleteId: 2, date: '2026-05-10', distance: 100, time: 11.2 },
        { id: 4, athleteId: 4, date: '2026-05-10', distance: 100, time: 10.8 }
    ],
    force: [
        { id: 1, athleteId: 1, date: '2026-05-12', height: 45, flightTime: 250, forceN: 1500, velocity: 2.5, power: 1800 },
        { id: 2, athleteId: 3, date: '2026-05-12', height: 52, flightTime: 280, forceN: 1600, velocity: 2.8, power: 2000 },
        { id: 3, athleteId: 2, date: '2026-05-12', height: 40, flightTime: 230, forceN: 1200, velocity: 2.2, power: 1500 },
        { id: 4, athleteId: 4, date: '2026-05-12', height: 48, flightTime: 260, forceN: 1400, velocity: 2.6, power: 1750 }
    ],
    medals: [
        { id: 1, athleteId: 1, date: '2026-04-20', league: 'Liga Nacional', medal: 'Oro' },
        { id: 2, athleteId: 4, date: '2026-04-20', league: 'Liga Nacional', medal: 'Plata' }
    ],
    personalCompetitions: [
        { id: 1, athleteId: 1, date: '2026-04-20', league: 'Liga Nacional', distance: 200, bestSeriesTime: 18.5, personalTime: 18.2, position: 1 }
    ],
    globalCompetitions: [
        { id: 1, date: '2026-10-15', league: 'Campeonato Regional', location: 'Estadio Nacional', dateNumber: '1ra Fecha' }
    ]
};

// Auto-clean past global competitions on load
const cleanGlobalCompetitions = (data) => {
    const today = new Date().toISOString().split('T')[0];
    data.globalCompetitions = data.globalCompetitions.filter(c => c.date >= today);
    return data;
};

let db = JSON.parse(localStorage.getItem('nitroblaze_db_v3')) || null;
if (!db) {
    db = defaultDb;
    const today = new Date();
    db.athletes.forEach(athlete => {
        for(let i=0; i<30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            db.attendance.push({
                athleteId: athlete.id,
                date: d.toISOString().split('T')[0],
                present: Math.random() > 0.2,
                comment: ''
            });
        }
    });
}
db = cleanGlobalCompetitions(db);
saveDb();

function saveDb() {
    localStorage.setItem('nitroblaze_db_v3', JSON.stringify(db));
}

const phrases = [
    "La disciplina vence al talento.",
    "Cada entrenamiento cuenta.",
    "La velocidad se construye.",
    "Hoy entrenas, mañana ganas."
];

// --- UTILITIES ---
const calculateAge = (birthDate) => {
    if(!birthDate) return 0;
    const diff = Date.now() - new Date(birthDate).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
};

const getAttendancePercentage = (athleteId = null) => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    let validRecords = db.attendance.filter(r => new Date(r.date) >= thirtyDaysAgo);
    if(athleteId) validRecords = validRecords.filter(r => r.athleteId === athleteId);
    
    const total = validRecords.length;
    const present = validRecords.filter(r => r.present).length;
    return total === 0 ? 0 : Math.round((present / total) * 100);
};

const getBestSpeed = (athleteId) => {
    const records = db.speed.filter(s => s.athleteId === athleteId);
    if(records.length === 0) return null;
    return records.reduce((min, p) => p.time < min.time ? p : min, records[0]);
};

const getBestJump = (athleteId) => {
    const records = db.force.filter(f => f.athleteId === athleteId);
    if(records.length === 0) return null;
    return records.reduce((max, p) => p.height > max.height ? p : max, records[0]);
};

// --- APP CORE ---
const app = {
    currentView: 'home',
    activeContextId: null,
    isAdmin: false,
    editingId: null,
    charts: [],

    init() {
        this.updateHeader();
        this.bindNavigation();
        document.getElementById('motivational-quote').innerText = '"' + phrases[Math.floor(Math.random() * phrases.length)] + '"';
        this.renderView('home');
    },

    updateHeader() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('es-ES', options);
        
        const lockIcon = document.getElementById('admin-lock-icon');
        if (lockIcon) {
            lockIcon.className = this.isAdmin ? 'ph ph-unlock' : 'ph ph-lock';
            lockIcon.style.color = this.isAdmin ? 'var(--color-primary)' : 'var(--color-text-muted)';
        }
    },

    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
                e.currentTarget.classList.add('active');
                this.navigateTo(view);
            });
        });
    },

    navigateTo(view, data = null) {
        this.currentView = view;
        if(data) this.activeContextId = data;
        
        // Handle attendance tab logic
        if (view === 'attendance') {
            if (this.isAdmin) {
                view = 'take-attendance';
                this.currentView = 'take-attendance';
            } else {
                view = 'attendance-read';
                this.currentView = 'attendance-read';
            }
        }
        
        this.renderView(view, data);
        
        const fab = document.getElementById('fab-main');
        const fabViews = ['athletes', 'view-speed', 'view-force', 'personal-competitions', 'medals', 'global-competitions'];
        if (this.isAdmin && fabViews.includes(this.currentView)) {
            fab.classList.remove('hidden');
            document.getElementById('fab-icon').className = 'ph ph-plus';
        } else {
            fab.classList.add('hidden');
        }
        window.scrollTo(0, 0);
    },
    
    handleFabClick() {
        if(!this.isAdmin) return;
        this.editingId = null; // Reset editing state on new creation
        if(this.currentView === 'athletes') this.modals.showAthleteForm();
        else if(this.currentView === 'view-speed') this.modals.showControlSpeedForm();
        else if(this.currentView === 'view-force') this.modals.showControlForceForm();
        else if(this.currentView === 'personal-competitions') this.modals.showPersonalCompetitionForm();
        else if(this.currentView === 'medals') this.modals.showMedalForm();
        else if(this.currentView === 'global-competitions') this.modals.showGlobalCompetitionForm();
    },

    destroyCharts() {
        this.charts.forEach(c => c.destroy());
        this.charts = [];
    },

    renderView(view, data = null) {
        const main = document.getElementById('main-content');
        this.destroyCharts();
        
        let html = '';
        switch(view) {
            case 'home': html = this.views.home(); break;
            case 'athletes': html = this.views.athletes(); break;
            case 'athlete-profile': html = this.views.athleteProfile(this.activeContextId); break;
            case 'take-attendance': html = this.views.takeAttendance(); break;
            case 'attendance-read': html = this.views.attendanceRead(); break;
            case 'global-competitions': html = this.views.globalCompetitions(); break; 
            case 'personal-competitions': html = this.views.personalCompetitions(this.activeContextId); break;
            case 'medals': html = this.views.medals(this.activeContextId); break;
            case 'view-speed': html = this.views.controlSpeedList(this.activeContextId); break;
            case 'view-force': html = this.views.controlForceList(this.activeContextId); break;
            case 'view-attendance-cal': html = this.views.attendanceCalendar(this.activeContextId); break;
            default: html = `<div class="section-title">En construcción...</div>`;
        }
        
        main.innerHTML = `<div class="view active" id="view-${view}">${html}</div>`;
        
        setTimeout(() => {
            if(view === 'home') this.postRender.home();
        }, 100);
    },

    saveAttendance() {
        const dateStr = new Date().toISOString().split('T')[0];
        db.athletes.forEach(ath => {
            const cb = document.getElementById(`att-${ath.id}`);
            const comment = document.getElementById(`comment-${ath.id}`);
            if(cb) {
                db.attendance = db.attendance.filter(a => !(a.athleteId === ath.id && a.date === dateStr));
                db.attendance.push({
                    athleteId: ath.id,
                    date: dateStr,
                    present: cb.checked,
                    comment: comment ? comment.value : ''
                });
            }
        });
        saveDb();
        alert('Asistencia guardada con éxito');
    },

    getAdminActionsHtml(tableName, id, editFunctionStr) {
        if (!this.isAdmin) return '';
        return `
            <div style="position: absolute; right: 15px; top: 15px; display: flex; gap: 12px; z-index: 10;">
                <i class="ph ph-pencil" style="cursor:pointer; color:var(--color-primary); font-size:1.2rem;" onclick="event.stopPropagation(); app.modals.${editFunctionStr}(${id})"></i>
                <i class="ph ph-trash" style="cursor:pointer; color:#ff4d4d; font-size:1.2rem;" onclick="event.stopPropagation(); app.actions.deleteRecord('${tableName}', ${id})"></i>
            </div>
        `;
    },

    views: {
        home() {
            const attPerc = getAttendancePercentage();
            const activeCount = db.athletes.filter(a => a.active).length;
            const totalMedals = db.medals.length;
            
            // Podiums
            const getPodiumSpeed = (sex) => {
                const map = new Map();
                db.speed.forEach(s => {
                    const ath = db.athletes.find(a => a.id === s.athleteId);
                    if(ath && ath.sex === sex) {
                        if(!map.has(ath.id) || s.time < map.get(ath.id).time) map.set(ath.id, s);
                    }
                });
                return Array.from(map.values()).sort((a,b) => a.time - b.time).slice(0,3);
            };
            
            const getPodiumForce = (sex) => {
                const map = new Map();
                db.force.forEach(f => {
                    const ath = db.athletes.find(a => a.id === f.athleteId);
                    if(ath && ath.sex === sex) {
                        if(!map.has(ath.id) || f.height > map.get(ath.id).height) map.set(ath.id, f);
                    }
                });
                return Array.from(map.values()).sort((a,b) => b.height - a.height).slice(0,3);
            };
            
            const athAtt = db.athletes.map(a => ({ id: a.id, perc: getAttendancePercentage(a.id) }))
                                      .sort((a,b) => b.perc - a.perc).slice(0,3);

            return `
                <div class="card grid-2">
                    <div class="stat-card">
                        <div class="stat-value">${activeCount}</div>
                        <div class="stat-label">Deportistas Activos</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" style="color: var(--color-gold);">${totalMedals}</div>
                        <div class="stat-label">Medallas Totales</div>
                    </div>
                </div>

                <div class="section-title"><i class="ph ph-trend-up"></i> Asistencia Global (30 días)</div>
                <div class="card" style="display:flex; flex-direction:column; align-items:center; position:relative;">
                    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:2rem; font-weight:800; color:var(--color-primary);">${attPerc}%</div>
                    <div class="chart-container" style="height: 200px; width: 100%;">
                        <canvas id="homeAttendanceDonut"></canvas>
                    </div>
                </div>

                ${this.renderPodium('Mejor Velocidad (Varones)', getPodiumSpeed('M'), 'time', 's', true)}
                ${this.renderPodium('Mejor Velocidad (Damas)', getPodiumSpeed('F'), 'time', 's', true)}
                ${this.renderPodium('Mejor Salto (Varones)', getPodiumForce('M'), 'height', 'cm', true)}
                ${this.renderPodium('Mejor Salto (Damas)', getPodiumForce('F'), 'height', 'cm', true)}
                ${this.renderPodium('Mejor Asistencia (General)', athAtt, 'perc', '%', false)}
            `;
        },

        renderPodium(title, items, metricKey, unit, showMedals) {
            if(items.length === 0) return '';
            const medals = ['var(--color-gold)', 'var(--color-silver)', 'var(--color-bronze)'];
            return `
                <div class="section-title"><i class="ph ph-trophy"></i> ${title}</div>
                <div class="card podium-list">
                    ${items.map((item, idx) => {
                        const ath = db.athletes.find(a => a.id === (item.athleteId || item.id));
                        if(!ath) return '';
                        let colorStr = showMedals ? `color: ${medals[idx]}; text-shadow: 0 0 10px ${medals[idx]}88;` : 'color: var(--color-text-muted);';
                        return `
                        <div class="podium-item pos-${idx+1}">
                            <div class="podium-pos" style="${colorStr}">${idx+1}</div>
                            <img src="${ath.photo}" class="avatar" alt="Avatar">
                            <div class="podium-info">
                                <div class="podium-name">${ath.firstName} ${ath.lastName}</div>
                                <div class="podium-metric">${item[metricKey]}${unit}</div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            `;
        },
        
        athletes() {
            const sorted = [...db.athletes].sort((a,b) => calculateAge(a.birthDate) - calculateAge(b.birthDate));
            return `
                <div class="section-title"><i class="ph ph-users"></i> Deportistas Activos</div>
                ${sorted.map(ath => `
                    <div class="athlete-item" style="position:relative;" onclick="app.navigateTo('athlete-profile', ${ath.id})">
                        ${app.getAdminActionsHtml('athletes', ath.id, 'showAthleteForm')}
                        <img src="${ath.photo}" class="avatar" style="width: 50px; height: 50px;">
                        <div class="athlete-info" style="padding-right: 50px;">
                            <div class="athlete-name">${ath.firstName} ${ath.lastName}</div>
                            <div class="athlete-meta">${ath.category} • ${calculateAge(ath.birthDate)} años • #${ath.compNumber}</div>
                        </div>
                    </div>
                `).join('')}
            `;
        },

        athleteProfile(id) {
            const ath = db.athletes.find(a => a.id === id);
            if(!ath) return `<div class="section-title">Deportista no encontrado</div>`;
            const bestSpd = getBestSpeed(id);
            const bestJmp = getBestJump(id);

            return `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 16px;">
                    <button class="btn" style="width: auto; margin:0;" onclick="app.navigateTo('athletes')">
                        <i class="ph ph-arrow-left"></i> Volver
                    </button>
                    ${app.isAdmin ? `<button class="btn btn-primary" style="width:auto; margin:0; font-size:0.9rem;" onclick="app.modals.showAthleteForm(${ath.id})"><i class="ph ph-pencil"></i> Editar Perfil</button>` : ''}
                </div>
                
                <div class="card" style="text-align: center; position:relative;">
                    <img src="${ath.photo}" class="avatar" style="width: 100px; height: 100px; margin: 0 auto 16px;">
                    <h2>${ath.firstName} ${ath.lastName}</h2>
                    <div style="color: var(--color-primary); margin-top: 4px;">#${ath.compNumber} • ${ath.club} • ${ath.category} • ${ath.sex}</div>
                    <div style="color: var(--color-text-muted); margin-top: 4px;">${calculateAge(ath.birthDate)} años • Ingreso: ${ath.joinDate}</div>
                </div>

                <div class="grid-2" style="margin-bottom: 16px;">
                    <div class="card" style="text-align:center; padding:15px; background: linear-gradient(135deg, rgba(0,229,255,0.1), transparent); border-color: rgba(0,229,255,0.3);">
                        <i class="ph ph-shooting-star" style="color: var(--color-gold); font-size: 2rem; margin-bottom:5px;"></i>
                        <div style="font-size: 0.8rem; color: var(--color-text-muted);">Mejor Velocidad</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #fff;">${bestSpd ? bestSpd.time + 's' : '--'}</div>
                    </div>
                    <div class="card" style="text-align:center; padding:15px; background: linear-gradient(135deg, rgba(0,229,255,0.1), transparent); border-color: rgba(0,229,255,0.3);">
                        <i class="ph ph-star" style="color: var(--color-gold); font-size: 2rem; margin-bottom:5px;"></i>
                        <div style="font-size: 0.8rem; color: var(--color-text-muted);">Mejor Salto</div>
                        <div style="font-size: 1.5rem; font-weight: 800; color: #fff;">${bestJmp ? bestJmp.height + 'cm' : '--'}</div>
                    </div>
                </div>
                
                <div class="card" style="display:flex; flex-direction:column; gap:10px;">
                    <button class="btn" style="background: var(--color-surface-light)" onclick="app.navigateTo('view-attendance-cal', ${id})"><i class="ph ph-calendar-check"></i> Asistencia</button>
                    <button class="btn" style="background: var(--color-surface-light)" onclick="app.navigateTo('personal-competitions', ${id})"><i class="ph ph-flag-checkered"></i> Competencias</button>
                    <button class="btn" style="background: var(--color-surface-light)" onclick="app.navigateTo('view-speed', ${id})"><i class="ph ph-timer"></i> Control Velocidad</button>
                    <button class="btn" style="background: var(--color-surface-light)" onclick="app.navigateTo('view-force', ${id})"><i class="ph ph-barbell"></i> Controles Fuerza</button>
                    <button class="btn" style="background: var(--color-surface-light)" onclick="app.navigateTo('medals', ${id})"><i class="ph ph-medal"></i> Medallero</button>
                </div>
            `;
        },

        attendanceCalendar(id) {
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            
            let gridHtml = '';
            for(let i=1; i<=daysInMonth; i++) {
                const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const record = db.attendance.find(r => r.athleteId === id && r.date === dateStr);
                
                let cls = '';
                if(record) {
                    cls = record.present ? 'present' : 'absent';
                }
                
                let commentHtml = '';
                if(record && record.comment) {
                    commentHtml = `<div style="font-size:0.5rem; line-height:1.1; margin-top:2px; word-wrap:break-word; max-width:100%; overflow:hidden;">${record.comment}</div>`;
                }
                
                gridHtml += `<div class="cal-day ${cls}" style="flex-direction:column; padding:2px; text-align:center;">
                                <div style="font-weight:bold;">${i}</div>
                                ${commentHtml}
                             </div>`;
            }

            return `
                <button class="btn" style="width: auto; margin-bottom: 16px;" onclick="app.navigateTo('athlete-profile', ${id})">
                    <i class="ph ph-arrow-left"></i> Volver
                </button>
                <div class="section-title"><i class="ph ph-calendar"></i> Calendario ${today.toLocaleString('es-ES', { month: 'long' }).toUpperCase()}</div>
                <div class="card">
                    <div style="text-align:center; font-size: 2rem; color: var(--color-primary); font-weight:800; margin-bottom: 10px;">
                        ${getAttendancePercentage(id)}% <span style="font-size:0.8rem; color:var(--color-text-muted); font-weight:normal;">(Últimos 30 días)</span>
                    </div>
                    <div class="calendar-grid">
                        ${gridHtml}
                    </div>
                </div>
            `;
        },

        controlSpeedList(athleteId) {
            const records = db.speed.filter(s => s.athleteId === athleteId).sort((a,b) => new Date(b.date) - new Date(a.date));
            return `
                <button class="btn" style="width: auto; margin-bottom: 16px;" onclick="app.navigateTo('athlete-profile', ${athleteId})">
                    <i class="ph ph-arrow-left"></i> Volver
                </button>
                <div class="section-title"><i class="ph ph-timer"></i> Controles de Velocidad</div>
                ${records.map(r => `
                    <div class="card" style="position:relative;">
                        ${app.getAdminActionsHtml('speed', r.id, 'showControlSpeedForm')}
                        <div style="font-weight:bold; font-size:1.5rem; color:var(--color-primary);">${r.time}s</div>
                        <div style="color:var(--color-text-muted); font-size:0.9rem; margin-top:4px;">Fecha: ${r.date} • Distancia: ${r.distance}m</div>
                    </div>
                `).join('')}
            `;
        },

        controlForceList(athleteId) {
            const records = db.force.filter(f => f.athleteId === athleteId).sort((a,b) => new Date(b.date) - new Date(a.date));
            return `
                <button class="btn" style="width: auto; margin-bottom: 16px;" onclick="app.navigateTo('athlete-profile', ${athleteId})">
                    <i class="ph ph-arrow-left"></i> Volver
                </button>
                <div class="section-title"><i class="ph ph-barbell"></i> Controles de Fuerza</div>
                ${records.map(r => `
                    <div class="card" style="display:flex; flex-direction:column; gap:8px; position:relative;">
                        ${app.getAdminActionsHtml('force', r.id, 'showControlForceForm')}
                        <div style="font-weight:bold; font-size:1.5rem; color:var(--color-primary); padding-right:50px;">${r.height}cm <span style="font-size:0.9rem; color:var(--color-text-muted); font-weight:normal;">(Salto)</span></div>
                        <div class="grid-2">
                            <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted)">Vuelo:</span> ${r.flightTime}ms</div>
                            <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted)">Fuerza:</span> ${r.forceN}N</div>
                            <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted)">Velocidad:</span> ${r.velocity}m/s</div>
                            <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted)">Potencia:</span> ${r.power}W</div>
                        </div>
                        <div style="color:var(--color-text-muted); font-size:0.8rem; margin-top:4px;">Fecha: ${r.date}</div>
                    </div>
                `).join('')}
            `;
        },

        personalCompetitions(athleteId) {
            const records = db.personalCompetitions.filter(c => c.athleteId === athleteId).sort((a,b) => new Date(b.date) - new Date(a.date));
            return `
                <button class="btn" style="width: auto; margin-bottom: 16px;" onclick="app.navigateTo('athlete-profile', ${athleteId})">
                    <i class="ph ph-arrow-left"></i> Volver
                </button>
                <div class="section-title"><i class="ph ph-flag-checkered"></i> Competencias Personales</div>
                ${records.map(r => `
                    <div class="card" style="position:relative;">
                        ${app.getAdminActionsHtml('personalCompetitions', r.id, 'showPersonalCompetitionForm')}
                        <div style="font-weight:bold; font-size:1.1rem; color:var(--color-primary); padding-right:50px;">${r.league}</div>
                        <div style="color:var(--color-text); font-size:0.9rem; margin-top:4px;">Distancia: ${r.distance}m • Lugar: #${r.position}</div>
                        <div class="grid-2" style="margin-top:8px;">
                            <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted)">Mejor Serie:</span> ${r.bestSeriesTime}s</div>
                            <div style="font-size:0.85rem;"><span style="color:var(--color-text-muted)">Personal:</span> ${r.personalTime}s</div>
                        </div>
                        <div style="color:var(--color-text-muted); font-size:0.8rem; margin-top:8px;">Fecha: ${r.date}</div>
                    </div>
                `).join('')}
            `;
        },

        medals(athleteId) {
            const records = db.medals.filter(m => m.athleteId === athleteId).sort((a,b) => new Date(b.date) - new Date(a.date));
            return `
                <button class="btn" style="width: auto; margin-bottom: 16px;" onclick="app.navigateTo('athlete-profile', ${athleteId})">
                    <i class="ph ph-arrow-left"></i> Volver
                </button>
                <div class="section-title"><i class="ph ph-medal"></i> Medallero</div>
                ${records.map(m => {
                    let color = m.medal === 'Oro' ? 'var(--color-gold)' : m.medal === 'Plata' ? 'var(--color-silver)' : 'var(--color-bronze)';
                    return `
                    <div class="card" style="display: flex; align-items: center; gap: 16px; position:relative;">
                        ${app.getAdminActionsHtml('medals', m.id, 'showMedalForm')}
                        <i class="ph ph-medal" style="font-size: 2.5rem; color: ${color};"></i>
                        <div style="flex: 1; padding-right:40px;">
                            <div style="font-weight: 600; font-size: 1.1rem;">${m.league}</div>
                            <div style="color: ${color}; font-weight: bold; font-size: 0.9rem;">${m.medal}</div>
                            <div style="color: var(--color-text-muted); font-size: 0.8rem;">${m.date}</div>
                        </div>
                    </div>
                    `;
                }).join('')}
            `;
        },

        globalCompetitions() {
            const records = db.globalCompetitions.sort((a,b) => new Date(a.date) - new Date(b.date));
            return `
                <div class="section-title"><i class="ph ph-calendar"></i> Próximas Competencias del Club</div>
                
                <div class="card" style="text-align:center; padding:20px; margin-bottom: 16px; background:var(--color-surface-light);">
                    <i class="ph ph-calendar-blank" style="font-size: 3rem; color:var(--color-primary); margin-bottom:10px;"></i>
                    <p style="color:var(--color-text-muted); font-size:0.9rem;">Calendario automatizado. Las fechas pasadas se eliminan automáticamente.</p>
                </div>

                ${records.map(c => `
                    <div class="card" style="border-left: 4px solid var(--color-primary); position:relative;">
                        ${app.getAdminActionsHtml('globalCompetitions', c.id, 'showGlobalCompetitionForm')}
                        <div style="font-weight:bold; font-size:1.1rem; color:#fff; padding-right:50px;">${c.league}</div>
                        <div style="color:var(--color-primary); font-size:0.9rem; margin-top:2px;">${c.dateNumber}</div>
                        <div style="color:var(--color-text-muted); font-size:0.85rem; margin-top:8px;">
                            <i class="ph ph-map-pin"></i> ${c.location}
                        </div>
                        <div style="color:var(--color-text-muted); font-size:0.85rem; margin-top:4px;">
                            <i class="ph ph-calendar"></i> ${c.date}
                        </div>
                    </div>
                `).join('')}
                ${records.length === 0 ? `<div style="text-align:center; color:var(--color-text-muted); margin-top:30px;">No hay competencias futuras programadas.</div>` : ''}
            `;
        },

        attendanceRead() {
            return `
                <div class="section-title"><i class="ph ph-lock"></i> Acceso Restringido</div>
                <div class="card" style="text-align: center; padding: 40px 20px;">
                    <i class="ph ph-shield-warning" style="font-size: 3rem; color: var(--color-primary); margin-bottom:10px;"></i>
                    <p style="color: var(--color-text-muted);">La toma de asistencia diaria es una función exclusiva para entrenadores.</p>
                </div>
            `;
        },

        takeAttendance() {
            const dateStr = new Date().toISOString().split('T')[0];
            return `
                <div class="section-title">Asistencia Rápida - ${dateStr}</div>
                <div class="card">
                    ${db.athletes.map(ath => {
                        const existing = db.attendance.find(a => a.athleteId === ath.id && a.date === dateStr);
                        const isChecked = existing ? existing.present : true;
                        const comm = existing ? existing.comment : '';
                        return `
                        <div class="attendance-row" style="flex-direction:column; align-items:flex-start;">
                            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 8px;">
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <img src="${ath.photo}" class="avatar">
                                    <span style="font-weight: 600;">${ath.firstName} ${ath.lastName} <span style="color:var(--color-primary)">#${ath.compNumber}</span></span>
                                </div>
                                <label class="toggle-switch">
                                    <input type="checkbox" id="att-${ath.id}" ${isChecked ? 'checked' : ''}>
                                    <span class="slider"></span>
                                </label>
                            </div>
                            <input type="text" id="comment-${ath.id}" class="form-control" placeholder="Comentario opcional..." value="${comm}" style="font-size:0.8rem; padding:6px; background:rgba(0,0,0,0.5);">
                        </div>
                        <hr style="border-color: rgba(255,255,255,0.05); margin: 8px 0;">
                    `}).join('')}
                    <button class="btn btn-primary" style="margin-top: 16px;" onclick="app.saveAttendance()">
                        <i class="ph ph-floppy-disk"></i> Guardar Lista Diaria
                    </button>
                </div>
            `;
        }
    },

    postRender: {
        home() {
            const canvas = document.getElementById('homeAttendanceDonut');
            if(!canvas) return;
            const ctxDonut = canvas.getContext('2d');
            const att = getAttendancePercentage();
            app.charts.push(new Chart(ctxDonut, {
                type: 'doughnut',
                data: {
                    labels: ['Asistió', 'Ausente'],
                    datasets: [{
                        data: [att, 100 - att],
                        backgroundColor: ['#00e5ff', '#1C1E24'],
                        borderWidth: 0,
                        cutout: '85%'
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display:false } }, animation: false }
            }));
        }
    },

    modals: {
        show(html) {
            const overlay = document.getElementById('modal-overlay');
            const content = document.getElementById('modal-content');
            content.innerHTML = html;
            overlay.classList.remove('hidden');
        },
        hide() {
            document.getElementById('modal-overlay').classList.add('hidden');
            app.editingId = null;
        },
        showLogin() {
            if(app.isAdmin) {
                app.isAdmin = false;
                app.updateHeader();
                app.navigateTo('home');
                alert("Modo admin desactivado");
                return;
            }
            this.show(`
                <div class="modal-title"><i class="ph ph-lock"></i> Acceso Entrenador</div>
                <div class="form-group">
                    <label class="form-label">Contraseña</label>
                    <input type="password" id="form-pwd" class="form-control" placeholder="****">
                </div>
                <div class="modal-actions">
                    <button class="btn" onclick="app.modals.hide()">Cancelar</button>
                    <button class="btn btn-primary" onclick="app.actions.login()">Entrar</button>
                </div>
            `);
        },
        showAthleteForm(id = null) {
            app.editingId = id;
            let a = id ? db.athletes.find(x => x.id === id) : {};
            this.show(`
                <div class="modal-title">${id ? 'Editar' : 'Nuevo'} Deportista</div>
                <div class="form-group">
                    <label class="form-label">URL Imagen (opcional)</label>
                    <input type="text" id="form-photo" class="form-control" value="${a.photo || ''}" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label class="form-label">Nombre</label>
                    <input type="text" id="form-fn" class="form-control" value="${a.firstName || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Apellido</label>
                    <input type="text" id="form-ln" class="form-control" value="${a.lastName || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Número</label>
                    <input type="text" id="form-num" class="form-control" value="${a.compNumber || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Sexo</label>
                    <select id="form-sex" class="form-control">
                        <option value="M" ${a.sex === 'M' ? 'selected' : ''}>Masculino</option>
                        <option value="F" ${a.sex === 'F' ? 'selected' : ''}>Femenino</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha Nacimiento</label>
                    <input type="date" id="form-bd" class="form-control" value="${a.birthDate || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Fecha Ingreso</label>
                    <input type="date" id="form-join" class="form-control" value="${a.joinDate || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Categoría</label>
                    <input type="text" id="form-cat" class="form-control" value="${a.category || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">Club</label>
                    <input type="text" id="form-club" class="form-control" value="${a.club || 'Nitroblaze'}">
                </div>
                <div class="modal-actions">
                    <button class="btn" onclick="app.modals.hide()">Cancelar</button>
                    <button class="btn btn-primary" onclick="app.actions.saveAthlete()">Guardar</button>
                </div>
            `);
        },
        showControlSpeedForm(id = null) {
            app.editingId = id;
            let s = id ? db.speed.find(x => x.id === id) : {};
            this.show(`
                <div class="modal-title">${id ? 'Editar' : 'Nuevo'} Control Velocidad</div>
                <div class="form-group"><label class="form-label">Fecha</label><input type="date" id="form-date" class="form-control" value="${s.date || ''}"></div>
                <div class="form-group"><label class="form-label">Distancia (m)</label><input type="number" id="form-dist" class="form-control" value="${s.distance || ''}"></div>
                <div class="form-group"><label class="form-label">Tiempo de Control (s)</label><input type="number" step="0.01" id="form-time" class="form-control" value="${s.time || ''}"></div>
                <div class="modal-actions">
                    <button class="btn" onclick="app.modals.hide()">Cancelar</button>
                    <button class="btn btn-primary" onclick="app.actions.saveSpeed()">Guardar</button>
                </div>
            `);
        },
        showControlForceForm(id = null) {
            app.editingId = id;
            let f = id ? db.force.find(x => x.id === id) : {};
            this.show(`
                <div class="modal-title">${id ? 'Editar' : 'Nuevo'} Control Fuerza</div>
                <div class="form-group"><label class="form-label">Fecha</label><input type="date" id="form-date" class="form-control" value="${f.date || ''}"></div>
                <div class="form-group"><label class="form-label">Altura Salto (cm)</label><input type="number" step="0.1" id="form-height" class="form-control" value="${f.height || ''}"></div>
                <div class="form-group"><label class="form-label">Tiempo Vuelo (ms)</label><input type="number" id="form-flight" class="form-control" value="${f.flightTime || ''}"></div>
                <div class="form-group"><label class="form-label">Fuerza (N)</label><input type="number" step="0.1" id="form-force" class="form-control" value="${f.forceN || ''}"></div>
                <div class="form-group"><label class="form-label">Velocidad (m/s)</label><input type="number" step="0.1" id="form-vel" class="form-control" value="${f.velocity || ''}"></div>
                <div class="form-group"><label class="form-label">Potencia (W)</label><input type="number" step="0.1" id="form-power" class="form-control" value="${f.power || ''}"></div>
                <div class="modal-actions">
                    <button class="btn" onclick="app.modals.hide()">Cancelar</button>
                    <button class="btn btn-primary" onclick="app.actions.saveForce()">Guardar</button>
                </div>
            `);
        },
        showMedalForm(id = null) {
            app.editingId = id;
            let m = id ? db.medals.find(x => x.id === id) : {};
            this.show(`
                <div class="modal-title">${id ? 'Editar' : 'Agregar'} Medalla</div>
                <div class="form-group"><label class="form-label">Fecha</label><input type="date" id="form-date" class="form-control" value="${m.date || ''}"></div>
                <div class="form-group"><label class="form-label">Liga / Campeonato</label><input type="text" id="form-league" class="form-control" value="${m.league || ''}"></div>
                <div class="form-group"><label class="form-label">Medalla</label>
                    <select id="form-medal" class="form-control">
                        <option value="Oro" ${m.medal === 'Oro' ? 'selected' : ''}>Oro</option>
                        <option value="Plata" ${m.medal === 'Plata' ? 'selected' : ''}>Plata</option>
                        <option value="Bronce" ${m.medal === 'Bronce' ? 'selected' : ''}>Bronce</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn" onclick="app.modals.hide()">Cancelar</button>
                    <button class="btn btn-primary" onclick="app.actions.saveMedal()">Guardar</button>
                </div>
            `);
        },
        showPersonalCompetitionForm(id = null) {
            app.editingId = id;
            let c = id ? db.personalCompetitions.find(x => x.id === id) : {};
            this.show(`
                <div class="modal-title">${id ? 'Editar' : 'Resultado'} Competencia</div>
                <div class="form-group"><label class="form-label">Fecha</label><input type="date" id="form-date" class="form-control" value="${c.date || ''}"></div>
                <div class="form-group"><label class="form-label">Liga</label><input type="text" id="form-league" class="form-control" value="${c.league || ''}"></div>
                <div class="form-group"><label class="form-label">Carrera (metros)</label><input type="number" id="form-dist" class="form-control" value="${c.distance || ''}"></div>
                <div class="form-group"><label class="form-label">Mejor Tiempo Serie (s)</label><input type="number" step="0.01" id="form-bseries" class="form-control" value="${c.bestSeriesTime || ''}"></div>
                <div class="form-group"><label class="form-label">Tiempo Personal (s)</label><input type="number" step="0.01" id="form-personal" class="form-control" value="${c.personalTime || ''}"></div>
                <div class="form-group"><label class="form-label">Lugar Obtenido</label><input type="number" id="form-pos" class="form-control" value="${c.position || ''}"></div>
                <div class="modal-actions">
                    <button class="btn" onclick="app.modals.hide()">Cancelar</button>
                    <button class="btn btn-primary" onclick="app.actions.savePersonalCompetition()">Guardar</button>
                </div>
            `);
        },
        showGlobalCompetitionForm(id = null) {
            app.editingId = id;
            let c = id ? db.globalCompetitions.find(x => x.id === id) : {};
            this.show(`
                <div class="modal-title">${id ? 'Editar' : 'Programar'} Competencia</div>
                <div class="form-group"><label class="form-label">Fecha</label><input type="date" id="form-date" class="form-control" value="${c.date || ''}"></div>
                <div class="form-group"><label class="form-label">Liga</label><input type="text" id="form-league" class="form-control" value="${c.league || ''}"></div>
                <div class="form-group"><label class="form-label">Lugar</label><input type="text" id="form-loc" class="form-control" value="${c.location || ''}"></div>
                <div class="form-group"><label class="form-label">Número de Fecha (Ej: 1ra Fecha)</label><input type="text" id="form-num" class="form-control" value="${c.dateNumber || ''}"></div>
                <div class="modal-actions">
                    <button class="btn" onclick="app.modals.hide()">Cancelar</button>
                    <button class="btn btn-primary" onclick="app.actions.saveGlobalCompetition()">Guardar</button>
                </div>
            `);
        }
    },
    
    actions: {
        login() {
            const pwd = document.getElementById('form-pwd').value;
            if(pwd === 'admin123') {
                app.isAdmin = true;
                app.modals.hide();
                app.updateHeader();
                app.navigateTo(app.currentView, app.activeContextId);
                alert("Modo administrador activado.");
            } else {
                alert("Clave incorrecta");
            }
        },
        deleteRecord(tableName, id) {
            if(!confirm("¿Estás seguro de que deseas eliminar este registro de forma permanente?")) return;
            
            db[tableName] = db[tableName].filter(item => item.id !== id);
            
            // Cascade delete if athlete is deleted
            if(tableName === 'athletes') {
                ['speed', 'force', 'medals', 'personalCompetitions', 'attendance'].forEach(t => {
                    db[t] = db[t].filter(item => item.athleteId !== id);
                });
            }
            
            saveDb();
            // Go back to athletes if deleting from profile
            if(tableName === 'athletes' && app.currentView === 'athlete-profile') {
                app.navigateTo('athletes');
            } else {
                app.renderView(app.currentView, app.activeContextId);
            }
        },
        updateOrPush(tableName, newObj) {
            if(app.editingId) {
                const idx = db[tableName].findIndex(x => x.id === app.editingId);
                if(idx !== -1) db[tableName][idx] = { ...db[tableName][idx], ...newObj };
            } else {
                newObj.id = Date.now();
                db[tableName].push(newObj);
            }
            saveDb();
            app.modals.hide();
            app.renderView(app.currentView, app.activeContextId);
        },
        saveAthlete() {
            if(!document.getElementById('form-fn').value || !document.getElementById('form-bd').value) return alert('Completa los campos requeridos');
            this.updateOrPush('athletes', {
                photo: document.getElementById('form-photo').value || 'https://i.pravatar.cc/150?u=' + Date.now(),
                firstName: document.getElementById('form-fn').value,
                lastName: document.getElementById('form-ln').value,
                compNumber: document.getElementById('form-num').value,
                sex: document.getElementById('form-sex').value,
                birthDate: document.getElementById('form-bd').value,
                joinDate: document.getElementById('form-join').value,
                category: document.getElementById('form-cat').value,
                club: document.getElementById('form-club').value,
                active: true
            });
        },
        saveSpeed() {
            if(!document.getElementById('form-time').value || !document.getElementById('form-date').value) return alert('Campos obligatorios faltantes');
            this.updateOrPush('speed', {
                athleteId: app.activeContextId,
                date: document.getElementById('form-date').value,
                distance: parseFloat(document.getElementById('form-dist').value) || 0,
                time: parseFloat(document.getElementById('form-time').value)
            });
        },
        saveForce() {
            if(!document.getElementById('form-height').value || !document.getElementById('form-date').value) return alert('Campos obligatorios faltantes');
            this.updateOrPush('force', {
                athleteId: app.activeContextId,
                date: document.getElementById('form-date').value,
                height: parseFloat(document.getElementById('form-height').value),
                flightTime: parseFloat(document.getElementById('form-flight').value) || 0,
                forceN: parseFloat(document.getElementById('form-force').value) || 0,
                velocity: parseFloat(document.getElementById('form-vel').value) || 0,
                power: parseFloat(document.getElementById('form-power').value) || 0
            });
        },
        saveMedal() {
            if(!document.getElementById('form-date').value || !document.getElementById('form-league').value) return alert('Faltan datos');
            this.updateOrPush('medals', {
                athleteId: app.activeContextId,
                date: document.getElementById('form-date').value,
                league: document.getElementById('form-league').value,
                medal: document.getElementById('form-medal').value
            });
        },
        savePersonalCompetition() {
            if(!document.getElementById('form-date').value) return alert('Falta fecha');
            this.updateOrPush('personalCompetitions', {
                athleteId: app.activeContextId,
                date: document.getElementById('form-date').value,
                league: document.getElementById('form-league').value,
                distance: parseFloat(document.getElementById('form-dist').value) || 0,
                bestSeriesTime: parseFloat(document.getElementById('form-bseries').value) || 0,
                personalTime: parseFloat(document.getElementById('form-personal').value) || 0,
                position: parseInt(document.getElementById('form-pos').value) || 0
            });
        },
        saveGlobalCompetition() {
            if(!document.getElementById('form-date').value) return alert('Falta fecha');
            this.updateOrPush('globalCompetitions', {
                date: document.getElementById('form-date').value,
                league: document.getElementById('form-league').value,
                location: document.getElementById('form-loc').value,
                dateNumber: document.getElementById('form-num').value
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => app.init());
async function cargarDeportistas() {

  const querySnapshot = await getDocs(
    collection(db, "deportistas")
  );

  querySnapshot.forEach((doc) => {

    console.log(doc.data());

  });

}

cargarDeportistas();
window.app = app;
