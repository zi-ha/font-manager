export const fontNameMapping: Record<string, string> = {
  // Windows Standard
  "Arial": "Arial",
  "Times New Roman": "Times New Roman",
  "Microsoft YaHei": "微软雅黑",
  "Microsoft YaHei UI": "微软雅黑 UI",
  "SimHei": "黑体",
  "SimSun": "宋体",
  "NSimSun": "新宋体",
  "KaiTi": "楷体",
  "FangSong": "仿宋",
  "Microsoft JhengHei": "微软正黑体",
  "Microsoft JhengHei UI": "微软正黑体 UI",
  "PMingLiU": "新细明体",
  "MingLiU": "细明体",
  "MingLiU-ExtB": "细明体-ExtB",
  "PMingLiU-ExtB": "新细明体-ExtB",
  "DFKai-SB": "标楷体",
  "Segoe UI": "Segoe UI",
  "Comic Sans MS": "Comic Sans MS",
  "Courier New": "Courier New",
  "Verdana": "Verdana",
  "Tahoma": "Tahoma",
  "Trebuchet MS": "Trebuchet MS",
  "Impact": "Impact",
  "Georgia": "Georgia",
  "Malgun Gothic": "Malgun Gothic",
  "Leelawadee UI": "Leelawadee UI",
  "Gadugi": "Gadugi",
  "Javanese Text": "Javanese Text",
  "Segoe MDL2 Assets": "Segoe MDL2 Assets",
  "Segoe Print": "Segoe Print",
  "Segoe Script": "Segoe Script",
  "Sitka": "Sitka",
  "Yu Gothic": "Yu Gothic",
  "Yu Gothic UI": "Yu Gothic UI",
  "Hololens MDL2 Assets": "Hololens MDL2 Assets",
  "DengXian": "等线",
  "YouYuan": "幼圆",
  
  // FangZheng (Founder) Fonts
  "FZYaoTi": "方正姚体",
  "FZShuTi": "方正舒体",
  
  // Sinotype (ST) Fonts
  "STXihei": "华文细黑",
  "STKaiti": "华文楷体",
  "STSong": "华文宋体",
  "STFangsong": "华文仿宋",
  "STZhongsong": "华文中宋",
  "STCaiyun": "华文彩云",
  "STAmber": "华文琥珀",
  "STXingkai": "华文行楷",
  "STXinwei": "华文新魏",
  "STHupo": "华文琥珀",
  "STLiti": "华文隶书",
  "STHeiti": "华文黑体",
  
  // Other Common Fonts
  "Lantinghei SC": "兰亭黑-简",
  "Hanyi": "汉仪",
  "PingFang SC": "苹方",
  "Hiragino Sans GB": "冬青黑体",
  
  // Adobe / Source Han
  "Source Han Sans SC": "思源黑体",
  "Source Han Serif SC": "思源宋体",
  "Noto Sans SC": "Noto黑体",
  "Noto Serif SC": "Noto宋体",
};

const nameCache = new Map<string, string>();

export function getLocalizedFontName(family: string): string {
  if (nameCache.has(family)) {
    return nameCache.get(family)!;
  }

  let result = family;

  // Direct match
  if (fontNameMapping[family]) {
    result = fontNameMapping[family];
  } else {
    // Case-insensitive match attempt
    const lowerFamily = family.toLowerCase();
    const key = Object.keys(fontNameMapping).find(k => k.toLowerCase() === lowerFamily);
    if (key) {
      result = fontNameMapping[key];
    } else {
      // Common prefix handling for Chinese fonts that might have variations
      // e.g. "STHeiti Light" -> "华文黑体 Light"
      // This is a simple heuristic and might need refinement
      for (const [eng, chn] of Object.entries(fontNameMapping)) {
        if (family.startsWith(eng + " ")) {
          result = family.replace(eng, chn);
          break;
        }
      }
    }
  }

  nameCache.set(family, result);
  return result;
}
