/**
 * Campo Magnético — Lei de Biot-Savart
 * Script Principal: Lógica de Formulário, API e Animações
 */

// ============================================
// CONFIGURAÇÃO
// ============================================

// URL da API (ajuste para produção)
const API_URL = 'http://127.0.0.1:5000';

// Modo DEMO (ativa dados simulados se API não responder)
let DEMO_MODE = false;

// Constante: Permeabilidade magnética do vácuo
const MU_0 = 4 * Math.PI * 1e-7;

// ============================================
// ELEMENTOS DO DOM
// ============================================

const calcForm = document.getElementById('calcForm');
const corrente = document.getElementById('corrente');
const distancias = document.getElementById('distancias');
const errorMessage = document.getElementById('errorMessage');
const resultsContainer = document.getElementById('resultsContainer');
const resultsTable = document.getElementById('resultsTable');
const magneticCanvas = document.getElementById('magneticCanvas');
const ctx = magneticCanvas.getContext('2d');

// Novos elementos de Canvas
const dotsAndCrossesCanvas = document.getElementById('dotsAndCrossesCanvas');
const dotsAndCrossesCtx = dotsAndCrossesCanvas ? dotsAndCrossesCanvas.getContext('2d') : null;
const vectorDiagramCanvas = document.getElementById('vectorDiagramCanvas');
const vectorDiagramCtx = vectorDiagramCanvas ? vectorDiagramCanvas.getContext('2d') : null;

// Elementos de Gráfico
let chartBvsD1 = null;
let chartBvsD2 = null;
const chartBvsD1Element = document.getElementById('chartBvsD1');
const chartBvsD2Element = document.getElementById('chartBvsD2');

// Elementos de Abas
const tabsMenu = document.getElementById('tabsMenu');
const tabPanes = document.querySelectorAll('.tab-pane');

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================

let currentResults = [];
let animationFrameId = null;
let particles = [];
let ripples = [];

// Configuração do canvas
const canvasWidth = magneticCanvas.width;
const canvasHeight = magneticCanvas.height;
const centerX = canvasWidth / 2;
const centerY = canvasHeight / 2;

// ============================================
// INICIALIZAÇÃO
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Aplicação iniciada');
    
    // Verificar se API está disponível
    checkAPIAvailability();
    
    // Inicializar abas
    inicializarAbas();
    
    // Event listeners
    calcForm.addEventListener('submit', handleFormSubmit);
    
    // Iniciar animação do canvas
    startCanvasAnimation();
});

// ============================================
// INICIALIZAÇÃO DAS ABAS
// ============================================

function inicializarAbas() {
    console.log('Inicializando abas...');
    
    // Garantir que o primeiro painel esteja ativo
    const primeiraAba = document.querySelector('.tab-button');
    const primeiroPainel = document.querySelector('.tab-pane');
    
    if (primeiraAba && primeiroPainel) {
        // Remover active de todos
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        // Ativar primeiro
        primeiraAba.classList.add('active');
        primeiroPainel.classList.add('active');
    }
    
    // Event listener para as abas
    tabsMenu.addEventListener('click', function(event) {
        const tabButton = event.target.closest('.tab-button');
        
        if (tabButton) {
            const tabId = tabButton.dataset.tab;
            console.log('Clicou na aba:', tabId);
            
            // Remover 'active' de todos os botões e painéis
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
            });
            
            // Adicionar 'active' ao botão e painel clicados
            tabButton.classList.add('active');
            const painelAtivo = document.getElementById(tabId);
            if (painelAtivo) {
                painelAtivo.classList.add('active');
            }
            
            // Reiniciar animações ou gráficos se necessário
            if (tabId === 'vis1') {
                startCanvasAnimation();
            } else {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            }

            // Redesenhar visualizações se houver resultados
            if (currentResults.length > 0) {
                setTimeout(() => {
                    switch(tabId) {
                        case 'vis2':
                            if (chartBvsD1Element) {
                                desenharGraficoBvsD1(currentResults);
                            }
                            break;
                        case 'vis3':
                            desenharPontosECruzes(currentResults);
                            break;
                        case 'vis4':
                            if (chartBvsD2Element) {
                                desenharGraficoBvsD2(currentResults);
                            }
                            break;
                        case 'vis5':
                            desenharDiagramaVetorial(currentResults);
                            break;
                    }
                }, 50);
            }
        }
    });
    
    console.log('Abas inicializadas');
}

// ============================================
// VERIFICAÇÃO DA API
// ============================================

async function checkAPIAvailability() {
    try {
        const response = await fetch(`${API_URL}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ API disponível');
            DEMO_MODE = false;
        } else {
            throw new Error(`API respondeu com status: ${response.status}`);
        }
    } catch (error) {
        console.warn('❌ API não disponível, ativando modo DEMO:', error.message);
        DEMO_MODE = true;
    }
}

// ============================================
// MANIPULAÇÃO DO FORMULÁRIO
// ============================================

function handleFormSubmit(event) {
    event.preventDefault();
    
    // Limpar mensagens de erro
    clearErrorMessage();
    
    // Obter valores do formulário
    const correnteValue = parseFloat(corrente.value);
    const distanciasValue = distancias.value.trim();
    
    // Validar entrada
    const validation = validateInput(correnteValue, distanciasValue);
    if (!validation.valid) {
        showErrorMessage(validation.error);
        return;
    }
    
    // Desabilitar botão
    const submitBtn = calcForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    // Calcular
    calcularEExibirResultados(correnteValue, validation.distancias, submitBtn);
}

async function calcularEExibirResultados(correnteValue, distanciasArray, submitBtn) {
    try {
        console.log('Calculando campo magnético...');
        const resultado = await calcularCampoMagnetico(correnteValue, distanciasArray);
        
        // Processar resultados
        if (resultado.error) {
            showErrorMessage(resultado.error);
        } else {
            currentResults = resultado.resultados;
            console.log('Resultados obtidos:', currentResults);
            exibirResultados(correnteValue, resultado.resultados);
            atualizarVisualizacoes(correnteValue, resultado.resultados);
            criarRipple();
        }
    } catch (error) {
        console.error('Erro no cálculo:', error);
        showErrorMessage('Erro ao calcular: ' + error.message);
    } finally {
        // Reabilitar botão
        submitBtn.disabled = false;
    }
}

// ============================================
// VALIDAÇÃO DE ENTRADA
// ============================================

function validateInput(correnteValue, distanciasValue) {
    // Validar corrente
    if (isNaN(correnteValue) || correnteValue <= 0) {
        return {
            valid: false,
            error: 'Corrente deve ser um número maior que zero'
        };
    }
    
    // Validar distâncias
    if (!distanciasValue) {
        return {
            valid: false,
            error: 'Forneça pelo menos uma distância'
        };
    }
    
    // Converter distâncias
    const distanciasArray = distanciasValue
        .split(',')
        .map(d => parseFloat(d.trim()))
        .filter(d => !isNaN(d));
    
    if (distanciasArray.length === 0) {
        return {
            valid: false,
            error: 'Distâncias inválidas. Use números separados por vírgulas'
        };
    }
    
    // Validar valores de distância
    for (let d of distanciasArray) {
        if (d <= 0) {
            return {
                valid: false,
                error: 'Todas as distâncias devem ser maiores que zero'
            };
        }
    }
    
    return {
        valid: true,
        distancias: distanciasArray
    };
}

// ============================================
// COMUNICAÇÃO COM API
// ============================================

async function calcularCampoMagnetico(corrente, distancias) {
    // Modo DEMO - sempre disponível como fallback
    const resultadosDemo = {
        resultados: distancias.map(d => ({
            d: d,
            B: (MU_0 * corrente) / (2 * Math.PI * d)
        }))
    };

    // Se já sabemos que a API não está disponível, usar modo DEMO
    if (DEMO_MODE) {
        console.log('Usando modo DEMO (API não disponível)');
        return resultadosDemo;
    }
    
    try {
        const response = await fetch(`${API_URL}/calcular`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                I: corrente,
                distancias: distancias
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.erro) {
            throw new Error(data.erro);
        }
        
        return data;
        
    } catch (error) {
        console.warn('Erro na requisição da API, usando modo DEMO:', error.message);
        DEMO_MODE = true;
        return resultadosDemo;
    }
}

// ============================================
// EXIBIÇÃO DE RESULTADOS
// ============================================

function exibirResultados(corrente, resultados) {
    // Limpar tabela
    resultsTable.innerHTML = '';
    
    // Preencher tabela
    resultados.forEach(resultado => {
        const row = document.createElement('tr');
        const distancia = resultado.d.toFixed(4);
        const campo = resultado.B.toExponential(4);
        
        row.innerHTML = `
            <td>${distancia}</td>
            <td>${resultado.B.toFixed(10)}</td>
            <td>${campo}</td>
        `;
        
        resultsTable.appendChild(row);
    });
    
    // Mostrar container de resultados
    resultsContainer.style.display = 'block';
}

// ============================================
// MENSAGENS DE ERRO
// ============================================

function showErrorMessage(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
}

function clearErrorMessage() {
    errorMessage.textContent = '';
    errorMessage.classList.remove('show');
}

// ============================================
// ATUALIZAÇÃO DE VISUALIZAÇÕES
// ============================================

function atualizarVisualizacoes(corrente, resultados) {
    console.log('Atualizando todas as visualizações...');
    
    // 1. Linhas de Campo
    atualizarAnimacaoCanvas(corrente, resultados);

    // 2. Gráfico B vs. d (Linear)
    if (resultados.length > 0 && chartBvsD1Element) {
        desenharGraficoBvsD1(resultados);
    }

    // 3. Pontos e Cruzes
    if (resultados.length > 0 && dotsAndCrossesCtx) {
        desenharPontosECruzes(resultados);
    }

    // 4. Gráfico B vs. d (Logarítmico)
    if (resultados.length > 0 && chartBvsD2Element) {
        desenharGraficoBvsD2(resultados);
    }

    // 5. Diagrama Vetorial
    if (resultados.length > 0 && vectorDiagramCtx) {
        desenharDiagramaVetorial(resultados);
    }
    
    console.log('Visualizações atualizadas');
}

// ============================================
// VISUALIZAÇÃO 1: LINHAS DE CAMPO (ANIMAÇÃO)
// ============================================

class Particle {
    constructor(x, y, speed, angle) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.angle = angle;
        this.radius = Math.hypot(x - centerX, y - centerY);
        this.color = `hsl(${Math.random() * 60 + 180}, 100%, 50%)`;
        this.size = Math.random() * 2 + 1;
    }
    
    update() {
        this.angle += this.speed / this.radius;
        this.x = centerX + Math.cos(this.angle) * this.radius;
        this.y = centerY + Math.sin(this.angle) * this.radius;
    }
    
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Ripple {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 150;
        this.speed = 3;
        this.opacity = 1;
    }
    
    update() {
        this.radius += this.speed;
        this.opacity = 1 - (this.radius / this.maxRadius);
    }
    
    draw(ctx) {
        ctx.strokeStyle = `rgba(0, 229, 255, ${this.opacity})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    isAlive() {
        return this.radius < this.maxRadius;
    }
}

function atualizarAnimacaoCanvas(corrente, resultados) {
    // Limpar partículas antigas
    particles = [];
    
    // Criar novas partículas baseadas nos resultados
    const maxB = Math.max(...resultados.map(r => r.B));
    
    resultados.forEach(resultado => {
        const distancia = resultado.d;
        const campo = resultado.B;
        const intensidade = campo / maxB;
        
        const numParticles = Math.ceil(intensidade * 10);
        const speed = intensidade * 0.1;
        
        const raioPixels = (distancia / Math.max(...resultados.map(r => r.d))) * 150 + 30;
        
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const x = centerX + Math.cos(angle) * raioPixels;
            const y = centerY + Math.sin(angle) * raioPixels;
            
            particles.push(new Particle(x, y, speed, angle));
        }
    });
}

// ============================================
// VISUALIZAÇÃO 2: GRÁFICO B vs. d (LINEAR)
// ============================================

function desenharGraficoBvsD1(resultados) {
    if (!chartBvsD1Element) return;

    const labels = resultados.map(r => r.d.toFixed(4) + ' m');
    const data = resultados.map(r => r.B);

    // Destruir gráfico existente se houver
    if (chartBvsD1) {
        chartBvsD1.destroy();
    }

    chartBvsD1 = new Chart(chartBvsD1Element, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Campo Magnético B (T)',
                data: data,
                borderColor: 'rgba(0, 229, 255, 1)',
                backgroundColor: 'rgba(0, 229, 255, 0.2)',
                borderWidth: 2,
                pointRadius: 5,
                pointBackgroundColor: 'rgba(0, 229, 255, 1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e0e0e0'
                    }
                },
                title: {
                    display: true,
                    text: 'Campo Magnético (B) vs. Distância (d) - Escala Linear',
                    color: '#00e5ff'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Distância d (m)',
                        color: '#b0b0b0'
                    },
                    ticks: {
                        color: '#e0e0e0'
                    },
                    grid: {
                        color: 'rgba(26, 77, 122, 0.5)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Campo Magnético B (T)',
                        color: '#b0b0b0'
                    },
                    ticks: {
                        color: '#e0e0e0',
                        callback: function(value) {
                            if (Math.abs(value) < 1e-6 || Math.abs(value) > 1e6) {
                                return value.toExponential(2);
                            }
                            return value.toFixed(8);
                        }
                    },
                    grid: {
                        color: 'rgba(26, 77, 122, 0.5)'
                    }
                }
            }
        }
    });
}

// ============================================
// VISUALIZAÇÃO 4: GRÁFICO B vs. d (LOGARÍTMICO)
// ============================================

function desenharGraficoBvsD2(resultados) {
    if (!chartBvsD2Element) return;

    const labels = resultados.map(r => r.d.toFixed(4) + ' m');
    const data = resultados.map(r => r.B);

    // Destruir gráfico existente se houver
    if (chartBvsD2) {
        chartBvsD2.destroy();
    }

    chartBvsD2 = new Chart(chartBvsD2Element, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Campo Magnético B (T)',
                data: data,
                borderColor: 'rgba(255, 165, 0, 1)',
                backgroundColor: 'rgba(255, 165, 0, 0.2)',
                borderWidth: 2,
                pointRadius: 5,
                pointBackgroundColor: 'rgba(255, 165, 0, 1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#e0e0e0'
                    }
                },
                title: {
                    display: true,
                    text: 'Campo Magnético (B) vs. Distância (d) - Eixo Y Logarítmico',
                    color: '#00e5ff'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Distância d (m)',
                        color: '#b0b0b0'
                    },
                    ticks: {
                        color: '#e0e0e0'
                    },
                    grid: {
                        color: 'rgba(26, 77, 122, 0.5)'
                    }
                },
                y: {
                    type: 'logarithmic',
                    title: {
                        display: true,
                        text: 'Campo Magnético B (T) (Escala Log)',
                        color: '#b0b0b0'
                    },
                    ticks: {
                        color: '#e0e0e0',
                        callback: function(value) {
                            if (value === 0) return '0';
                            return value.toExponential(2);
                        }
                    },
                    grid: {
                        color: 'rgba(26, 77, 122, 0.5)'
                    }
                }
            }
        }
    });
}

// ============================================
// VISUALIZAÇÃO 3: PONTOS (•) E CRUZES (×)
// ============================================

function desenharPontosECruzes(resultados) {
    if (!dotsAndCrossesCtx) return;

    const canvas = dotsAndCrossesCanvas;
    const ctx = dotsAndCrossesCtx;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Limpar canvas
    ctx.fillStyle = 'rgba(10, 31, 63, 1)';
    ctx.fillRect(0, 0, width, height);

    // Fio (Centro)
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Encontrar o valor máximo de distância para escala
    const maxD = Math.max(...resultados.map(r => r.d));
    const scaleFactor = (width / 2 - 20) / maxD;

    // Desenhar representação
    resultados.forEach(resultado => {
        const distancia = resultado.d;
        const raioPixels = distancia * scaleFactor;
        
        const points = [
            { x: centerX + raioPixels, y: centerY, direction: 'out' },
            { x: centerX - raioPixels, y: centerY, direction: 'in' },
            { x: centerX, y: centerY + raioPixels, direction: 'in' },
            { x: centerX, y: centerY - raioPixels, direction: 'out' }
        ];
        
        const intensity = resultado.B / resultados[0].B;
        const size = 10 + intensity * 10;

        points.forEach(point => {
            ctx.save();
            ctx.translate(point.x, point.y);
            ctx.fillStyle = '#00e5ff';
            ctx.strokeStyle = '#00e5ff';
            ctx.lineWidth = 2;
            
            if (point.direction === 'out') {
                ctx.beginPath();
                ctx.arc(0, 0, size / 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.moveTo(-size / 3, -size / 3);
                ctx.lineTo(size / 3, size / 3);
                ctx.moveTo(size / 3, -size / 3);
                ctx.lineTo(-size / 3, size / 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
                ctx.stroke();
            }
            ctx.restore();
        });
    });
}

// ============================================
// VISUALIZAÇÃO 5: DIAGRAMA VETORIAL
// ============================================

function desenharDiagramaVetorial(resultados) {
    if (!vectorDiagramCtx) return;

    const canvas = vectorDiagramCanvas;
    const ctx = vectorDiagramCtx;
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    // Limpar canvas
    ctx.fillStyle = 'rgba(10, 31, 63, 1)';
    ctx.fillRect(0, 0, width, height);

    // Fio (Centro)
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();

    const maxB = Math.max(...resultados.map(r => r.B));
    const maxVectorLength = 50;
    const maxD = Math.max(...resultados.map(r => r.d));
    const scaleFactor = (width / 2 - 60) / maxD;

    // Desenhar vetores
    resultados.forEach(resultado => {
        const distancia = resultado.d;
        const campo = resultado.B;
        const raioPixels = distancia * scaleFactor;
        const vectorLength = (campo / maxB) * maxVectorLength;
        
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const startX = centerX + Math.cos(angle) * raioPixels;
            const startY = centerY + Math.sin(angle) * raioPixels;
            const tangentAngle = angle + Math.PI / 2;
            const endX = startX + Math.cos(tangentAngle) * vectorLength;
            const endY = startY + Math.sin(tangentAngle) * vectorLength;
            
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            const arrowSize = 6;
            ctx.fillStyle = '#ffcc00';
            ctx.save();
            ctx.translate(endX, endY);
            ctx.rotate(tangentAngle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-arrowSize, arrowSize / 2);
            ctx.lineTo(-arrowSize, -arrowSize / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    });
}

// ============================================
// ANIMAÇÕES DO CANVAS
// ============================================

function criarRipple() {
    ripples.push(new Ripple(centerX, centerY));
}

function desenharFio() {
    const fioWidth = 4;
    
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = fioWidth;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 150);
    ctx.lineTo(centerX, centerY + 150);
    ctx.stroke();
    
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 150);
    ctx.lineTo(centerX, centerY + 150);
    ctx.stroke();
    
    ctx.shadowBlur = 0;
}

function desenharLinhasCampo() {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < 5; i++) {
        const radius = 50 + i * 40;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function startCanvasAnimation() {
    if (!document.getElementById('vis1').classList.contains('active')) {
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        return;
    }

    function animate() {
        ctx.fillStyle = 'rgba(10, 31, 63, 0.5)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        desenharLinhasCampo();
        desenharFio();
        
        particles.forEach(particle => {
            particle.update();
            particle.draw(ctx);
        });
        
        ripples = ripples.filter(ripple => ripple.isAlive());
        ripples.forEach(ripple => {
            ripple.update();
            ripple.draw(ctx);
        });
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    if (!animationFrameId) {
        animate();
    }
}

// ============================================
// LIMPEZA
// ============================================

window.addEventListener('beforeunload', () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
});