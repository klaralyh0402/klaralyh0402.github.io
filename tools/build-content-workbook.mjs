import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputPath = process.argv[2];
if (!outputPath) {
  throw new Error("Usage: node tools/build-content-workbook.mjs <output.xlsx>");
}

const palette = {
  ink: "#102F34",
  paper: "#F5F2E9",
  white: "#FFFDF8",
  sage: "#8AA796",
  sageDeep: "#3F7164",
  ochre: "#D6A35D",
  line: "#D8DED9",
};

const sheets = {
  basic: {
    name: "基本信息",
    widths: [18, 44, 52, 34],
    sampleRowHeight: 54,
    headers: ["字段", "中文", "English", "说明"],
    rows: [
      ["姓名", "林于涵", "Yuhan Lin", "用于首页、导航和页脚"],
      ["姓名拼音", "林于涵", "Yuhan Lin", "英文页面显示的名称"],
      ["主页标题", "林于涵｜个人主页", "Yuhan Lin | Personal Homepage", "浏览器标签页标题"],
      ["站点描述", "个人主页，包含教育、获奖、证书与爱好。", "A personal homepage featuring education, awards, certificates, and interests.", "搜索引擎摘要"],
      ["一句话介绍", "上海交通大学外国语学院德语专业学生，曾就读于厦门外国语学校。喜欢用语言连接不同文化，也在持续探索表达与成长的可能。", "German major student at the School of Foreign Languages, Shanghai Jiao Tong University, and an alumna of Xiamen Foreign Language School. I enjoy connecting cultures through language and continuing to explore new ways to express and grow.", "首页主介绍"],
      ["关键词", "语言 · 表达 · 成长", "Language · Expression · Growth", "首页展示的简明标签"],
      ["照片路径", "assets/images/profile.jpg", "assets/images/profile.jpg", "建议使用 4:3 比例照片"],
      ["邮箱", "", "", "选填；留空时网站不显示"],
      ["GitHub", "", "", "选填；填写完整链接时网站显示"],
    ],
  },
  education: {
    name: "教育经历",
    widths: [8, 16, 16, 28, 42, 34, 42, 24, 28],
    sampleRowHeight: 60,
    headers: ["排序", "开始时间", "结束时间", "学校中文", "School (English)", "院系或说明中文", "Details (English)", "标签中文", "Tags (English)"],
    rows: [
      [1, "2025.09", "2029.06", "上海交通大学", "Shanghai Jiao Tong University", "外国语学院 · 德语专业", "School of Foreign Languages · German Major", "外国语学院,德语专业", "School of Foreign Languages,German Major"],
      [2, "2022.09", "2025.06", "厦门外国语学校", "Xiamen Foreign Language School", "在这里打下语言学习的基础，也开启了对德语与跨文化交流的探索。", "This is where I built the foundation of my language learning and began exploring German and cross-cultural communication.", "语言学习,跨文化交流", "Language Learning,Cross-cultural Communication"],
    ],
  },
  awards: {
    name: "获奖经历",
    widths: [8, 12, 30, 42, 16, 20, 18, 24, 46, 58],
    sampleRowHeight: 72,
    headers: ["排序", "年份", "奖项名称中文", "Award Title (English)", "奖项中文", "Prize (English)", "赛区中文", "Region (English)", "描述中文", "Description (English)"],
    rows: [
      [1, 2024, "青少年德语辩论赛", "Youth German Debate Competition", "二等奖", "Second Prize", "华南赛区", "South China Region", "在2024年青少年德语辩论赛中，获得华南赛区二等奖。这次经历让我更加体会到语言表达、临场思考与交流的力量。", "I won second prize in the South China Region of the 2024 Youth German Debate Competition. This experience deepened my appreciation for expression, quick thinking, and communication."],
    ],
  },
  certificates: {
    name: "能力证书",
    widths: [8, 28, 42, 12, 18, 16, 18, 46, 58],
    sampleRowHeight: 72,
    headers: ["排序", "证书名称中文", "Certificate Name (English)", "等级", "考试项目", "状态中文", "Status (English)", "描述中文", "Description (English)"],
    rows: [
      [1, "德国语言证书", "German Language Certificate", "C1", "DSD II", "已获得", "Earned", "获得德国语言证书DSD2级C1，证明我在德语听、说、读、写方面具备 C1 阶段的语言能力。", "I have earned the German Language Certificate DSD II at level C1, reflecting my German listening, speaking, reading, and writing abilities at the C1 stage."],
    ],
  },
  hobbies: {
    name: "爱好",
    widths: [8, 18, 24, 16, 48, 58],
    sampleRowHeight: 54,
    headers: ["排序", "爱好中文", "Hobby (English)", "图标", "描述中文", "Description (English)"],
    rows: [
      [1, "唱歌", "Singing", "music", "用声音感受旋律与情绪，在歌声里找到表达自己的方式。", "Feeling melody and emotion through my voice, and finding a way to express myself through song."],
      [2, "游泳", "Swimming", "swimming", "享受水中的节奏与专注，也享受一次次向前的耐力。", "Enjoying the rhythm and focus in the water, and the endurance of moving forward, stroke by stroke."],
      [3, "健身", "Fitness", "fitness", "用规律训练保持力量与状态，把坚持慢慢变成日常习惯.", "Building strength and energy through regular training, and turning consistency into a daily habit."],
    ],
  },
};

const workbook = Workbook.create();

function columnLetter(index) {
  let value = "";
  let current = index;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    value = String.fromCharCode(65 + remainder) + value;
    current = Math.floor((current - 1) / 26);
  }
  return value;
}

function styleTable(sheet, definition) {
  const columnCount = definition.headers.length;
  const lastColumn = columnLetter(columnCount);
  const lastRow = 52;

  sheet.showGridLines = false;
  sheet.getRange(`A1:${lastColumn}${lastRow}`).format.font = {
    name: "Arial",
    size: 10,
    color: palette.ink,
  };
  sheet.getRange(`A1:${lastColumn}1`).values = [definition.headers];
  sheet.getRange(`A1:${lastColumn}1`).format = {
    fill: palette.ink,
    font: { name: "Arial", size: 10, bold: true, color: palette.white },
    borders: { preset: "all", style: "thin", color: palette.white },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    rowHeight: 30,
  };

  if (definition.rows.length) {
    sheet.getRange(`A2:${lastColumn}${definition.rows.length + 1}`).values = definition.rows;
  }

  for (let row = 2; row <= lastRow; row += 1) {
    sheet.getRange(`A${row}:${lastColumn}${row}`).format = {
      fill: row % 2 === 0 ? palette.white : palette.paper,
      verticalAlignment: "top",
      wrapText: true,
      borders: { preset: "all", style: "thin", color: palette.line },
    };
  }

  sheet.getRange(`A2:A${lastRow}`).format.horizontalAlignment = "center";
  sheet.getRange(`A1:A${lastRow}`).format.columnWidth = definition.widths[0];
  for (let column = 2; column <= columnCount; column += 1) {
    sheet.getRange(`${columnLetter(column)}1:${columnLetter(column)}${lastRow}`).format.columnWidth = definition.widths[column - 1];
  }

  sheet.getRange(`A2:${lastColumn}${lastRow}`).format.rowHeight = 24;
  if (definition.rows.length) {
    sheet.getRange(`A2:${lastColumn}${definition.rows.length + 1}`).format.rowHeight = definition.sampleRowHeight || 42;
  }
  sheet.freezePanes.freezeRows(1);
  sheet.tabColor = palette.sageDeep;
  return sheet;
}

const contentSheets = {};
for (const [key, definition] of Object.entries(sheets)) {
  contentSheets[key] = styleTable(workbook.worksheets.add(definition.name), definition);
}

contentSheets.hobbies.getRange("D2:D52").dataValidation = {
  rule: {
    type: "list",
    values: ["music", "swimming", "fitness", "book", "camera", "travel", "language"],
  },
};

contentSheets.basic.tabColor = palette.ink;
contentSheets.hobbies.tabColor = palette.ochre;

const guide = workbook.worksheets.add("使用说明");
guide.showGridLines = false;
guide.tabColor = palette.sage;
guide.getRange("A1:F1").merge();
guide.getRange("A1:F1").values = [["个人主页内容维护说明"]];
guide.getRange("A1:F1").format = {
  fill: palette.ink,
  font: { name: "Arial", size: 14, bold: true, color: palette.white },
  horizontalAlignment: "left",
  verticalAlignment: "center",
  rowHeight: 38,
};
guide.getRange("A3:F3").merge();
guide.getRange("A3:F3").values = [["修改规则"]];
guide.getRange("A3:F3").format.font = { name: "Arial", size: 11, bold: true, color: palette.sageDeep };
const guideRows = [
  ["1. 基本信息", "在“基本信息”中修改姓名、简介、标题、照片路径和可选联系方式。"],
  ["2. 教育经历", "每条教育经历占一行；新增时在已有数据下方继续填写。"],
  ["3. 获奖经历", "每条获奖经历占一行，支持多条并按“排序”列升序显示。"],
  ["4. 能力证书", "每张证书占一行，等级和考试项目可自由填写。"],
  ["5. 爱好", "每个爱好占一行；“图标”列可选择 music、swimming、fitness、book、camera、travel、language。"],
  ["6. 保存与发布", "保存本表格并推送到 GitHub，自动部署流程会重新生成网站内容。"],
  ["7. 留空规则", "不需要的选填字段可留空；空白数据行不会显示在网站上。"],
];
guide.getRange(`A5:B${4 + guideRows.length}`).values = guideRows;
guide.getRange(`A5:B${4 + guideRows.length}`).format = {
  font: { name: "Arial", size: 10, color: palette.ink },
  verticalAlignment: "top",
  wrapText: true,
  borders: { preset: "all", style: "thin", color: palette.line },
};
guide.getRange("A5:A11").format.fill = palette.paper;
guide.getRange("A5:A11").format.font = { name: "Arial", size: 10, bold: true, color: palette.ink };
guide.getRange("A1:A11").format.columnWidth = 20;
guide.getRange("B1:B11").format.columnWidth = 80;
guide.getRange("A5:B11").format.rowHeight = 30;

await fs.mkdir(path.dirname(outputPath), { recursive: true });
workbook.recalculate();
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(`Created ${outputPath}`);