import os
import sys
import json

# Obter o diretório do script atual
script_dir = os.path.dirname(os.path.abspath(__file__))
# Construir o caminho para o diretório de dados
data_dir = os.path.join(script_dir, '..', 'data')
BLACKLIST_FILE = os.path.join(data_dir, "blacklist.txt")

def load_blacklist():
    if not os.path.exists(BLACKLIST_FILE):
        return []
    with open(BLACKLIST_FILE, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]

def save_blacklist(blacklist):
    with open(BLACKLIST_FILE, "w", encoding="utf-8") as f:
        for item in blacklist:
            f.write(item.strip() + "\n")

def get_blacklist():
    return {"status": "ok", "blacklist": load_blacklist()}

def add_to_blacklist(term):
    blacklist = load_blacklist()
    if term and term not in blacklist:
        blacklist.append(term)
        save_blacklist(blacklist)
        return {"status": "added", "term": term, "blacklist": blacklist}
    return {"status": "exists", "term": term, "blacklist": blacklist}

def remove_from_blacklist(term):
    blacklist = load_blacklist()
    if term in blacklist:
        blacklist.remove(term)
        save_blacklist(blacklist)
        return {"status": "removed", "term": term, "blacklist": blacklist}
    return {"status": "not_found", "term": term, "blacklist": blacklist}

if __name__ == "__main__":
    # Uso: python blacklist_utils.py [get|add|remove] [termo]
    action = sys.argv[1] if len(sys.argv) > 1 else "get"
    if action == "get":
        print(json.dumps(get_blacklist(), ensure_ascii=False))
    elif action == "add" and len(sys.argv) > 2:
        print(json.dumps(add_to_blacklist(sys.argv[2]), ensure_ascii=False))
    elif action == "remove" and len(sys.argv) > 2:
        print(json.dumps(remove_from_blacklist(sys.argv[2]), ensure_ascii=False))
    else:
        print(json.dumps({"status": "error", "message": "Uso: python blacklist_utils.py [get|add|remove] [termo]"}, ensure_ascii=False))
