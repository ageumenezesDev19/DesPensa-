import itertools
import pandas as pd
import sys
import json
from db_utils import carregar_dados_html, tratar_dados, CAMINHO_PRODUTOS
from blacklist_utils import load_blacklist

def buscar_produtos_proximos(df, preco_desejado, n=3):
    df_filtrado = df[(df["Margem Lucro"] > 0) & (df["Quantidade"] >= 1)].copy()
    if df_filtrado.empty:
        return None
    df_filtrado["Diferenca"] = (df_filtrado["Preço Venda"] - preco_desejado).abs()
    return df_filtrado.sort_values("Diferenca").head(n)

def buscar_produto_proximo(df, preco_desejado, blacklist=None):
    if blacklist is None:
        blacklist = []
    df_filtrado = df[(df["Margem Lucro"] > 0) & (df["Quantidade"] >= 1)].copy()
    # Aplica blacklist
    for termo in blacklist:
        df_filtrado = df_filtrado[~df_filtrado["Descrição"].str.contains(termo, case=False, na=False)]
    if df_filtrado.empty:
        return None
    df_filtrado["Diferenca"] = (df_filtrado["Preço Venda"] - preco_desejado).abs()
    return df_filtrado.sort_values("Diferenca").iloc[0]

def buscar_combinacao_gulosa(df, preco_desejado, tolerancia=0.4, max_produtos=5, usados=set(), blacklist=None):
    if blacklist is None:
        blacklist = []
    df_filtrado = df[(df["Margem Lucro"] > 0) & (df["Quantidade"] >= 1)].copy()
    # Aplica blacklist
    for termo in blacklist:
        df_filtrado = df_filtrado[~df_filtrado["Descrição"].str.contains(termo, case=False, na=False)]
    df_filtrado = df_filtrado[~df_filtrado["Código"].isin(usados)]
    df_filtrado = df_filtrado.sample(frac=1).reset_index(drop=True)
    combinacao = []
    valor_restante = preco_desejado

    for _ in range(max_produtos):
        candidatos = df_filtrado[df_filtrado["Preço Venda"] <= valor_restante + tolerancia].copy()
        if candidatos.empty:
            break
        candidatos["Diferenca"] = (candidatos["Preço Venda"] - valor_restante).abs()
        produto = candidatos.sort_values("Diferenca").iloc[0]
        combinacao.append(produto)
        valor_restante -= produto["Preço Venda"]
        df_filtrado = df_filtrado[df_filtrado["Código"] != produto["Código"]]
        if abs(valor_restante) <= tolerancia:
            break

    total = sum(prod["Preço Venda"] for prod in combinacao)
    if abs(preco_desejado - total) <= tolerancia and len(combinacao) > 0:
        return pd.DataFrame(combinacao)
    return None

def buscar_combinacao_exaustiva(df, preco_desejado, tolerancia=0.4, max_produtos=5, usados=set(), blacklist=None):
    if blacklist is None:
        blacklist = []
    df_filtrado = df[(df["Margem Lucro"] > 0) & (df["Quantidade"] >= 1)].copy()
    for termo in blacklist:
        df_filtrado = df_filtrado[~df_filtrado["Descrição"].str.contains(termo, case=False, na=False)]
    df_filtrado = df_filtrado[~df_filtrado["Código"].isin(usados)]
    produtos = list(df_filtrado.to_dict("records"))
    melhor = None
    melhor_dif = float("inf")
    for n in range(2, max_produtos+1):
        for comb in itertools.combinations(produtos, n):
            total = sum(prod["Preço Venda"] for prod in comb)
            dif = abs(total - preco_desejado)
            if dif <= tolerancia and dif < melhor_dif:
                melhor = comb
                melhor_dif = dif
                if melhor_dif == 0:
                    break
        if melhor_dif == 0:
            break
    if melhor:
        return pd.DataFrame(melhor)
    return None

def buscar_produto_script(preco):
    soup, df = carregar_dados_html(CAMINHO_PRODUTOS)
    df = tratar_dados(df)
    blacklist = load_blacklist()
    produto = buscar_produto_proximo(df, preco, blacklist=blacklist)
    if produto is not None:
        return {"status": "ok", "produto": dict(produto)}
    else:
        return {"status": "not_found"}

def buscar_combinacao_script(preco):
    soup, df = carregar_dados_html(CAMINHO_PRODUTOS)
    df = tratar_dados(df)
    blacklist = load_blacklist()
    combinacao = buscar_combinacao_gulosa(df, preco, tolerancia=0.4, blacklist=blacklist)
    if combinacao is None or combinacao.empty:
        combinacao = buscar_combinacao_exaustiva(df, preco, tolerancia=0.4, max_produtos=5, blacklist=blacklist)
    if combinacao is None or combinacao.empty:
        return {"status": "not_found"}
    else:
        return {"status": "ok", "combinacao": combinacao.to_dict(orient="records")}

if __name__ == "__main__":
    # Uso: python busca.py [buscar_produto|buscar_combinacao] preco
    acao = sys.argv[1] if len(sys.argv) > 1 else "buscar_produto"
    if acao == "buscar_produto" and len(sys.argv) > 2:
        preco = float(sys.argv[2].replace(",", "."))
        print(json.dumps(buscar_produto_script(preco), ensure_ascii=False))
    elif acao == "buscar_combinacao" and len(sys.argv) > 2:
        preco = float(sys.argv[2].replace(",", "."))
        print(json.dumps(buscar_combinacao_script(preco), ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Uso: python busca.py [buscar_produto|buscar_combinacao] preco"}, ensure_ascii=False))
