// MQ0 Tiled Extension - Reference Image (Phase 3: read info from the current map's
// Reference layer + keep the Phase 1 file-picker Stub; no Vision AI analysis here -
// that only happens in tools/mq0-map-ai/'s Real Provider path).
import Config from "./config.mjs";
import Utils from "./utils.mjs";
import Requirements from "./requirements.mjs";

const IMAGE_FILTER = "Images (*.png *.jpg *.jpeg *.webp)";

function matchesReferenceName(layer) {
    var lower = String(layer.name || "").toLowerCase();
    for (var i = 0; i < Config.naming.reference.length; i++) {
        if (lower.indexOf(Config.naming.reference[i]) !== -1) return true;
    }
    return false;
}

// GroupLayerの中も辿る。名前が候補と一致するImage Layerを優先し、無ければ最初に
// 見つかったImage Layerにフォールバックする(§3: ReferenceはImage Layer推奨)。
function findReferenceLayer(map) {
    if (!map || !map.layers) return null;

    var byName = null;
    var any = null;

    function walk(layers) {
        if (!layers) return;
        for (var i = 0; i < layers.length; i++) {
            var l = layers[i];
            if (l.isImageLayer) {
                if (!any) any = l;
                if (!byName && matchesReferenceName(l)) byName = l;
            } else if (l.isGroupLayer && l.layers) {
                walk(l.layers);
            }
        }
    }
    walk(map.layers);

    return byName || any || null;
}

function readOffset(layer) {
    try {
        if (layer.offset && typeof layer.offset.x === "number") {
            return { x: layer.offset.x, y: layer.offset.y };
        }
        if (typeof layer.offsetX === "number") {
            return { x: layer.offsetX, y: layer.offsetY || 0 };
        }
    } catch (e) { /* Tiledバージョン差。取得できなければnullのままにする */ }
    return null;
}

// Phase 2時点では、ImageLayerから元画像の実サイズ(px)を安全に取得できるAPIを
// 確認できていない。無理に推測せず null を返し、将来Phase(実際にTiledで確認でき次第)
// で拡張できる場所として残す。
function readImageSize() {
    return null;
}

// 現在のマップのReference Layer情報を取得する(画像そのものは解析しない)。
function extractReferenceInfo(map) {
    var layer = findReferenceLayer(map);
    if (!layer) {
        return { configured: false, layer: null, path: null, opacity: null, visible: null, offset: null, size: null, analysis: null };
    }

    var rawPath = layer.image || "";
    return {
        configured: !!rawPath,
        layer: layer.name,
        path: rawPath ? Requirements.toRepoRelativePath(rawPath) : null,
        opacity: layer.opacity !== undefined ? layer.opacity : null,
        visible: layer.visible !== undefined ? layer.visible : null,
        offset: readOffset(layer),
        size: readImageSize(layer),
        analysis: null // Phase 3以降のVision AI解析結果用の予約領域(今回はnull固定)
    };
}

function importReference() {
    var lines = ["MQ0 Import Reference", "", "Mode: Stub (Vision AI 未実装)"];
    var picked = null;

    if (typeof tiled !== "undefined" && typeof tiled.promptOpenFile === "function") {
        try {
            picked = tiled.promptOpenFile(Config.referenceImagePath || "", IMAGE_FILTER, "MQ0: Import Reference Image");
        } catch (e) {
            Utils.warn("Import Reference: file picker failed (" + Utils.messageOf(e) + ")");
        }
    } else {
        Utils.warn("Import Reference: this Tiled version has no tiled.promptOpenFile API. Stub only.");
    }

    if (picked) {
        Config.referenceImagePath = picked;
        Utils.log("Import Reference: selected " + picked);
        lines.push("Selected: " + picked);
    } else {
        lines.push("No file selected (or file picker unavailable in this Tiled version).");
    }

    lines.push("");
    lines.push("Note: this only records a path. To actually apply it, add/edit a \"" + Config.standardLayers.reference + "\" Image Layer in Tiled yourself (Layer > Add Layer > Image Layer).");
    lines.push("");
    lines.push("TODO (future phases):");
    lines.push("  - Vision AI image analysis");
    lines.push("  - terrain / road / building / water / entrance detection");
    lines.push("  - MQ0 spec cross-check");
    lines.push("  - Tiled placement suggestions (Suggestion -> Preview -> Apply/Ignore)");

    return { path: picked, summary: lines.join("\n") };
}

const MQ0ReferenceImage = {
    extractReferenceInfo: extractReferenceInfo,
    importReference: importReference
};

export default MQ0ReferenceImage;
