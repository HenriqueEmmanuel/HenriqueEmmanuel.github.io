(function () {
    'use strict';

    const STORAGE_KEY = 'climaAtivo';

    let pontos = 0;
    let badges = [];
    let co2Data = { carro: 0, energia: 0, lixo: 0, total: 0 };
    let co2Chart = null;
    let dashboardChart = null;
    let map = null;
    let mapMarkers = [];

    let completedChallenges = [];
    let localActionsCount = 0;
    let hasCalculated = false;

    function persist() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({
                    pontos: pontos,
                    badges: badges,
                    co2Data: co2Data,
                    completedChallenges: completedChallenges,
                    localActionsCount: localActionsCount,
                    hasCalculated: hasCalculated,
                    form: {
                        kmCarro: document.getElementById('kmCarro').value,
                        kwhEnergia: document.getElementById('kwhEnergia').value,
                        kgLixo: document.getElementById('kgLixo').value
                    }
                })
            );
        } catch (e) {
            console.warn('ClimaAtivo: não foi possível salvar', e);
        }
    }

    function initNav() {
        document.querySelectorAll('.nav-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                switchSection(btn.dataset.section);
            });
        });
    }

    function resizeChartsForSection(sectionId) {
        function run() {
            if (sectionId === 'calc' && co2Chart) {
                co2Chart.resize();
            }
            if (sectionId === 'dashboard' && dashboardChart) {
                dashboardChart.resize();
            }
        }
        requestAnimationFrame(run);
        setTimeout(run, 100);
        setTimeout(run, 350);
    }

    function switchSection(sectionId) {
        document.querySelectorAll('.section').forEach(function (s) {
            s.classList.remove('active');
        });
        document.querySelectorAll('.nav-btn').forEach(function (b) {
            b.classList.remove('active');
        });

        var section = document.getElementById(sectionId);
        var navBtn = document.querySelector('[data-section="' + sectionId + '"]');
        if (section) section.classList.add('active');
        if (navBtn) navBtn.classList.add('active');

        resizeChartsForSection(sectionId);

        if (sectionId === 'map' && map) {
            setTimeout(function () {
                map.invalidateSize();
            }, 100);
            setTimeout(function () {
                map.invalidateSize();
            }, 400);
        }
    }

    function restoreForm(form) {
        if (!form) return;
        var km = document.getElementById('kmCarro');
        var kwh = document.getElementById('kwhEnergia');
        var lixo = document.getElementById('kgLixo');
        if (form.kmCarro != null) km.value = form.kmCarro;
        if (form.kwhEnergia != null) kwh.value = form.kwhEnergia;
        if (form.kgLixo != null) lixo.value = form.kgLixo;
    }

    function markChallengeCardDone(card) {
        if (card.classList.contains('completed')) return;
        card.classList.add('completed');
        var done = document.createElement('div');
        done.className = 'challenge-done-msg';
        done.style.color = '#1e8449';
        done.style.marginTop = '10px';
        done.style.fontWeight = '600';
        done.textContent = '✅ Concluído!';
        card.appendChild(done);
    }

    function applyCompletedChallengesFromStorage() {
        completedChallenges.forEach(function (id) {
            var card = document.querySelector(
                '#desafiosList .challenge-card[data-challenge-id="' + id + '"]'
            );
            if (card) {
                markChallengeCardDone(card);
            }
        });
    }

    function calcularPegada() {
        var kmCarro = parseFloat(document.getElementById('kmCarro').value) || 0;
        var kwhEnergia = parseFloat(document.getElementById('kwhEnergia').value) || 0;
        var kgLixo = parseFloat(document.getElementById('kgLixo').value) || 0;

        co2Data.carro = kmCarro * 0.19;
        co2Data.energia = kwhEnergia * 0.42;
        co2Data.lixo = kgLixo * 0.7;
        co2Data.total = co2Data.carro + co2Data.energia + co2Data.lixo;

        hasCalculated = true;

        updateCo2Score();
        updateCo2Chart();
        updateDashboardMetrics();
        persist();
    }

    function updateCo2Score() {
        document.getElementById('co2Score').textContent =
            co2Data.total.toFixed(1) + ' kg CO₂';
    }

    function initChart() {
        var ctx = document.getElementById('co2Chart').getContext('2d');
        co2Chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Carro', 'Energia', 'Lixo'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: ['#e74c3c', '#f39c12', '#27ae60']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    function initDashboardChart() {
        var ctx = document.getElementById('dashboardChart').getContext('2d');
        dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'kg CO₂ (estimativa)',
                    data: [12, 10, 11, 9, 8, 7, 6],
                    backgroundColor: 'rgba(39, 174, 96, 0.6)',
                    borderColor: '#27ae60',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    function updateCo2Chart() {
        if (!co2Chart) return;
        co2Chart.data.datasets[0].data = [
            co2Data.carro,
            co2Data.energia,
            co2Data.lixo
        ];
        co2Chart.update();
    }

    function completarDesafio(element, pts, challengeId) {
        if (element.classList.contains('completed')) return;

        if (challengeId && completedChallenges.indexOf(challengeId) !== -1) {
            return;
        }

        markChallengeCardDone(element);

        if (challengeId) {
            completedChallenges.push(challengeId);
        }

        pontos += pts;
        updatePontos();
        updateDashboardMetrics();

        if (pontos >= 200 && badges.indexOf('eco-warrior') === -1) {
            badges.push('eco-warrior');
            showBadge('Eco Warrior');
        }

        persist();
    }

    function updatePontos() {
        document.getElementById('pontos').textContent = pontos;
        document.getElementById('badges').textContent = String(badges.length);
    }

    function updateDashboardMetrics() {
        var pegadaEl = document.getElementById('statPegada');
        var desafiosEl = document.getElementById('statDesafios');
        if (pegadaEl) {
            if (hasCalculated || co2Data.total > 0) {
                pegadaEl.textContent = co2Data.total.toFixed(1) + ' kg';
            } else {
                pegadaEl.textContent = '—';
            }
        }
        if (desafiosEl) {
            desafiosEl.textContent = String(completedChallenges.length);
        }
    }

    function showBadge(nome) {
        var container = document.getElementById('badgeContainer');
        container.textContent = '🏆 Novo Badge: ' + nome + '!';
        container.hidden = false;
        setTimeout(function () {
            container.hidden = true;
        }, 3000);
    }

    function findMarkerNear(lat, lng) {
        var best = null;
        var bestD = Infinity;
        mapMarkers.forEach(function (item) {
            var d =
                Math.abs(item.coords[0] - lat) + Math.abs(item.coords[1] - lng);
            if (d < bestD) {
                bestD = d;
                best = item.marker;
            }
        });
        return bestD < 0.05 ? best : null;
    }

    function focusMapLocation(lat, lng, zoom) {
        if (!map) return;
        switchSection('map');
        setTimeout(function () {
            map.invalidateSize();
            map.setView([lat, lng], zoom || 15);
            var m = findMarkerNear(lat, lng);
            if (m) {
                m.openPopup();
            }
        }, 150);
    }

    function bindMapActionCards() {
        document.querySelectorAll('.action-card--map').forEach(function (el) {
            function go() {
                var lat = parseFloat(el.dataset.lat);
                var lng = parseFloat(el.dataset.lng);
                var z = parseInt(el.dataset.zoom, 10) || 15;
                if (!isNaN(lat) && !isNaN(lng)) {
                    focusMapLocation(lat, lng, z);
                }
            }
            el.addEventListener('click', go);
            el.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    go();
                }
            });
        });
    }

    function initMap() {
        var salvador = [-12.9718, -38.5108];
        map = L.map('mapa').setView(salvador, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        var pontosMapa = [
            { coords: [-12.9718, -38.5108], popup: 'Ponto central de coleta' },
            { coords: [-12.9880, -38.4640], popup: 'Pontos de coleta — Pituba' },
            { coords: [-12.9990, -38.4880], popup: 'Mutirão de plantio — Rio Vermelho' }
        ];

        mapMarkers = [];
        pontosMapa.forEach(function (p) {
            var marker = L.marker(p.coords).addTo(map).bindPopup(p.popup);
            mapMarkers.push({ coords: p.coords, marker: marker });
        });
    }

    function registrarAcao() {
        if (confirm('Registrar nova ação local em Salvador?')) {
            localActionsCount += 1;
            pontos += 75;
            updatePontos();
            updateDashboardMetrics();
            alert('Ação registrada! +75 pontos');
            persist();
        }
    }

    function copyTextToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            var ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                if (document.execCommand('copy')) {
                    resolve();
                } else {
                    reject(new Error('execCommand falhou'));
                }
            } catch (err) {
                reject(err);
            } finally {
                document.body.removeChild(ta);
            }
        });
    }

    function shareProgress() {
        var texto =
            'Meu progresso ClimaAtivo: ' +
            pontos +
            ' pontos e ' +
            co2Data.total.toFixed(1) +
            ' kg CO₂ calculados! 🌱 #ClimaAtivo #ODS13';
        copyTextToClipboard(texto).then(function () {
            alert('Progresso copiado para a área de transferência!');
        }).catch(function () {
            window.prompt('Copie o texto aberto (Ctrl+C) e feche a janela:', texto);
        });
    }

    function loadFromStorage() {
        var saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            updatePontos();
            updateCo2Score();
            updateDashboardMetrics();
            return;
        }
        try {
            var data = JSON.parse(saved);
            pontos = data.pontos || 0;
            badges = Array.isArray(data.badges) ? data.badges : [];
            completedChallenges = Array.isArray(data.completedChallenges)
                ? data.completedChallenges.slice()
                : [];
            localActionsCount =
                typeof data.localActionsCount === 'number'
                    ? data.localActionsCount
                    : 0;
            hasCalculated = Boolean(data.hasCalculated);

            if (data.co2Data && typeof data.co2Data === 'object') {
                co2Data = {
                    carro: Number(data.co2Data.carro) || 0,
                    energia: Number(data.co2Data.energia) || 0,
                    lixo: Number(data.co2Data.lixo) || 0,
                    total: Number(data.co2Data.total) || 0
                };
            }

            restoreForm(data.form);

            if (!hasCalculated && co2Data.total > 0) {
                hasCalculated = true;
            }

            applyCompletedChallengesFromStorage();

            updatePontos();
            updateCo2Score();
            updateCo2Chart();
            updateDashboardMetrics();
        } catch (e) {
            console.warn('ClimaAtivo: dados salvos inválidos', e);
            updatePontos();
            updateCo2Score();
            updateDashboardMetrics();
        }
    }

    function bindChallengeCards() {
        document.querySelectorAll('#desafiosList .challenge-card').forEach(function (card) {
            var pts = parseInt(card.dataset.pts, 10) || 0;
            var cid = card.dataset.challengeId || '';
            card.addEventListener('click', function () {
                completarDesafio(card, pts, cid);
            });
            card.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    completarDesafio(card, pts, cid);
                }
            });
        });
    }

    function bindFormPersist() {
        ['kmCarro', 'kwhEnergia', 'kgLixo'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', persist);
                el.addEventListener('blur', persist);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initNav();
        initChart();
        initDashboardChart();
        initMap();
        bindChallengeCards();
        bindMapActionCards();
        bindFormPersist();

        loadFromStorage();

        document.getElementById('btnCalcular').addEventListener('click', calcularPegada);
        var btnReg = document.getElementById('btnRegistrarAcao');
        btnReg.addEventListener('click', registrarAcao);
        btnReg.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                registrarAcao();
            }
        });
        document.getElementById('btnShare').addEventListener('click', shareProgress);

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'hidden') {
                persist();
            }
        });

        resizeChartsForSection('calc');
    });

    window.addEventListener('beforeunload', persist);
})();
