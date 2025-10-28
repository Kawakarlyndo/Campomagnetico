"""
Campo Magnético — Lei de Biot-Savart
Backend API com Flask

Este servidor implementa a Lei de Biot-Savart para calcular o campo magnético
gerado por uma corrente elétrica em um fio longo reto.

Fórmula: B = (μ₀ * I) / (2πd)
onde:
  - μ₀ = 4π × 10⁻⁷ T·m/A (permeabilidade do vácuo)
  - I = corrente em Amperes
  - d = distância do fio em metros
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import math

# Inicializar a aplicação Flask
app = Flask(__name__)

# Habilitar CORS para permitir requisições do frontend
CORS(app)

# Constante: Permeabilidade magnética do vácuo
MU_0 = 4 * math.pi * 1e-7  # T·m/A


def calcular_campo_magnetico(corrente, distancia):
    """
    Calcula o campo magnético usando a Lei de Biot-Savart.
    
    Args:
        corrente (float): Corrente elétrica em Amperes
        distancia (float): Distância do fio em metros
    
    Returns:
        float: Campo magnético em Tesla
    """
    if distancia <= 0:
        raise ValueError("Distância deve ser maior que zero")
    
    if corrente <= 0:
        raise ValueError("Corrente deve ser maior que zero")
    
    # Fórmula: B = (μ₀ * I) / (2πd)
    campo_magnetico = (MU_0 * corrente) / (2 * math.pi * distancia)
    
    return campo_magnetico


@app.route('/', methods=['GET'])
def status():
    """
    Endpoint de status da API.
    
    Returns:
        JSON com status da API
    """
    return jsonify({
        "status": "API de Campo Magnético funcionando",
        "versao": "1.0",
        "descricao": "Lei de Biot-Savart para fio longo reto"
    }), 200


@app.route('/calcular', methods=['POST'])
def calcular():
    """
    Endpoint principal para calcular o campo magnético.
    
    Recebe JSON com:
    {
        "I": <corrente em Amperes>,
        "distancias": [<valores em metros>]
    }
    
    Retorna JSON com:
    {
        "resultados": [
            {"d": <metros>, "B": <Tesla>},
            ...
        ]
    }
    """
    try:
        # Obter dados JSON da requisição
        dados = request.get_json()
        
        # Validar se dados foram enviados
        if not dados:
            return jsonify({
                "erro": "Nenhum dado foi enviado",
                "detalhes": "Envie um JSON com 'I' e 'distancias'"
            }), 400
        
        # Extrair corrente
        corrente = dados.get('I')
        distancias = dados.get('distancias')
        
        # Validar presença de corrente
        if corrente is None:
            return jsonify({
                "erro": "Campo 'I' (corrente) não foi fornecido",
                "detalhes": "Envie a corrente em Amperes"
            }), 400
        
        # Validar presença de distâncias
        if distancias is None:
            return jsonify({
                "erro": "Campo 'distancias' não foi fornecido",
                "detalhes": "Envie um array com as distâncias em metros"
            }), 400
        
        # Validar tipo de corrente
        try:
            corrente = float(corrente)
        except (TypeError, ValueError):
            return jsonify({
                "erro": "Corrente deve ser um número",
                "detalhes": f"Recebido: {type(corrente).__name__}"
            }), 400
        
        # Validar tipo de distâncias
        if not isinstance(distancias, list):
            return jsonify({
                "erro": "Distâncias deve ser um array",
                "detalhes": f"Recebido: {type(distancias).__name__}"
            }), 400
        
        # Validar se distâncias não está vazio
        if len(distancias) == 0:
            return jsonify({
                "erro": "Array de distâncias está vazio",
                "detalhes": "Forneça pelo menos uma distância"
            }), 400
        
        # Validar valor de corrente
        if corrente <= 0:
            return jsonify({
                "erro": "Corrente deve ser maior que zero",
                "detalhes": f"Recebido: {corrente} A"
            }), 400
        
        # Converter distâncias para float e validar
        distancias_float = []
        for i, d in enumerate(distancias):
            try:
                d_float = float(d)
                if d_float <= 0:
                    return jsonify({
                        "erro": f"Distância no índice {i} deve ser maior que zero",
                        "detalhes": f"Recebido: {d_float} m"
                    }), 400
                distancias_float.append(d_float)
            except (TypeError, ValueError):
                return jsonify({
                    "erro": f"Distância no índice {i} não é um número válido",
                    "detalhes": f"Recebido: {d}"
                }), 400
        
        # Calcular campo magnético para cada distância
        resultados = []
        for distancia in distancias_float:
            try:
                campo = calcular_campo_magnetico(corrente, distancia)
                resultados.append({
                    "d": distancia,
                    "B": campo
                })
            except ValueError as e:
                return jsonify({
                    "erro": "Erro no cálculo",
                    "detalhes": str(e)
                }), 400
        
        # Retornar resultados
        return jsonify({
            "resultados": resultados
        }), 200
    
    except Exception as e:
        # Tratamento de erros inesperados
        return jsonify({
            "erro": "Erro interno do servidor",
            "detalhes": str(e)
        }), 500


@app.errorhandler(404)
def nao_encontrado(error):
    """Tratamento para rotas não encontradas."""
    return jsonify({
        "erro": "Rota não encontrada",
        "detalhes": "Verifique a URL da requisição"
    }), 404


@app.errorhandler(405)
def metodo_nao_permitido(error):
    """Tratamento para métodos HTTP não permitidos."""
    return jsonify({
        "erro": "Método HTTP não permitido",
        "detalhes": "Verifique o método (GET, POST, etc.)"
    }), 405


if __name__ == '__main__':
    # Executar o servidor em modo debug
    # Acesso em http://127.0.0.1:5000
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True
    )
