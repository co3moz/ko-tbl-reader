// TODO: support more stuff
const KNOWN_FORMATS = [
  {
    file: "ITEM_EXT",
    columns: [
      6, 7, 6, 7, 6, 6, 6, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2,
      2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 6, 3, 3,
    ],

    desc: [
      "id",
      "prefix",
      "baseID",
      "description",
      "",
      "resrcID",
      "iconID",
      "magicOrRare",
      "damage",
      "attackIntervalRatio",
      "hitRate",
      "evationRate",
      "maxDurability",
      "priceMultiply",
      "defense",
      "damageFire",
      "damageIce",
      "damageLightning",
      "damagePoison",
      "hpAbsorption",
      "mpDamage",
      "mpAbsorption",
      "physicalHitReflection",
      "soulBind",
      "strStatBonus",
      "staStatBonus",
      "dexStatBonus",
      "intStatBonus",
      "mpStatBonus",
      "hpBonus",
      "mpBonus",
      "fireResistance",
      "iceResistance",
      "lightningResistance",
      "magicResistance",
      "poisonResistance",
      "curseResistance",
      "effectID1",
      "effectID2",
      "needLevel",
      "needRank",
      "needTitle",
      "needStr",
      "needStamina",
      "needDex",
      "needInt",
      "needMp",
    ],
  },
  {
    file: "HELP",
    columns: [6, 5, 5, 5, 7, 7],

    desc: ["id", "levelMin", "levelMax", "class", "title", "description"],
  },
  {
    file: "ZONE",
    columns: [6, 7, 7, 7, 7, 7, 7, 7, 7, 5, 5, 7],

    desc: [
      "id",
      "terrainFile",
      "name",
      "colorMapFile",
      "lightMapFile",
      "objectDataFile",
      "",
      "miniMapFile",
      "skybox",
      "showEnemyPlayers",
      "sunDirection",
      "lightObjectFile",
    ],
  },
  {
    file: "ZONE",
    columns: [6, 7, 7, 7, 7, 7, 7, 7, 5, 5, 7],

    desc: [
      "id",
      "terrainFile",
      "name",
      "colorMapFile",
      "lightMapFile",
      "objectDataFile",
      "miniMapFile",
      "skybox",
      "showEnemyPlayers",
      "sunDirection",
      "lightObjectFile",
    ],
  },
];

exports.autoTBLFormatDetector = function (columns) {
  top: for (const u of KNOWN_FORMATS) {
    if (columns.length < u.columns.length) {
      continue top;
    }

    for (let i = 0; i < columns.length; i++) {
      if (u.columns[i] === undefined) {
        break;
      }

      if (u.columns[i] !== columns[i]) {
        continue top;
      }
    }

    return {
      file: u.file,
      desc: u.desc,
    };
  }
};
