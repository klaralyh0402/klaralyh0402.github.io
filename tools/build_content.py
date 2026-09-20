#!/usr/bin/env python3
"""Build website content from the editable Homepage.xlsx workbook."""

from __future__ import annotations

import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK_PATH = ROOT / "Homepage.xlsx"
JS_OUTPUT = ROOT / "assets" / "js" / "content-data.js"
JSON_OUTPUT = ROOT / "data" / "content.json"

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

NS = {"m": MAIN_NS, "r": REL_NS, "p": PKG_REL_NS}


def cell_column_index(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference or "")
    if not letters:
        return 0
    value = 0
    for char in letters.group(0):
        value = value * 26 + (ord(char) - ord("A") + 1)
    return value - 1


def scalar_value(text: str):
    if text is None:
        return ""
    text = text.strip()
    if text == "":
        return ""
    if re.fullmatch(r"-?\d+", text):
        return int(text)
    if re.fullmatch(r"-?(?:\d+\.\d+|\d+\.)", text):
        return float(text)
    if text.lower() == "true":
        return True
    if text.lower() == "false":
        return False
    return text


def shared_strings(archive: zipfile.ZipFile) -> list[str]:
    path = "xl/sharedStrings.xml"
    if path not in archive.namelist():
        return []
    root = ET.fromstring(archive.read(path))
    values = []
    for item in root.findall("m:si", NS):
        values.append("".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t")))
    return values


def workbook_sheets(archive: zipfile.ZipFile) -> dict[str, str]:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    rel_map = {
        relation.attrib["Id"]: relation.attrib["Target"]
        for relation in relationships.findall("p:Relationship", NS)
    }
    sheets = {}
    for sheet in workbook.findall("m:sheets/m:sheet", NS):
        name = sheet.attrib["name"]
        rel_id = sheet.attrib[f"{{{REL_NS}}}id"]
        target = rel_map[rel_id].lstrip("/")
        path = target if target.startswith("xl/") else f"xl/{target}"
        sheets[name] = path.replace("xl/xl/", "xl/")
    return sheets


def read_sheet(archive: zipfile.ZipFile, path: str, strings: list[str]) -> list[dict[str, object]]:
    root = ET.fromstring(archive.read(path))
    grid: list[list[object]] = []

    for row in root.findall("m:sheetData/m:row", NS):
        row_values: list[object] = []
        for cell in row.findall("m:c", NS):
            index = cell_column_index(cell.attrib.get("r", "A1"))
            while len(row_values) <= index:
                row_values.append("")

            cell_type = cell.attrib.get("t")
            if cell_type == "inlineStr":
                value = "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
            else:
                raw = cell.find("m:v", NS)
                raw_text = raw.text if raw is not None else ""
                if cell_type == "s" and raw_text != "":
                    value = strings[int(raw_text)]
                else:
                    value = scalar_value(raw_text)
            row_values[index] = value
        grid.append(row_values)

    if not grid:
        return []

    headers = [str(value).strip() for value in grid[0]]
    records = []
    for row_number, row in enumerate(grid[1:], start=2):
        if not any(value not in ("", None) for value in row):
            continue
        record = {}
        for index, header in enumerate(headers):
            if not header:
                continue
            value = row[index] if index < len(row) else ""
            if isinstance(value, str):
                value = value.strip()
            record[header] = value
        record["_row"] = row_number
        records.append(record)
    return records


def load_workbook() -> dict[str, list[dict[str, object]]]:
    if not WORKBOOK_PATH.exists():
        raise FileNotFoundError(f"Missing workbook: {WORKBOOK_PATH}")
    with zipfile.ZipFile(WORKBOOK_PATH) as archive:
        strings = shared_strings(archive)
        sheets = workbook_sheets(archive)
        required = ["基本信息", "教育经历", "获奖经历", "能力证书", "爱好"]
        missing = [name for name in required if name not in sheets]
        if missing:
            raise ValueError(f"Workbook is missing required sheets: {', '.join(missing)}")
        return {name: read_sheet(archive, sheets[name], strings) for name in required}


def locale_pair(zh, en):
    return {"zh": zh or "", "en": en or ""}


def split_tags(value) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in re.split(r"[,，]", str(value)) if part.strip()]


def number(value, fallback=9999):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return fallback


def basic_info(rows: list[dict[str, object]]) -> dict[str, dict[str, str]]:
    field_map = {
        "姓名": "name",
        "姓名拼音": "display_name",
        "主页标题": "title",
        "站点描述": "description",
        "一句话介绍": "intro",
        "关键词": "keywords",
        "照片路径": "photo",
        "邮箱": "email",
        "GitHub": "github",
    }
    result = {}
    for row in rows:
        field = str(row.get("字段", "")).strip()
        key = field_map.get(field)
        if key:
            result[key] = locale_pair(row.get("中文"), row.get("English"))
    required = ["name", "title", "description", "intro", "photo"]
    missing = [key for key in required if not result.get(key, {}).get("zh")]
    if missing:
        raise ValueError(f"基本信息缺少必填字段: {', '.join(missing)}")
    return result


def build_content() -> dict[str, object]:
    workbook = load_workbook()
    education = sorted(
        [
            {
                "order": number(row.get("排序")),
                "start": str(row.get("开始时间", "")).strip(),
                "end": str(row.get("结束时间", "")).strip(),
                "school": locale_pair(row.get("学校中文"), row.get("School (English)")),
                "details": locale_pair(row.get("院系或说明中文"), row.get("Details (English)")),
                "tags": {
                    "zh": split_tags(row.get("标签中文")),
                    "en": split_tags(row.get("Tags (English)")),
                },
            }
            for row in workbook["教育经历"]
        ],
        key=lambda item: item["order"],
    )
    awards = sorted(
        [
            {
                "order": number(row.get("排序")),
                "year": str(row.get("年份", "")).strip(),
                "title": locale_pair(row.get("奖项名称中文"), row.get("Award Title (English)")),
                "prize": locale_pair(row.get("奖项中文"), row.get("Prize (English)")),
                "region": locale_pair(row.get("赛区中文"), row.get("Region (English)")),
                "description": locale_pair(row.get("描述中文"), row.get("Description (English)")),
            }
            for row in workbook["获奖经历"]
        ],
        key=lambda item: item["order"],
    )
    certificates = sorted(
        [
            {
                "order": number(row.get("排序")),
                "name": locale_pair(row.get("证书名称中文"), row.get("Certificate Name (English)")),
                "level": str(row.get("等级", "")).strip(),
                "program": str(row.get("考试项目", "")).strip(),
                "status": locale_pair(row.get("状态中文"), row.get("Status (English)")),
                "description": locale_pair(row.get("描述中文"), row.get("Description (English)")),
            }
            for row in workbook["能力证书"]
        ],
        key=lambda item: item["order"],
    )
    hobbies = sorted(
        [
            {
                "order": number(row.get("排序")),
                "name": locale_pair(row.get("爱好中文"), row.get("Hobby (English)")),
                "icon": str(row.get("图标", "music")).strip() or "music",
                "description": locale_pair(row.get("描述中文"), row.get("Description (English)")),
            }
            for row in workbook["爱好"]
        ],
        key=lambda item: item["order"],
    )
    return {
        "basic": basic_info(workbook["基本信息"]),
        "education": education,
        "awards": awards,
        "certificates": certificates,
        "hobbies": hobbies,
    }


def main() -> int:
    try:
        content = build_content()
    except Exception as error:
        print(f"[content-build] {error}", file=sys.stderr)
        return 1

    JS_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    JSON_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    pretty_json = json.dumps(content, ensure_ascii=False, indent=2)
    JS_OUTPUT.write_text(
        "window.HOMEPAGE_CONTENT = " + pretty_json + ";\n",
        encoding="utf-8",
        newline="\n",
    )
    JSON_OUTPUT.write_text(pretty_json + "\n", encoding="utf-8", newline="\n")
    print(
        "[content-build] "
        f"education={len(content['education'])} "
        f"awards={len(content['awards'])} "
        f"certificates={len(content['certificates'])} "
        f"hobbies={len(content['hobbies'])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())