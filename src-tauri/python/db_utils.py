import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime
import os
import sys
import json

# Obter o diretório do script atual
script_dir = os.path.dirname(os.path.abspath(__file__))
# Construir o caminho para o diretório de dados
data_dir = os.path.join(script_dir, '..', 'data')

CAMINHO_PRODUTOS = os.path.join(data_dir, "produtos.html")
CAMINHO_RETIRADOS = os.path.join(data_dir, "retirados.csv")

def carregar_dados_html(caminho_arquivo):
    with open(caminho_arquivo, "r", encoding="utf-8") as f:
        html = f.read()
    soup = BeautifulSoup(html, "html.parser")
    todas_td = soup.find_all("td")
    colunas = [td.get_text(strip=True) for td in todas_td[:11]]
    dados = [td.get_text(strip=True) for td in todas_td[11:]]
    linhas = [dados[i:i+11] for i in range(0, len(dados), 11)]
    df = pd.DataFrame(linhas, columns=colunas)
    return soup, df

def tratar_dados(df):
    campos_numericos = ["Quantidade", "Preço Custo", "Margem Lucro", "Preço Venda"]
    for campo in campos_numericos:
        df[campo] = (
            df[campo]
            .str.replace(".", "", regex=False)
            .str.replace(",", ".", regex=False)
            .astype(float)
        )
    return df

def atualizar_estoque_html(soup, codigo, nova_quantidade):
    for linha in soup.find_all("tr"):
        colunas = linha.find_all("td")
        if colunas and colunas[0].get_text(strip=True) == str(codigo):
            colunas[5].string = str(nova_quantidade).replace('.', ',')
            break
    with open(CAMINHO_PRODUTOS, "w", encoding="utf-8") as f:
        f.write(str(soup))

def salvar_retirado(produto, quantidade):
    data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    registro = pd.DataFrame([{
        "Código": produto["Código"],
        "Descrição": produto["Descrição"],
        "Quantidade Retirada": quantidade,
        "Preço Venda": produto["Preço Venda"],
        "Data": data
    }])
    if os.path.exists(CAMINHO_RETIRADOS):
        registro.to_csv(CAMINHO_RETIRADOS, mode="a", header=False, index=False)
    else:
        registro.to_csv(CAMINHO_RETIRADOS, index=False)

def get_produtos():
    if not os.path.exists(CAMINHO_PRODUTOS):
        return {"status": "not_found", "produtos": []}
    try:
        soup, df = carregar_dados_html(CAMINHO_PRODUTOS)
        df = tratar_dados(df)
        return {"status": "ok", "produtos": df.to_dict(orient="records")}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # Uso: python db_utils.py get_produtos
    acao = sys.argv[1] if len(sys.argv) > 1 else "get_produtos"
    if acao == "get_produtos":
        print(json.dumps(get_produtos(), ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Uso: python db_utils.py get_produtos"}, ensure_ascii=False))
