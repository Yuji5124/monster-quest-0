// Adapts a raw Tiled JSON map (.tmj, already JSON.parse'd) into the same
// duck-typed shape that tiled/extensions/mq0's own scripts expect from
// `tiled.activeAsset` when running inside Tiled itself. This is what lets the
// CLI reuse validator.js / requirements.js / review-package.js unmodified.
"use strict";

function propsArrayToDict(propsArray) {
    var dict = {};
    (propsArray || []).forEach(function (p) { dict[p.name] = p.value; });
    return dict;
}

function adaptObject(raw) {
    return {
        name: raw.name || "",
        // Tiled's JSON format still calls the object's Class field "type" on disk.
        type: raw.type || "",
        className: undefined,
        x: raw.x, y: raw.y,
        width: raw.width || 0, height: raw.height || 0,
        properties: function () { return propsArrayToDict(raw.properties); }
    };
}

function adaptLayer(raw) {
    var layer = {
        name: raw.name,
        visible: raw.visible !== undefined ? raw.visible : true,
        opacity: raw.opacity !== undefined ? raw.opacity : 1,
        isTileLayer: raw.type === "tilelayer",
        isObjectLayer: raw.type === "objectgroup",
        isImageLayer: raw.type === "imagelayer",
        isGroupLayer: raw.type === "group"
    };
    if (layer.isObjectLayer) {
        layer.objects = (raw.objects || []).map(adaptObject);
    }
    if (layer.isImageLayer) {
        layer.image = raw.image || "";
        layer.offsetX = raw.offsetx || 0;
        layer.offsetY = raw.offsety || 0;
    }
    if (layer.isGroupLayer) {
        layer.layers = (raw.layers || []).map(adaptLayer);
    }
    return layer;
}

function adaptMap(raw, absoluteFilePath) {
    return {
        isTileMap: true,
        fileName: absoluteFilePath,
        width: raw.width,
        height: raw.height,
        tileWidth: raw.tilewidth,
        tileHeight: raw.tileheight,
        tilesets: (raw.tilesets || []).map(function (t) {
            return { name: t.name || String(t.source || "(external)").replace(/^.*[\\/]/, "") };
        }),
        layers: (raw.layers || []).map(adaptLayer),
        properties: function () { return propsArrayToDict(raw.properties); }
    };
}

module.exports = { adaptMap: adaptMap };
