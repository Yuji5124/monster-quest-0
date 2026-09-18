// MQ0 Tiled Extension - Validate Map (Phase 3.1: same required(FAIL) / recommended(WARN) /
// info(INFO) checks as before, exposed as structured {errors,warnings,info} data (with
// code/target) for reuse by review-package.mjs, on top of the existing display summary
// string. UI text output is unchanged.
//
// Responsibility boundary (kept from the Phase 2 close-out): buildSnapshot() below only
// reports what is IN the Tiled map itself (layers/objects/tilesets/properties). It does
// NOT include Reference-layer metadata, Requirements, or Validation - those are assembled
// one level up, in review-package.mjs's buildReviewPackage(), which combines this Snapshot
// with Requirements + Reference + Validation into the full Review Package.
import Config from "./config.mjs";

// mapOverride を渡した場合はそれを使う(Node CLI等、tiled.activeAssetが無い環境向け)。
// 省略時(undefined)は従来通りTiledの現在アクティブなマップを見る。
function getActiveMap(mapOverride) {
    if (mapOverride !== undefined) return mapOverride;
    var asset = (typeof tiled !== "undefined") ? tiled.activeAsset : null;
    if (asset && asset.isTileMap) return asset;
    return null;
}

function fileNameOf(map) {
    if (!map || !map.fileName) return "(未保存のマップ)";
    var normalized = String(map.fileName).replace(/\\/g, "/");
    var parts = normalized.split("/");
    return parts[parts.length - 1];
}

// GroupLayerの中も辿り、TileLayer/ObjectGroup/ImageLayerを平坦なリストへ集める。
function collectLayers(map) {
    var tileLayers = [];
    var objectLayers = [];
    var imageLayers = [];
    var allNames = [];

    function walk(layers) {
        if (!layers) return;
        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i];
            allNames.push(layer.name);
            if (layer.isTileLayer) {
                tileLayers.push(layer);
            } else if (layer.isObjectLayer) {
                objectLayers.push(layer);
            } else if (layer.isImageLayer) {
                imageLayers.push(layer);
            } else if (layer.isGroupLayer && layer.layers) {
                walk(layer.layers);
            }
        }
    }
    walk(map.layers);

    return { tileLayers: tileLayers, objectLayers: objectLayers, imageLayers: imageLayers, allNames: allNames };
}

// ObjectGroup.objects が使える版と objectCount/objectAt(i) しかない版の両方に対応する。
function objectsOf(layer) {
    if (layer.objects && typeof layer.objects.length === "number") {
        return layer.objects;
    }
    var result = [];
    var count = layer.objectCount || 0;
    for (var i = 0; i < count; i++) {
        result.push(layer.objectAt(i));
    }
    return result;
}

function collectObjects(objectLayers) {
    var all = [];
    for (var i = 0; i < objectLayers.length; i++) {
        var objs = objectsOf(objectLayers[i]);
        for (var j = 0; j < objs.length; j++) all.push(objs[j]);
    }
    return all;
}

// Tiled 1.9+ は Object "Type" を "Class" へ改称(ファイル上のフィールド名は引き続き"type")。
// className優先、無ければ旧type。
function classOf(obj) {
    if (obj.className !== undefined && obj.className !== null && obj.className !== "") return obj.className;
    return obj.type || "";
}

function matchesAny(text, candidates) {
    if (!text) return false;
    var lower = String(text).toLowerCase();
    for (var i = 0; i < candidates.length; i++) {
        if (lower.indexOf(candidates[i]) !== -1) return true;
    }
    return false;
}

function objectMatches(obj, candidates) {
    return matchesAny(obj.name, candidates) || matchesAny(classOf(obj), candidates);
}

function layerMatches(layer, candidates) {
    return matchesAny(layer.name, candidates);
}

// Asset(Map/Layer/MapObject/Tileset)は全て共通の properties() を持つが、
// Tiledバージョンにより関数/プレーンオブジェクトいずれの形もありうるため両対応する。
function propertiesOf(asset) {
    try {
        if (typeof asset.properties === "function") return asset.properties() || {};
        if (asset.properties && typeof asset.properties === "object") return asset.properties;
    } catch (e) { /* 取得できない場合は空扱いにし、呼び出し側をFAIL/WARNへ倒す */ }
    return {};
}

function hasNonEmptyProperty(props, key) {
    return props && props[key] !== undefined && props[key] !== null && String(props[key]) !== "";
}

// AI Review / Review Packageが使う、現在のマップの構造化スナップショット(§3/§7)。
// まだ外部AIへは送信しない。Tile Layerの全GIDはここへ含めない(要約のみ)。
function buildSnapshot(mapOverride) {
    var map = getActiveMap(mapOverride);
    if (!map) return null;

    var layers = collectLayers(map);
    var objects = collectObjects(layers.objectLayers);
    var props = propertiesOf(map);

    var layerSnapshot = [];
    (function walkForSnapshot(list) {
        if (!list) return;
        for (var i = 0; i < list.length; i++) {
            var l = list[i];
            var kind = l.isTileLayer ? "tile"
                : l.isObjectLayer ? "object"
                : l.isImageLayer ? "image"
                : l.isGroupLayer ? "group"
                : "unknown";
            layerSnapshot.push({ name: l.name, kind: kind, visible: l.visible !== undefined ? l.visible : true });
            if (l.isGroupLayer && l.layers) walkForSnapshot(l.layers);
        }
    })(map.layers);

    return {
        map: {
            id: props.mq0MapId !== undefined ? props.mq0MapId : "",
            name: props.mq0MapName !== undefined ? props.mq0MapName : "",
            type: props.mq0MapType !== undefined ? props.mq0MapType : "",
            chapter: props.mq0Chapter !== undefined ? props.mq0Chapter : "",
            requirementFile: props.mq0RequirementFile !== undefined ? props.mq0RequirementFile : "",
            width: map.width,
            height: map.height,
            tileWidth: map.tileWidth,
            tileHeight: map.tileHeight
        },
        layers: layerSnapshot,
        objects: objects.map(function (o) {
            return {
                name: o.name || "",
                class: classOf(o),
                x: o.x, y: o.y,
                width: o.width || 0, height: o.height || 0,
                properties: propertiesOf(o)
            };
        }),
        tilesets: (map.tilesets || []).map(function (t) { return t.name; }),
        properties: props
    };
}

function pushCheck(lines, ok, level, passMessage, failMessage, okCode, failCode, target) {
    lines.push({
        level: ok ? "PASS" : level,
        code: ok ? okCode : failCode,
        message: ok ? passMessage : failMessage,
        target: target
    });
}

function checkLayerGroup(lines, layers, keys, level) {
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var standardName = Config.standardLayers[key] || key;
        var candidates = Config.naming[key] || [standardName.toLowerCase()];
        var found = layers.tileLayers.concat(layers.objectLayers, layers.imageLayers)
            .filter(function (l) { return layerMatches(l, candidates); });
        var target = "layer:" + standardName;
        if (level === "INFO") {
            lines.push({
                level: "INFO",
                code: "MQ0_INFO_LAYER_STATUS",
                message: found.length > 0
                    ? standardName + " layer detected: " + found[0].name
                    : standardName + " layer not configured",
                target: target
            });
        } else {
            var okCode = level === "FAIL" ? "MQ0_REQUIRED_LAYER_OK" : "MQ0_RECOMMENDED_LAYER_OK";
            var failCode = level === "FAIL" ? "MQ0_REQUIRED_LAYER_MISSING" : "MQ0_RECOMMENDED_LAYER_MISSING";
            pushCheck(lines, found.length > 0, level,
                standardName + " Layer OK",
                standardName + " Layer missing (推奨名: \"" + standardName + "\")",
                okCode, failCode, target);
        }
    }
}

function checkObjectGroup(lines, objects, keys, level) {
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var standardType = Config.standardObjectTypes[key] || key;
        var candidates = Config.naming[key] || [key];
        var matched = objects.filter(function (o) { return objectMatches(o, candidates); });
        var target = "object:" + standardType;
        if (level === "INFO") {
            lines.push({
                level: "INFO",
                code: "MQ0_INFO_OBJECT_STATUS",
                message: matched.length > 0
                    ? standardType + " object detected: " + matched.length + "件"
                    : standardType + " object not placed",
                target: target
            });
        } else {
            var okCode = level === "FAIL" ? "MQ0_REQUIRED_OBJECT_OK" : "MQ0_RECOMMENDED_OBJECT_OK";
            var failCode = level === "FAIL" ? "MQ0_REQUIRED_OBJECT_MISSING" : "MQ0_RECOMMENDED_OBJECT_MISSING";
            pushCheck(lines, matched.length > 0, level,
                standardType + " object OK: " + matched.length + "件",
                standardType + " missing (Objectのname/classに \"" + standardType + "\" を含めてください)",
                okCode, failCode, target);
        }
    }
}

function checkPropertyGroup(lines, props, keys, level) {
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        var okCode, failCode;
        if (key === "mq0RequirementFile") {
            okCode = "MQ0_REQUIREMENT_FILE_OK";
            failCode = "MQ0_REQUIREMENT_FILE_MISSING";
        } else if (level === "FAIL") {
            okCode = "MQ0_REQUIRED_PROPERTY_OK";
            failCode = "MQ0_REQUIRED_PROPERTY_MISSING";
        } else {
            okCode = "MQ0_RECOMMENDED_PROPERTY_OK";
            failCode = "MQ0_RECOMMENDED_PROPERTY_MISSING";
        }
        pushCheck(lines, hasNonEmptyProperty(props, key), level,
            key + " = " + props[key],
            key + " missing",
            okCode, failCode, "property:" + key);
    }
}

// PASS/WARN/FAIL/INFOの表示用行(lines)を、Review Package向けの
// {errors, warnings, info} へ整理する。PASSはinfoへ集約する(見た目のUIは変えない)。
function toStructured(lines) {
    var errors = [], warnings = [], info = [];
    for (var i = 0; i < lines.length; i++) {
        var l = lines[i];
        var entry = { level: l.level, code: l.code || "MQ0_UNSPECIFIED", message: l.message, target: l.target || "map" };
        if (l.level === "FAIL") errors.push(entry);
        else if (l.level === "WARN") warnings.push(entry);
        else info.push(entry);
    }
    return { errors: errors, warnings: warnings, info: info };
}

function validateMap(mapOverride) {
    var map = getActiveMap(mapOverride);
    var lines = [];

    if (!map) {
        lines.push({ level: "FAIL", code: "MQ0_NO_MAP_OPEN", message: "開いているマップがありません。Tiledでマップを開いてから実行してください。", target: "map" });
        return { mapName: null, map: null, lines: lines, snapshot: null, structured: toStructured(lines), summary: buildSummary(null, lines) };
    }

    var mapName = fileNameOf(map);
    var layers = collectLayers(map);
    var objects = collectObjects(layers.objectLayers);
    var props = propertiesOf(map);
    var v = Config.validation;

    // --- 構造的な基本チェック ---
    lines.push({ level: "PASS", code: "MQ0_MAP_LOADED", message: "マップを読み込みました: " + mapName, target: "map" });
    pushCheck(lines, map.width > 0 && map.height > 0, "FAIL",
        "マップサイズ読み込みOK: " + map.width + " x " + map.height,
        "マップサイズが不正です: " + map.width + " x " + map.height,
        "MQ0_MAP_SIZE_OK", "MQ0_MAP_SIZE_INVALID", "map");
    pushCheck(lines, map.tileWidth > 0 && map.tileHeight > 0, "FAIL",
        "タイルサイズ読み込みOK: " + map.tileWidth + " x " + map.tileHeight,
        "タイルサイズが不正です: " + map.tileWidth + " x " + map.tileHeight,
        "MQ0_TILE_SIZE_OK", "MQ0_TILE_SIZE_INVALID", "map");

    var isEmpty = layers.tileLayers.length === 0 && objects.length === 0;
    pushCheck(lines, !isEmpty, "WARN",
        "マップにタイルまたはオブジェクトを検出しました。",
        "マップが空の可能性があります(タイル/オブジェクトが検出されません)。",
        "MQ0_MAP_NOT_EMPTY", "MQ0_MAP_EMPTY", "map");
    pushCheck(lines, (map.tilesets || []).length > 0, "WARN",
        "タイルセット読み込みOK: " + map.tilesets.length + "件",
        "タイルセットが1つも参照されていません(実タイルセット未確定の間は問題ありません)。",
        "MQ0_TILESET_OK", "MQ0_NO_TILESET", "map");

    // --- MQ0標準Layer構成(必須/推奨/情報) ---
    checkLayerGroup(lines, layers, v.requiredLayers, "FAIL");
    checkLayerGroup(lines, layers, v.recommendedLayers, "WARN");
    checkLayerGroup(lines, layers, v.infoLayers, "INFO");

    // --- MQ0標準Object構成(必須/推奨/情報) ---
    checkObjectGroup(lines, objects, v.requiredObjects, "FAIL");
    checkObjectGroup(lines, objects, v.recommendedObjects, "WARN");
    checkObjectGroup(lines, objects, v.infoObjects, "INFO");

    // --- MQ0標準Custom Properties(必須/推奨) ---
    checkPropertyGroup(lines, props, v.requiredProperties, "FAIL");
    checkPropertyGroup(lines, props, v.recommendedProperties, "WARN");

    return {
        mapName: mapName,
        map: map,
        layers: layers,
        objects: objects,
        lines: lines,
        snapshot: buildSnapshot(map),
        structured: toStructured(lines),
        summary: buildSummary(map, lines)
    };
}

function buildSummary(map, lines) {
    var out = ["MQ0 Map Validation", ""];
    if (map) {
        out.push("Map: " + fileNameOf(map));
        out.push("Size: " + map.width + " x " + map.height);
        out.push("Tile: " + map.tileWidth + " x " + map.tileHeight);
        out.push("");
    }
    for (var i = 0; i < lines.length; i++) {
        out.push(lines[i].level + "  " + lines[i].message);
    }
    return out.join("\n");
}

const MQ0Validator = {
    getActiveMap: getActiveMap,
    validateMap: validateMap,
    buildSnapshot: buildSnapshot,
    toStructured: toStructured
};

export default MQ0Validator;
