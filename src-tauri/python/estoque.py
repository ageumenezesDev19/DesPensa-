from db_utils import (
    carregar_dados_html, tratar_dados, atualizar_estoque_html, salvar_retirado, CAMINHO_PRODUTOS
)
from busca import buscar_produto_proximo, buscar_combinacao_gulosa, buscar_combinacao_exaustiva
from blacklist_utils import load_blacklist
import pandas as pd
import os
import json
import sys

def get_retirados():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, '..', 'data')
    CAMINHO_RETIRADOS = os.path.join(data_dir, "retirados.csv")
    if not os.path.exists(CAMINHO_RETIRADOS) or os.path.getsize(CAMINHO_RETIRADOS) == 0:
        return {"status": "empty", "produtos": []}
    try:
        df = pd.read_csv(
            CAMINHO_RETIRADOS,
            names=["Código", "Descrição", "Quantidade Retirada", "Preço Venda", "Data"],
            header=0 if pd.read_csv(CAMINHO_RETIRADOS, nrows=1).columns[0] == "Código" else None
        )
        if df.empty:
            return {"status": "empty", "produtos": []}
        else:
            return {"status": "ok", "produtos": df.to_dict(orient="records")}
    except Exception as e:
        return {"status": "error", "message": str(e)}

def buscar_produto(preco, blacklist=None):
    soup, df = carregar_dados_html(CAMINHO_PRODUTOS)
    df = tratar_dados(df)
    if blacklist is None:
        blacklist = load_blacklist()
    produto = buscar_produto_proximo(df, preco, blacklist=blacklist)
    if produto is not None:
        return {"status": "ok", "produto": dict(produto)}
    else:
        return {"status": "not_found"}

def buscar_combinacao(preco, usados=None, blacklist=None):
    soup, df = carregar_dados_html(CAMINHO_PRODUTOS)
    df = tratar_dados(df)
    if blacklist is None:
        blacklist = load_blacklist()
    if usados is None:
        usados = set()
    combinacao = buscar_combinacao_gulosa(df, preco, tolerancia=0.4, usados=usados, blacklist=blacklist)
    if combinacao is None or combinacao.empty:
        combinacao = buscar_combinacao_exaustiva(df, preco, tolerancia=0.4, max_produtos=5, usados=usados, blacklist=blacklist)
    if combinacao is None or combinacao.empty:
        return {"status": "not_found"}
    else:
        return {"status": "ok", "combinacao": combinacao.to_dict(orient="records")}

def retirar_produto(codigo, qtd):
    soup, df = carregar_dados_html(CAMINHO_PRODUTOS)
    df = tratar_dados(df)
    produto = df[df["Código"] == codigo]
    if produto.empty:
        return {"status": "not_found", "message": "Produto não encontrado."}
    prod = produto.iloc[0]
    if qtd <= 0 or qtd > prod["Quantidade"]:
        return {"status": "invalid_quantity", "message": "Quantidade inválida."}
    novo_estoque = prod["Quantidade"] - qtd
    atualizar_estoque_html(soup, prod["Código"], novo_estoque)
    salvar_retirado(prod, qtd)
    return {"status": "ok", "message": f"{qtd} unidade(s) de '{prod['Descrição']}' retirada(s) com sucesso."}

if __name__ == "__main__":
    # Uso: python estoque.py [acao] [parametros...]
    # acao: get_retirados | buscar_produto | buscar_combinacao | retirar_produto
    acao = sys.argv[1] if len(sys.argv) > 1 else "get_retirados"
    if acao == "get_retirados":
        print(json.dumps(get_retirados(), ensure_ascii=False))
    elif acao == "buscar_produto" and len(sys.argv) > 2:
        preco = float(sys.argv[2].replace(",", "."))
        print(json.dumps(buscar_produto(preco), ensure_ascii=False))
    elif acao == "buscar_combinacao" and len(sys.argv) > 2:
        preco = float(sys.argv[2].replace(",", "."))
        print(json.dumps(buscar_combinacao(preco), ensure_ascii=False))
    elif acao == "retirar_produto" and len(sys.argv) > 3:
        codigo = sys.argv[2]
        qtd = float(sys.argv[3].replace(",", "."))
        print(json.dumps(retirar_produto(codigo, qtd), ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Uso: python estoque.py [get_retirados|buscar_produto|buscar_combinacao|retirar_produto] [parametros...]"}, ensure_ascii=False))
