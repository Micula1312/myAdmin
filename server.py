from __future__ import annotations

import json
import mimetypes
import re
import threading
import webbrowser
import zipfile
from datetime import datetime
from html import escape
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
RECEIPTS_DIR = ROOT / "ricevute" / "2026"
STATE_FILE = DATA_DIR / "registro-2026.json"
XLSX_FILE = DATA_DIR / "registro-2026.xlsx"
HOST = "127.0.0.1"
PORT = 5050

DEFAULT_STATE = {
    "lastConfirmed": 8,
    "paid": [
        {"numero": 1, "clienteNome": "Spotlight", "tipo": "Prestazione occasionale", "lordo": 375, "netto": 300},
        {"numero": 2, "clienteNome": "Scomodo", "tipo": "Prestazione occasionale", "lordo": 500, "netto": 400},
        {"numero": 3, "clienteNome": "Iuno", "tipo": "Prestazione occasionale", "lordo": 325, "netto": 260},
        {"numero": 4, "clienteNome": "Fondazione Pastificio", "tipo": "Rimborso spese — escluso soglia", "lordo": 276.35, "netto": 276.35, "extra": 2, "excluded": True},
        {"numero": 6, "clienteNome": "Teorema 1", "tipo": "Prestazione occasionale", "lordo": 1320, "netto": 1056},
        {"numero": 7, "clienteNome": "Flyer", "tipo": "Prestazione occasionale", "lordo": 500, "netto": 400},
        {"numero": 8, "clienteNome": "Teorema 2", "tipo": "Prestazione occasionale", "lordo": 1320, "netto": 1056},
    ],
    "pending": [
        {
            "id": "docenza-960",
            "clienteNome": "Teorema 3 / Docenza",
            "lordo": 960,
            "data": "2026-07-28",
            "descrizione": "Collaborazione per attività di docenza durante il secondo semestre del corso Bachelor Fotografia 3° Anno: lezioni del 19/05, 21/05, 28/05, 04/06, esami del 06/07 e 23/07, più 3 ore dedicate a colloqui con studenti, preparazione esami e riunione di coordinamento.",
            "sostituto": True,
        },
        {
            "id": "balletto-500",
            "clienteNome": "Balletto",
            "lordo": 500,
            "data": "",
            "descrizione": "Prestazione occasionale per spettacolo di balletto.",
            "sostituto": True,
        },
    ],
}


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RECEIPTS_DIR.mkdir(parents=True, exist_ok=True)


def load_state() -> dict:
    ensure_dirs()
    if STATE_FILE.exists():
        try:
            data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict) and isinstance(data.get("paid"), list) and isinstance(data.get("pending"), list):
                return data
        except Exception:
            pass
    state = json.loads(json.dumps(DEFAULT_STATE, ensure_ascii=False))
    save_state(state)
    return state


def save_state(state: dict) -> None:
    ensure_dirs()
    tmp = STATE_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(STATE_FILE)
    write_xlsx(state)


def col_name(n: int) -> str:
    out = ""
    while n:
        n, r = divmod(n - 1, 26)
        out = chr(65 + r) + out
    return out


def xml_cell(ref: str, value, style: int = 0) -> str:
    s = f' s="{style}"' if style else ""
    if value is None or value == "":
        return f'<c r="{ref}"{s}/>'
    if isinstance(value, bool):
        return f'<c r="{ref}" t="b"{s}><v>{1 if value else 0}</v></c>'
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return f'<c r="{ref}"{s}><v>{value}</v></c>'
    return f'<c r="{ref}" t="inlineStr"{s}><is><t xml:space="preserve">{escape(str(value))}</t></is></c>'


def receipt_rows(state: dict) -> list[list]:
    rows = []
    for r in state.get("paid", []):
        snap = r.get("snapshot") or {}
        rows.append([
            r.get("numero", ""), "INCASSATA", r.get("data") or snap.get("data", ""), r.get("clienteNome", ""),
            r.get("tipo", "Prestazione occasionale"), r.get("lordo", 0), snap.get("cumulato", ""), snap.get("imponibile", ""),
            snap.get("aliquota", ""), snap.get("inpsMe", ""), snap.get("inpsCliente", ""), snap.get("ritenuta", ""),
            r.get("netto", 0), bool(r.get("excluded", False)), r.get("pdf", ""), r.get("descrizione") or snap.get("descrizione", ""),
        ])
    running = sum(float(r.get("lordo", 0) or 0) for r in state.get("paid", []) if not r.get("excluded"))
    last = int(state.get("lastConfirmed", 0) or 0)
    for i, r in enumerate(state.get("pending", [])):
        rows.append([
            last + i + 1, "IN SOSPESO", r.get("data", ""), r.get("clienteNome", ""), "Prestazione occasionale",
            r.get("lordo", 0), running, "", "", "", "", "", "", False, "", r.get("descrizione", ""),
        ])
        running += float(r.get("lordo", 0) or 0)
    return rows


def write_xlsx(state: dict) -> None:
    headers = [
        "Numero", "Stato", "Data", "Committente", "Tipo", "Lordo", "Cumulato precedente", "Imponibile INPS",
        "Aliquota INPS", "INPS lavoratrice", "INPS committente", "Ritenuta", "Netto", "Escluso soglia", "PDF", "Descrizione",
    ]
    rows = receipt_rows(state)
    paid_total = sum(float(r.get("lordo", 0) or 0) for r in state.get("paid", []) if not r.get("excluded"))
    pending_total = sum(float(r.get("lordo", 0) or 0) for r in state.get("pending", []))

    sheet_rows = []
    summary = [
        ["MYADMIN — REGISTRO 2026"],
        ["Incassato", paid_total, "Da incassare", pending_total, "Previsto", paid_total + pending_total, "Residuo soglia €5.000", max(0, 5000 - paid_total)],
        [],
        headers,
    ]
    all_rows = summary + rows
    for r_idx, row in enumerate(all_rows, start=1):
        cells = []
        for c_idx, value in enumerate(row, start=1):
            style = 1 if r_idx in (1, 4) else (2 if c_idx in (6, 7, 8, 10, 11, 12, 13) and r_idx > 4 else 0)
            cells.append(xml_cell(f"{col_name(c_idx)}{r_idx}", value, style))
        sheet_rows.append(f'<row r="{r_idx}">{"".join(cells)}</row>')

    widths = [9, 14, 13, 25, 28, 13, 18, 16, 14, 16, 17, 13, 13, 14, 24, 55]
    cols_xml = "".join(f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>' for i, w in enumerate(widths, start=1))
    last_row = max(4, len(all_rows))
    sheet_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>{cols_xml}</cols>
  <sheetData>{''.join(sheet_rows)}</sheetData>
  <autoFilter ref="A4:P{last_row}"/>
</worksheet>'''

    styles_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1"><numFmt numFmtId="164" formatCode="#.##0,00 [$€-it-IT]"/></numFmts>
  <fonts count="2"><font><sz val="11"/><name val="Arial"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Arial"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF111111"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>'''

    workbook_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Registro 2026" sheetId="1" r:id="rId1"/></sheets></workbook>'''
    workbook_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'''
    root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'''
    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'''

    tmp = XLSX_FILE.with_suffix(".xlsx.tmp")
    with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", content_types)
        z.writestr("_rels/.rels", root_rels)
        z.writestr("xl/workbook.xml", workbook_xml)
        z.writestr("xl/_rels/workbook.xml.rels", workbook_rels)
        z.writestr("xl/styles.xml", styles_xml)
        z.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    tmp.replace(XLSX_FILE)


def pdf_index() -> dict[str, str]:
    ensure_dirs()
    result = {}
    for path in sorted(RECEIPTS_DIR.glob("*.pdf")):
        m = re.match(r"^0*(\d{1,4})(?=[\s._-]|\.pdf$)", path.name, re.I)
        if m:
            result.setdefault(str(int(m.group(1))), f"/ricevute/2026/{path.name}")
    return result


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, payload, status=200):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/state":
            return self.send_json(load_state())
        if path == "/api/pdfs":
            return self.send_json({"files": pdf_index()})
        if path == "/api/status":
            return self.send_json({"ok": True, "xlsx": "data/registro-2026.xlsx", "json": "data/registro-2026.json"})
        if path == "/data/registro-2026.xlsx":
            write_xlsx(load_state())
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        if path != "/api/state":
            return self.send_json({"ok": False, "error": "not found"}, 404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 2_000_000:
                raise ValueError("payload non valido")
            state = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(state, dict) or not isinstance(state.get("paid"), list) or not isinstance(state.get("pending"), list):
                raise ValueError("struttura stato non valida")
            save_state(state)
            return self.send_json({"ok": True, "xlsx": "data/registro-2026.xlsx"})
        except Exception as exc:
            return self.send_json({"ok": False, "error": str(exc)}, 400)

    def log_message(self, fmt, *args):
        print(f"[myAdmin] {self.address_string()} - {fmt % args}")


def main():
    ensure_dirs()
    state = load_state()
    write_xlsx(state)
    url = f"http://{HOST}:{PORT}"
    print("\nmyAdmin avviato")
    print(f"  App:   {url}")
    print(f"  Excel: {XLSX_FILE}")
    print(f"  PDF:   {RECEIPTS_DIR}")
    print("\nCTRL+C per chiudere.\n")
    threading.Timer(0.7, lambda: webbrowser.open(url)).start()
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    main()
