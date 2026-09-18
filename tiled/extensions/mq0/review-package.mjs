// MQ0 Tiled Extension - Review Package builder (Phase 3.1).
//
// Assembles Map Snapshot + Requirements resolution + Reference info + structured
// Validation into ONE JSON-serializable object ("Review Package"). This module:
//   - never calls any external AI API (OpenAI/Anthropic/ChatGPT etc.)
//   - never modifies the Tiled map
//   - only ASSEMBLES data; actual file writing is done by the caller
//     (main.mjs via Tiled's TextFile, or tools/mq0-map-ai/build-review-package.js via fs)
import Config from "./config.mjs";
import Validator from "./validator.mjs";
import Requirements from "./requirements.mjs";
import ReferenceImage from "./reference-image.mjs";

function nowIso() {
    try { return new Date().toISOString(); } catch (e) { return ""; }
}

function sanitizeFolderName(name) {
    var s = String(name || "").trim();
    s = s.replace(/[^A-Za-z0-9_\-]+/g, "_");
    s = s.replace(/^_+|_+$/g, "");
    return s || "unnamed_map";
}

// mapIdまたはmapName単位でReview Packageを扱えるようにする(§1)。
// 日時等を含めた一時フォルダにはしない(生成のたびに同じ場所を更新する設計)。
function outputFolderNameFor(mapProps, fallbackFileName) {
    if (mapProps && mapProps.mq0MapId) return sanitizeFolderName(mapProps.mq0MapId);
    if (mapProps && mapProps.mq0MapName) return sanitizeFolderName(mapProps.mq0MapName);
    var base = String(fallbackFileName || "unnamed_map").replace(/\.(tmx|tmj)$/i, "");
    return sanitizeFolderName(base);
}

// map: Tiledのアクティブアセット、または(Node CLIから渡される)同じ形をしたオブジェクト。
// null/undefinedの場合は「マップが開かれていない」パッケージを返す(クラッシュしない)。
// options.requirementsIndexOverride: Node CLI側の実ディレクトリ走査結果を差し込むためのフック。
function buildReviewPackage(map, options) {
    options = options || {};
    var validation = Validator.validateMap(map);
    var snapshot = validation.snapshot;
    var props = (snapshot && snapshot.properties) || {};
    var resolvedRequirements = Requirements.resolveForMap(props, options.requirementsIndexOverride);
    // Reference情報はSnapshot(=Tiled Map自体の情報)には含めず、ここでReview Packageの
    // 一部として独立に合成する(buildSnapshot()とbuildReviewPackage()の責務分離)。
    var reference = ReferenceImage.extractReferenceInfo(map);

    var mapSourcePath = (validation.map && validation.map.fileName)
        ? Requirements.toRepoRelativePath(validation.map.fileName)
        : null;

    var structuredValidation = validation.structured;
    // mq0RequirementFile自体は設定されていても、指す先が実在しないケースは
    // validator.mjs(ファイルシステムに触れない)ではなくここで検出する。
    if (resolvedRequirements.primary && resolvedRequirements.primary.category === "explicit" && resolvedRequirements.primary.exists === false) {
        structuredValidation = {
            errors: structuredValidation.errors,
            warnings: structuredValidation.warnings.concat([{
                level: "WARN",
                code: "MQ0_REQUIREMENT_FILE_NOT_FOUND",
                message: "mq0RequirementFile (\"" + resolvedRequirements.primary.path + "\") がリポジトリ内に見つかりません。",
                target: "property:mq0RequirementFile"
            }]),
            info: structuredValidation.info
        };
    }

    var pkg = {
        schemaVersion: Config.reviewPackage.schemaVersion,
        generatedAt: nowIso(),
        project: { id: "MQ0", title: "Monster Quest 0" },
        map: snapshot ? {
            id: snapshot.map.id,
            name: snapshot.map.name,
            type: snapshot.map.type,
            chapter: snapshot.map.chapter,
            width: snapshot.map.width,
            height: snapshot.map.height,
            tileWidth: snapshot.map.tileWidth,
            tileHeight: snapshot.map.tileHeight,
            sourcePath: mapSourcePath
        } : null,
        layers: snapshot ? snapshot.layers : [],
        objects: snapshot ? snapshot.objects : [],
        tilesets: snapshot ? snapshot.tilesets : [],
        properties: props,
        requirements: resolvedRequirements,
        reference: reference,
        validation: structuredValidation,
        // 将来AIレビュー/提案(§16, §17)のための予約領域。今回はnullのまま。
        // Map変更処理はここには一切含めない(Suggestion/Preview/Applyは別の仕組みにする)。
        extensionPoints: {
            tileData: "Full tile GID grids are intentionally omitted from this package - read the .tmj/.tmx itself for that.",
            aiSuggestions: null
        }
    };

    return {
        package: pkg,
        outputFolder: outputFolderNameFor(props, validation.mapName),
        validationLines: validation.lines
    };
}

function buildPreviewText(built) {
    var pkg = built.package;
    var out = ["MQ0 Review Package", ""];

    out.push("Map");
    out.push("  " + (pkg.map ? (pkg.map.id || "(no id)") + " / " + (pkg.map.name || "(no name)") : "(開いているマップがありません)"));

    out.push("Requirements");
    out.push("  Selected: " + pkg.requirements.selected.length);
    out.push("  Candidates: " + pkg.requirements.candidates.length);

    out.push("Reference");
    if (pkg.reference.configured) {
        out.push("  Configured: Yes (" + pkg.reference.path + ")");
    } else if (pkg.reference.layer) {
        out.push("  Configured: No (layer present, no image set: " + pkg.reference.layer + ")");
    } else {
        out.push("  Configured: No");
    }

    out.push("Validation");
    out.push("  Errors: " + pkg.validation.errors.length);
    out.push("  Warnings: " + pkg.validation.warnings.length);

    out.push("Schema");
    out.push("  " + pkg.schemaVersion);

    out.push("Output");
    out.push("  " + Config.reviewPackage.outputDir + "/" + built.outputFolder + "/ (not written yet)");

    return out.join("\n");
}

// Tiledの TextFile APIでJSONを書き出す(可能な場合のみ)。書き込みAPIが使えない/
// 失敗した場合はクラッシュさせず、呼び出し側(main.mjs)がNode CLIへの案内を出せるよう
// success:false を返す。「自動上書き事故」を避けるため、出力先に別マップのReview
// Packageが既にある場合は書き込みを拒否する。
function readExistingIdentity(dirPath) {
    try {
        if (typeof File === "undefined" || typeof File.exists !== "function" || typeof TextFile === "undefined") return null;
        var packagePath = dirPath + "/review-package.json";
        if (!File.exists(packagePath)) return null;
        var f = new TextFile(packagePath, TextFile.ReadOnly);
        var content = typeof f.readAll === "function" ? f.readAll() : "";
        if (typeof f.close === "function") f.close();
        var parsed = JSON.parse(content);
        return parsed && parsed.map ? { id: parsed.map.id, name: parsed.map.name } : null;
    } catch (e) {
        return null;
    }
}

function writeJsonFile(fullPath, obj) {
    var f = new TextFile(fullPath, TextFile.WriteOnly);
    f.write(JSON.stringify(obj, null, 2));
    if (typeof f.commit === "function") f.commit();
    else if (typeof f.close === "function") f.close();
}

function exportReviewPackage(built) {
    var root = Requirements.resolveRepoRoot();
    if (!root) {
        return { success: false, error: "リポジトリのルートを自動検出できませんでした(tiled/mq0.tiled-project を Tiled Project として開いてください)。", writtenFiles: [] };
    }
    if (typeof TextFile === "undefined") {
        return { success: false, error: "このTiledバージョンにはTextFile書き込みAPIがありません。代わりに tools/mq0-map-ai/build-review-package.js をNodeで実行してください。", writtenFiles: [] };
    }

    var dir = root + "/" + Config.reviewPackage.outputDir + "/" + built.outputFolder;
    var existing = readExistingIdentity(dir);
    var pkgMap = built.package.map || { id: "", name: "" };
    if (existing && (existing.id !== pkgMap.id || existing.name !== pkgMap.name)) {
        return {
            success: false,
            error: "出力先 " + dir + " には別マップのReview Packageが既にあります(id=" + existing.id + ", name=" + existing.name + ")。mq0MapIdを設定するか、フォルダを整理してから再実行してください。",
            writtenFiles: []
        };
    }

    try {
        if (typeof File !== "undefined" && typeof File.makePath === "function") {
            File.makePath(dir);
        }
        var written = [];
        writeJsonFile(dir + "/map-snapshot.json", {
            map: built.package.map, layers: built.package.layers,
            objects: built.package.objects, tilesets: built.package.tilesets, properties: built.package.properties
        });
        written.push(dir + "/map-snapshot.json");
        writeJsonFile(dir + "/requirements.json", built.package.requirements);
        written.push(dir + "/requirements.json");
        writeJsonFile(dir + "/reference.json", built.package.reference);
        written.push(dir + "/reference.json");
        writeJsonFile(dir + "/review-package.json", built.package);
        written.push(dir + "/review-package.json");
        return { success: true, error: null, writtenFiles: written };
    } catch (e) {
        var msg = (e && e.message) ? e.message : String(e);
        return { success: false, error: msg, writtenFiles: [] };
    }
}

const MQ0ReviewPackage = {
    buildReviewPackage: buildReviewPackage,
    buildPreviewText: buildPreviewText,
    exportReviewPackage: exportReviewPackage,
    outputFolderNameFor: outputFolderNameFor
};

export default MQ0ReviewPackage;
