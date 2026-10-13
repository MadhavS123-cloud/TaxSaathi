import requests
base = "http://localhost:8000"
spec = requests.get(f"{base}/openapi.json").json()
bad = []
for path, ops in spec["paths"].items():
    for method in ("post", "put", "patch", "delete"):
        if method in ops:
            url = base + path.replace("{", "1").replace("}", "")
            r = requests.request(method.upper(), url, json={})
            print(method.upper(), path, r.status_code)
            if r.status_code not in (401, 403):
                bad.append((method.upper(), path, r.status_code))
print("UNPROTECTED:" if bad else "All write routes protected", bad)