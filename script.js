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
    
    // Event listeners
    calcForm.addEventListener('submit', handleFormSubmit);
    
    // Iniciar animação do canvas
    startCanvasAnimation();
});

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
            console.log('API disponível');
            DEMO_MODE = false;
        } else {
            throw new Error('API não respondeu com sucesso');
        }
    } catch (error) {
        console.warn('API não disponível, ativando modo DEMO:', error.message);
        DEMO_MODE = true;
    }
}

// ============================================
// MANIPULAÇÃO DO FORMULÁRIO
// ============================================

async function handleFormSubmit(event) {
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
    
    try {
        // Enviar requisição à API
        const distanciasArray = validation.distancias;
        const resultado = await calcularCampoMagnetico(correnteValue, distanciasArray);
        
        // Processar resultados
        if (resultado.error) {
            showErrorMessage(resultado.error);
        } else {
            currentResults = resultado.resultados;
            exibirResultados(correnteValue, resultado.resultados);
            atualizarAnimacaoCanvas(correnteValue, resultado.resultados);
            criarRipple();
        }
    } catch (error) {
        showErrorMessage('Erro ao comunicar com a API: ' + error.message);
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
    // Modo DEMO
    if (DEMO_MODE) {
        console.log('Usando modo DEMO');
        return {
            resultados: distancias.map(d => ({
                d: d,
                B: (MU_0 * corrente) / (2 * Math.PI * d)
            }))
        };
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
        
        const data = await response.json();
        
        if (!response.ok) {
            return {
                error: data.erro || 'Erro ao calcular campo magnético'
            };
        }
        
        return data;
    } catch (error) {
        console.error('Erro na requisição:', error);
        return {
            error: 'Erro ao comunicar com a API'
        };
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
// ANIMAÇÕES DO CANVAS
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
        
        // Número de partículas proporcional à intensidade
        const numParticles = Math.ceil(intensidade * 20);
        const speed = intensidade * 0.05;
        
        // Raio da órbita em pixels (escalar para o canvas)
        const raioPixels = (distancia / Math.max(...resultados.map(r => r.d))) * 150 + 30;
        
        for (let i = 0; i < numParticles; i++) {
            const angle = (Math.PI * 2 * i) / numParticles;
            const x = centerX + Math.cos(angle) * raioPixels;
            const y = centerY + Math.sin(angle) * raioPixels;
            
            particles.push(new Particle(x, y, speed, angle));
        }
    });
}

function criarRipple() {
    ripples.push(new Ripple(centerX, centerY));
}

function desenharFio() {
    // Fio central brilhante
    const fioWidth = 4;
    
    // Efeito de glow
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = fioWidth;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 150);
    ctx.lineTo(centerX, centerY + 150);
    ctx.stroke();
    
    // Fio mais brilhante no centro
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
    // Linhas de campo circulares
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
    function animate() {
        // Limpar canvas
        ctx.fillStyle = 'rgba(10, 31, 63, 0.1)';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Desenhar linhas de campo
        desenharLinhasCampo();
        
        // Desenhar fio
        desenharFio();
        
        // Atualizar e desenhar partículas
        particles.forEach(particle => {
            particle.update();
            particle.draw(ctx);
        });
        
        // Atualizar e desenhar ripples
        ripples = ripples.filter(ripple => ripple.isAlive());
        ripples.forEach(ripple => {
            ripple.update();
            ripple.draw(ctx);
        });
        
        animationFrameId = requestAnimationFrame(animate);
    }
    
    animate();
}

// ============================================
// LIMPEZA
// ============================================

window.addEventListener('beforeunload', () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
});
