const zonasLuanda = [
    { nome: "📍 Largo do Kinaxixi", lat: -8.8225, lng: 13.2381 },
    { nome: "📍 Mutamba (Baixa de Luanda)", lat: -8.8150, lng: 13.2302 },
    { nome: "📍 Alvalade", lat: -8.8350, lng: 13.2450 },
    { nome: "📍 Talatona (Belas Shopping)", lat: -8.9139, lng: 13.1844 },
    { nome: "📍 Aeroporto Internacional 4 de Fevereiro", lat: -8.8583, lng: 13.2306 },
    { nome: "📍 Ilha do Cabo (Ilha de Luanda)", lat: -8.7912, lng: 13.2325 },
    { nome: "📍 Maianga", lat: -8.8450, lng: 13.2420 },
    { nome: "📍 Cazenga (Hoji-ya-Henda)", lat: -8.8111, lng: 13.2725 },
    { nome: "📍 Viana (Estação)", lat: -8.9056, lng: 13.3736 },
    { nome: "📍 Kilamba (Centralidade)", lat: -8.9722, lng: 13.2639 },
    { nome: "📍 Morro Bento", lat: -8.8742, lng: 13.1956 },
    { nome: "📍 Benfica", lat: -8.9500, lng: 13.1500 },
    { nome: "📍 Patriota", lat: -8.8911, lng: 13.2083 }
];

let map = null;
let trackingMap = null;
let driverMarker = null;
let userMarker = null;
let trackingInterval = null;

let currentSelection = { 
    precoBaseMoto: 1500,
    precoBaseCarro: 3500,
    gorjeta: 0,
    descontoCupao: 0,
    precoTotal: 1500,
    tipo: 'AquiDei Moto', 
    pagamento: 'Dinheiro',
    origem: null,
    destino: null,
    silenciosa: false
};

let saldoCarteira = 12500;
let transacoesCarteira = [
    { tipo: 'entrada', titulo: 'Carregamento Multicaixa', desc: 'Referência 9821', valor: '+ 10.000 Kz', data: '07 Out' },
    { tipo: 'saida', titulo: 'Pagamento de Viagem', desc: 'Talatona ➔ Kinaxixi', valor: '- 3.500 Kz', data: '06 Out' }
];

document.addEventListener("DOMContentLoaded", () => {
    popularSelects();
    inicializarMapa();
    
    setTimeout(() => {
        verificarSessaoAtiva();
    }, 2000);
});

function popularSelects() {
    const originSelect = document.getElementById('origin-select');
    const destSelect = document.getElementById('destination-select');
    
    originSelect.innerHTML = '';
    destSelect.innerHTML = '';

    zonasLuanda.forEach((z, i) => {
        originSelect.innerHTML += `<option value="${i}">${z.nome}</option>`;
        destSelect.innerHTML += `<option value="${i}" ${i === 3 ? 'selected' : ''}>${z.nome}</option>`;
    });
}

function inicializarMapa() {
    map = L.map('map', { zoomControl: false, attributionControl: false }).setView([-8.8225, 13.2381], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
    userMarker = L.marker([-8.8225, 13.2381]).addTo(map);
}

function usarGeolocalizacaoAtual() {
    if(!navigator.geolocation) {
        showToast('Geolocalização não é suportada pelo seu dispositivo.');
        return;
    }
    
    showToast('A obter a sua localização GPS...');
    navigator.geolocation.getCurrentPosition(position => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        currentSelection.origem = { nome: "📍 Minha Localização GPS", lat: lat, lng: lng };
        map.setView([lat, lng], 15);
        
        if(userMarker) map.removeLayer(userMarker);
        userMarker = L.marker([lat, lng]).addTo(map);
        
        showToast('Localização GPS detetada com sucesso!');
    }, () => {
        showToast('Não foi possível obter a sua localização.');
    }, { enableHighAccuracy: true });
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
}

function adicionarNotificacao(titulo, mensagem) {
    let notifs = JSON.parse(localStorage.getItem('aquidei_notifs')) || [];
    notifs.unshift({ titulo, mensagem, data: new Date().toLocaleTimeString('pt-AO', {hour: '2-digit', minute:'2-digit'}) });
    localStorage.setItem('aquidei_notifs', JSON.stringify(notifs));
}

function abrirNotificacoes() {
    let notifs = JSON.parse(localStorage.getItem('aquidei_notifs')) || [
        { titulo: "Bem-vindo ao AquiDei!", mensagem: "Use o código AQUIDEDE2026 para descontar na sua primeira viagem." }
    ];
    
    const lista = document.getElementById('notifications-list');
    lista.innerHTML = notifs.map(n => `
        <div class="history-row">
            <div>
                <strong>${n.titulo}</strong>
                <span>${n.mensagem}</span>
            </div>
        </div>
    `).join('');
    
    mudarEcrã('screen-notifications');
}

function mudarEcrã(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    
    if(id === 'screen-home' && map) setTimeout(() => map.invalidateSize(), 200);
    if(id === 'screen-tracking') {
        setTimeout(() => {
            if(!trackingMap) {
                trackingMap = L.map('map-tracking', { zoomControl: false, attributionControl: false }).setView([currentSelection.origem.lat, currentSelection.origem.lng], 14);
                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(trackingMap);
            } else {
                trackingMap.invalidateSize();
                trackingMap.setView([currentSelection.origem.lat, currentSelection.origem.lng], 14);
            }
            iniciarSimulacaoTrackingGPSCompleto();
        }, 200);
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    if(tab === 'login') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('form-login').classList.add('active');
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('form-register').classList.add('active');
    }
}

function abrirRecuperarPassword() {
    mudarEcrã('screen-forgot');
}

function enviarRecuperacao() {
    const fPhone = document.getElementById('forgot-phone').value.trim();
    if(fPhone.length < 9) {
        showToast('Insira um número válido para recuperação.');
        return;
    }
    showToast('Instruções de recuperação enviadas via SMS.');
    setTimeout(() => mudarEcrã('screen-auth'), 1500);
}

function fazerRegisto() {
    const nome = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();

    if(!nome || !email || phone.length < 9 || pass.length < 6) {
        showToast('Por favor, preencha todos os campos corretamente.');
        return;
    }

    const userData = { nome, email, phone };
    localStorage.setItem('aquidei_user', JSON.stringify(userData));
    adicionarNotificacao("Conta Criada", "Parabéns, a sua conta AquiDei foi criada com sucesso!");
    showToast('Conta criada com sucesso!');
    entrarNaApp(userData);
}

function fazerLogin() {
    const userVal = document.getElementById('login-user').value.trim();
    const passVal = document.getElementById('login-pass').value.trim();

    if(!userVal || !passVal) {
        showToast('Preencha os dados de login.');
        return;
    }

    let savedUser = JSON.parse(localStorage.getItem('aquidei_user'));
    if(!savedUser) {
        savedUser = { nome: "António Manuel", phone: userVal };
        localStorage.setItem('aquidei_user', JSON.stringify(savedUser));
    }

    showToast('Sessão iniciada com sucesso!');
    entrarNaApp(savedUser);
}

function entrarNaApp(user) {
    document.getElementById('user-display-name').textContent = user.nome.split(' ')[0];
    document.getElementById('prof-name').textContent = user.nome;
    document.getElementById('prof-phone').textContent = "+244 " + (user.phone || "923000000");
    mudarEcrã('screen-home');
}

function verificarSessaoAtiva() {
    let savedUser = JSON.parse(localStorage.getItem('aquidei_user'));
    if(savedUser) {
        entrarNaApp(savedUser);
    } else {
        mudarEcrã('screen-auth');
    }
}

function fazerLogout() {
    localStorage.removeItem('aquidei_user');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    switchAuthTab('login');
    mudarEcrã('screen-auth');
    showToast('Sessão encerrada.');
}

function calcularViagem() {
    const origSelectVal = document.getElementById('origin-select').value;
    if(!currentSelection.origem || currentSelection.origem.nome.includes("GPS")) {
        if(!currentSelection.origem) {
            currentSelection.origem = zonasLuanda[origSelectVal];
        }
    } else {
        currentSelection.origem = zonasLuanda[origSelectVal];
    }
    
    const dest = zonasLuanda[document.getElementById('destination-select').value];

    if(currentSelection.origem.nome === dest.nome) {
        showToast('A origem e o destino devem ser diferentes.');
        return;
    }

    currentSelection.destino = dest;

    document.getElementById('route-info').textContent = `${currentSelection.origem.nome.replace('📍 ','')} ➔ ${dest.nome.replace('📍 ','')}`;
    atualizarPrecoTotal();
    mudarEcrã('screen-quote');
}

function voltarHome() {
    if(trackingInterval) clearInterval(trackingInterval);
    mudarEcrã('screen-home');
}

function selecionarOpcao(el, preco, tipo) {
    document.querySelectorAll('.service-card').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    currentSelection.tipo = tipo;
    atualizarPrecoTotal();
}

function selecionarGorjeta(el, valor) {
    document.querySelectorAll('.tip-pill').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('custom-tip-input').value = '';
    currentSelection.gorjeta = valor;
    atualizarPrecoTotal();
}

function selecionarGorjetaCustom(input) {
    document.querySelectorAll('.tip-pill').forEach(b => b.classList.remove('active'));
    let val = parseFloat(input.value) || 0;
    currentSelection.gorjeta = val;
    atualizarPrecoTotal();
}

function aplicarCupao() {
    const code = document.getElementById('promo-input').value.trim().toUpperCase();
    if(code === 'AQUIDEDE2026') {
        currentSelection.descontoCupao = 500;
        showToast('Cupão aplicado com sucesso! Desconto de 500 Kz.');
        atualizarPrecoTotal();
    } else {
        showToast('Código promocional inválido ou expirado.');
    }
}

function atualizarPrecoTotal() {
    let base = currentSelection.tipo.includes('Moto') ? currentSelection.precoBaseMoto : currentSelection.precoBaseCarro;
    let final = base + currentSelection.gorjeta - currentSelection.descontoCupao;
    if(final < 200) final = 200;
    
    currentSelection.precoTotal = final;
    
    document.getElementById('price-moto').textContent = (currentSelection.precoBaseMoto - (currentSelection.tipo.includes('Moto') ? currentSelection.descontoCupao : 0)).toLocaleString() + " Kz";
    document.getElementById('price-car').textContent = (currentSelection.precoBaseCarro - (currentSelection.tipo.includes('Carro') ? currentSelection.descontoCupao : 0)).toLocaleString() + " Kz";
}

function togglePref(el) {
    el.classList.toggle('active');
    currentSelection.silenciosa = el.classList.contains('active');
}

function selecionarPagamento(el, metodo) {
    document.querySelectorAll('.pay-pill').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    currentSelection.pagamento = metodo;
}

function pedirViagem() {
    if(currentSelection.pagamento === 'Carteira') {
        if(saldoCarteira < currentSelection.precoTotal) {
            showToast('Saldo insuficiente na carteira AquiDei Pay.');
            return;
        }
        saldoCarteira -= currentSelection.precoTotal;
        
        // Registar saída na carteira
        transacoesCarteira.unshift({
            tipo: 'saida',
            titulo: 'Pagamento de Viagem',
            desc: `${currentSelection.origem.nome.replace('📍 ','')} ➔ ${currentSelection.destino.nome.replace('📍 ','')}`,
            valor: `- ${currentSelection.precoTotal.toLocaleString()} Kz`,
            data: 'Hoje'
        });

        document.getElementById('wallet-balance-val').textContent = saldoCarteira.toLocaleString() + " Kz";
        showToast('Pagamento efetuado via AquiDei Pay!');
        avancarTracking();
    } else if(currentSelection.pagamento === 'MCX Express') {
        showToast('A contactar Multicaixa Express...');
        setTimeout(() => {
            showToast('Pagamento aprovado!');
            avancarTracking();
        }, 1200);
    } else {
        avancarTracking();
    }
}

function avancarTracking() {
    guardarHistorico();
    mudarEcrã('screen-tracking');
}

function iniciarSimulacaoTrackingGPSCompleto() {
    if(driverMarker) trackingMap.removeLayer(driverMarker);

    let driverLat = currentSelection.origem.lat + 0.006;
    let driverLng = currentSelection.origem.lng + 0.006;

    driverMarker = L.marker([driverLat, driverLng]).addTo(trackingMap);

    document.getElementById('tracking-status').textContent = "A procurar condutor próximo...";
    document.getElementById('tracking-sub').textContent = "O motorista está a aproximar-se da origem";

    setTimeout(() => {
        document.getElementById('tracking-status').textContent = "Fase 1: Condutor a caminho do cliente";
        document.getElementById('tracking-sub').textContent = `Serviço: ${currentSelection.tipo}`;
        adicionarNotificacao("Motorista a caminho", "Hélder Silva aceitou a corrida e está a seguir o GPS até si.");
        showToast('🔔 GPS ativo: Motorista a dirigir-se à sua recolha.');
    }, 2000);

    if(trackingInterval) clearInterval(trackingInterval);
    
    let passosFase1 = 0;
    let passosFase2 = 0;

    trackingInterval = setInterval(() => {
        if(passosFase1 < 8) {
            driverLat -= (driverLat - currentSelection.origem.lat) / 6;
            driverLng -= (driverLng - currentSelection.origem.lng) / 6;
            driverMarker.setLatLng([driverLat, driverLng]);
            trackingMap.panTo([driverLat, driverLng]);
            passosFase1++;

            if(passosFase1 === 8) {
                document.getElementById('tracking-status').textContent = "Fase 2: Cliente a bordo • A caminho do destino";
                document.getElementById('tracking-sub').textContent = `Destino: ${currentSelection.destino.nome.replace('📍 ','')}`;
                showToast('📍 Motorista chegou! GPS direcionado ao destino final.');
            }
        } else {
            driverLat -= (driverLat - currentSelection.destino.lat) / 6;
            driverLng -= (driverLng - currentSelection.destino.lng) / 6;
            driverMarker.setLatLng([driverLat, driverLng]);
            trackingMap.panTo([driverLat, driverLng]);

            passosFase2++;
            if(passosFase2 >= 8) {
                clearInterval(trackingInterval);
                setTimeout(() => {
                    abrirEcraAvaliacao();
                }, 1000);
            }
        }
    }, 1500);
}

function cancelarViagem() {
    if(trackingInterval) clearInterval(trackingInterval);
    showToast('Viagem cancelada.');
    voltarHome();
}

function partilharViagemWhatsApp() {
    const texto = `Estou a viajar de ${currentSelection.origem.nome.replace('📍 ','')} para ${currentSelection.destino.nome.replace('📍 ','')} com o AquiDei. Acompanhe a viagem em segurança!`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
}

function abrirChat() {
    mudarEcrã('screen-chat');
}

function fecharChat() {
    mudarEcrã('screen-tracking');
}

function enviarMensagemChat() {
    const input = document.getElementById('chat-input');
    const txt = input.value.trim();
    if(!txt) return;

    const box = document.getElementById('chat-box');
    box.innerHTML += `<div class="chat-bubble user-msg">${txt}</div>`;
    input.value = '';
    box.scrollTop = box.scrollHeight;

    setTimeout(() => {
        box.innerHTML += `<div class="chat-bubble driver-msg">Entendido! Estou a seguir as indicações do GPS.</div>`;
        box.scrollTop = box.scrollHeight;
    }, 1000);
}

// Funções da Carteira Digital Melhorada
function abrirCarteira() {
    document.getElementById('wallet-balance-val').textContent = saldoCarteira.toLocaleString() + " Kz";
    renderizarHistoricoCarteira('todos');
    mudarEcrã('screen-wallet');
}

function abrirModalCarregar() {
    document.getElementById('load-amount-input').value = '';
    document.getElementById('mcx-ref-box').style.display = 'none';
    mudarEcrã('screen-wallet-load');
}

function gerarReferenciaMCX() {
    const valor = parseFloat(document.getElementById('load-amount-input').value);
    if(!valor || valor <= 0) {
        showToast('Insira um valor válido para carregar.');
        return;
    }
    
    // Gerar referências aleatórias simulando EMIS Angola
    const refAleatoria = Math.floor(100 + Math.random() * 900) + " " + Math.floor(100 + Math.random() * 900) + " " + Math.floor(100 + Math.random() * 900);
    document.getElementById('txt-ref-num').textContent = refAleatoria;
    document.getElementById('txt-ref-val').textContent = valor.toLocaleString() + " Kz";
    document.getElementById('mcx-ref-box').style.display = 'block';
    showToast('Referência gerada com sucesso!');
}

function simularPagamentoReferenciaConcluido() {
    const valorTexto = document.getElementById('txt-ref-val').textContent;
    const valorNum = parseFloat(valorTexto.replace(' Kz', '').replace(/\./g, '')) || 5000;
    
    saldoCarteira += valorNum;
    transacoesCarteira.unshift({
        tipo: 'entrada',
        titulo: 'Carregamento Multicaixa',
        desc: 'Referência ATM / Homebanking',
        valor: `+ ${valorNum.toLocaleString()} Kz`,
        data: 'Hoje'
    });

    showToast('Pagamento confirmado! Saldo atualizado.');
    abrirCarteira();
}

function abrirModalTransferir() {
    document.getElementById('transfer-phone').value = '';
    document.getElementById('transfer-amount').value = '';
    document.getElementById('transfer-pin').value = '';
    mudarEcrã('screen-wallet-transfer');
}

function executarTransferenciaP2P() {
    const tel = document.getElementById('transfer-phone').value.trim();
    const valor = parseFloat(document.getElementById('transfer-amount').value);
    const pin = document.getElementById('transfer-pin').value.trim();

    if(tel.length < 9 || !valor || valor <= 0) {
        showToast('Verifique o número de telemóvel e o valor.');
        return;
    }

    if(pin.length !== 4) {
        showToast('Introduza o PIN de segurança de 4 dígitos.');
        return;
    }

    if(saldoCarteira < valor) {
        showToast('Saldo insuficiente para esta transferência.');
        return;
    }

    saldoCarteira -= valor;
    transacoesCarteira.unshift({
        tipo: 'saida',
        titulo: `Transferência para +244 ${tel}`,
        desc: 'Envio P2P AquiDei Pay',
        valor: `- ${valor.toLocaleString()} Kz`,
        data: 'Hoje'
    });

    showToast('Transferência efetuada com sucesso!');
    abrirCarteira();
}

function filtrarCarteira(filtro, el) {
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderizarHistoricoCarteira(filtro);
}

function renderizarHistoricoCarteira(filtro) {
    const lista = document.getElementById('wallet-history');
    let filtradas = transacoesCarteira;

    if(filtro === 'entrada') {
        filtradas = transacoesCarteira.filter(t => t.tipo === 'entrada');
    } else if(filtro === 'saida') {
        filtradas = transacoesCarteira.filter(t => t.tipo === 'saida');
    }

    if(filtradas.length === 0) {
        lista.innerHTML = `<p class="sub-info" style="text-align:center; margin-top:20px;">Sem transações nesta categoria.</p>`;
        return;
    }

    lista.innerHTML = filtradas.map(t => `
        <div class="history-row">
            <div>
                <strong>${t.titulo}</strong>
                <span>${t.data} • ${t.desc}</span>
            </div>
            <div class="history-val" style="color:${t.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)'};">${t.valor}</div>
        </div>
    `).join('');
}

function alternarEstadoMotorista() {
    const t = document.getElementById('driver-status-text');
    if(t.textContent.includes('Online')) {
        t.textContent = "Offline (Indisponível)";
        t.style.color = "var(--danger)";
        showToast('Ficou offline.');
    } else {
        t.textContent = "Online (À procura)";
        t.style.color = "var(--success)";
        showToast('Ficou online e pronto para corridas.');
    }
}

function aceitarCorridaMotorista() {
    showToast('Corrida aceite com sucesso! A navegar para o local...');
    setTimeout(() => {
        voltarHome();
    }, 1500);
}

function abrirEcraAvaliacao() {
    document.getElementById('final-route-text').textContent = `${currentSelection.origem.nome.replace('📍 ','')} ➔ ${currentSelection.destino.nome.replace('📍 ','')}`;
    document.getElementById('final-fare-val').textContent = currentSelection.precoTotal.toLocaleString() + " Kz";
    adicionarNotificacao("Viagem Concluída", `Chegou ao seu destino com sucesso. Total: ${currentSelection.precoTotal.toLocaleString()} Kz.`);
    mudarEcrã('screen-rating');
}

function setStar(n) {
    document.querySelectorAll('.star-rating-row i').forEach((s, i) => {
        if(i < n) s.classList.add('active');
        else s.classList.remove('active');
    });
}

function concluirAvaliacao() {
    showToast('Obrigado pela sua avaliação!');
    voltarHome();
}

function guardarHistorico() {
    let historico = JSON.parse(localStorage.getItem('aquidei_historico')) || [];
    const novaViagem = {
        origem: currentSelection.origem.nome.replace('📍 ',''),
        destino: currentSelection.destino.nome.replace('📍 ',''),
        tipo: currentSelection.tipo,
        preco: currentSelection.precoTotal.toLocaleString() + " Kz",
        data: new Date().toLocaleDateString('pt-AO')
    };
    historico.unshift(novaViagem);
    if(historico.length > 20) historico.pop();
    localStorage.setItem('aquidei_historico', JSON.stringify(historico));
}

function abrirHistoricoViagens() {
    const lista = document.getElementById('history-list');
    let historico = JSON.parse(localStorage.getItem('aquidei_historico')) || [];

    if(historico.length === 0) {
        lista.innerHTML = `<p class="sub-info" style="text-align:center; margin-top:40px;">Ainda não tens viagens recentes.</p>`;
    } else {
        lista.innerHTML = historico.map(v => `
            <div class="history-row">
                <div>
                    <strong>${v.origem} ➔ ${v.destino}</strong>
                    <span>${v.tipo} • ${v.data}</span>
                </div>
                <div class="history-val">${v.preco}</div>
            </div>
        `).join('');
    }
    mudarEcrã('screen-history');
}

function abrirPerfil() {
    mudarEcrã('screen-profile');
}