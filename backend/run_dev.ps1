# Executa a API a partir da pasta backend (PYTHONPATH correto para o pacote `app`).
Set-Location $PSScriptRoot
$env:PYTHONPATH = $PSScriptRoot
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
