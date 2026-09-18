// MQ0 Tiled Extension - Requirements Index & Resolver (Phase 3.1: local filesystem
// only, no GitHub API). This module only DETECTS existing Markdown files; it never
// invents, guesses, or fabricates a requirement that isn't already in the repo.
import Config from "./config.mjs";

// tiled/mq0.tiled-project を開いている前提で、そこから2階層上をリポジトリルートとみなす。
function resolveRepoRoot() {
    var projectPath = (typeof tiled !== "undefined") ? tiled.projectFilePath : "";
    if (!projectPath) return null;
    var normalized = String(projectPath).replace(/\\/g, "/");
    var lastSlash = normalized.lastIndexOf("/");
    if (lastSlash === -1) return null;
    var projectDir = normalized.substring(0, lastSlash); // .../tiled
    var rootSlash = projectDir.lastIndexOf("/");
    if (rootSlash === -1) return null;
    return projectDir.substring(0, rootSlash); // リポジトリルート
}

function fileExists(path) {
    try {
        return typeof File !== "undefined" && typeof File.exists === "function" && File.exists(path);
    } catch (e) {
        return false;
    }
}

function lastModifiedOf(path) {
    try {
        if (typeof File !== "undefined" && typeof File.lastModified === "function") {
            return File.lastModified(path);
        }
    } catch (e) { /* このTiled版にはAPIが無い可能性がある。null扱いにする。 */ }
    return null;
}

// 絶対パスをリポジトリルートからの相対パスへ変換する。ルートが分からない/一致しない場合は
// せめてファイル名だけを返し、Windowsのユーザー固有絶対パスをそのまま漏らさないようにする。
function toRepoRelativePath(absPath) {
    if (!absPath) return null;
    var root = resolveRepoRoot();
    var normalized = String(absPath).replace(/\\/g, "/");
    if (root) {
        var normRoot = String(root).replace(/\\/g, "/");
        if (normalized.toLowerCase().indexOf(normRoot.toLowerCase()) === 0) {
            return normalized.substring(normRoot.length).replace(/^\/+/, "");
        }
    }
    var parts = normalized.split("/");
    return parts[parts.length - 1];
}

// config.jsの厳選リスト(requirementsIndex)を、実在確認つきで返す。
// Tiledのスクリプト環境ではディレクトリ一覧APIが不確実なため、ここでは「候補は
// 事前に列挙し、存在有無だけをFile.existsで確認する」方式を取る(Node CLI側は
// 実ディレクトリ走査で候補自体も広げられる。tools/mq0-map-ai/lib/requirements-scan.js参照)。
function getRequirementsIndex() {
    var root = resolveRepoRoot();
    return Config.requirementsIndex.map(function (entry) {
        var full = root ? root + "/" + entry.path : null;
        return {
            path: entry.path,
            category: entry.category,
            priority: entry.priority,
            exists: full ? fileExists(full) : false
        };
    });
}

function scoreCandidate(entry, props) {
    var reasons = [];
    var score = entry.priority || 0;
    var mapId = props && props.mq0MapId ? String(props.mq0MapId).toLowerCase() : "";
    var mapName = props && props.mq0MapName ? String(props.mq0MapName).toLowerCase() : "";
    var pathLower = String(entry.path).toLowerCase();

    if (mapId && pathLower.indexOf(mapId) !== -1) {
        score += 500;
        reasons.push("path matches mq0MapId");
    }
    if (mapName && pathLower.indexOf(mapName) !== -1) {
        score += 500;
        reasons.push("path matches mq0MapName");
    }
    reasons.push("category:" + entry.category);

    return { score: score, reason: reasons.join(", ") };
}

// 現在のマップに関連しそうな仕様書を選ぶ。優先順位:
//   1. mq0RequirementFile が明示されていれば最優先(存在しなくてもprimaryとして報告し、
//      存在チェック結果はexistsフラグとvalidationのWARNへ委ねる)
//   2. mapId / mapName がパスに含まれるファイル
//   3. category順(map-flow > story > common)。root/meta/systemは候補止まり。
// 誤判定を隠さないよう、選ばれなかったものは全てcandidatesとして残す。
function resolveForMap(props, indexOverride) {
    props = props || {};
    var index = indexOverride || getRequirementsIndex();
    var rp = Config.reviewPackage;
    var primary = null;

    if (props.mq0RequirementFile) {
        var root = resolveRepoRoot();
        var explicitPath = String(props.mq0RequirementFile);
        var explicitExists = root ? fileExists(root + "/" + explicitPath) : false;
        primary = {
            path: explicitPath,
            sourcePath: explicitPath,
            category: "explicit",
            priority: 1000,
            reason: explicitExists ? "explicit mq0RequirementFile" : "explicit mq0RequirementFile (not found locally)",
            exists: explicitExists
        };
    }

    var scored = index.map(function (entry) {
        var s = scoreCandidate(entry, props);
        return {
            path: entry.path,
            sourcePath: entry.path,
            category: entry.category,
            priority: s.score,
            reason: s.reason,
            exists: entry.exists
        };
    });
    scored.sort(function (a, b) { return b.priority - a.priority; });

    var autoSelected = scored
        .filter(function (s) { return s.priority >= rp.minRequirementScore; })
        .slice(0, rp.topNRequirements);

    var selected = primary ? [primary].concat(autoSelected) : autoSelected;
    var selectedPaths = {};
    selected.forEach(function (s) { selectedPaths[s.path] = true; });
    var candidates = scored.filter(function (s) { return !selectedPaths[s.path]; });

    if (!primary && selected.length > 0) primary = selected[0];

    return { primary: primary, selected: selected, candidates: candidates };
}

// 既存の "Load Requirements" メニュー用。表示フォーマットはPhase 1から変更しない。
function loadRequirements() {
    var root = resolveRepoRoot();

    if (!root) {
        var lines = [
            "MQ0 Load Requirements",
            "",
            "プロジェクトのルートを自動検出できませんでした。",
            "tiled/mq0.tiled-project を Tiled Project として開いてから再実行してください。"
        ];
        return { count: 0, found: [], missing: Config.requirementsIndex.map(function (e) { return e.path; }), summary: lines.join("\n") };
    }

    var index = getRequirementsIndex();
    var found = index.filter(function (e) { return e.exists; })
        .map(function (e) { return { name: e.path.split("/").pop(), path: e.path, lastModified: lastModifiedOf(root + "/" + e.path) }; });
    var missing = index.filter(function (e) { return !e.exists; }).map(function (e) { return e.path; });

    var out = ["MQ0 Load Requirements", "", "Root: " + root,
        "Found: " + found.length + " / " + index.length, ""];

    var shown = found.slice(0, 20);
    for (var f = 0; f < shown.length; f++) out.push("FOUND    " + shown[f].path);
    if (found.length > shown.length) out.push("...ほか " + (found.length - shown.length) + "件");

    if (missing.length > 0) {
        out.push("");
        out.push("候補にあったが見つからなかったファイル (" + missing.length + "):");
        var shownMissing = missing.slice(0, 10);
        for (var m = 0; m < shownMissing.length; m++) out.push("MISSING  " + shownMissing[m]);
        if (missing.length > shownMissing.length) out.push("...ほか " + (missing.length - shownMissing.length) + "件");
    }

    return { count: found.length, found: found, missing: missing, summary: out.join("\n") };
}

const MQ0Requirements = {
    loadRequirements: loadRequirements,
    resolveRepoRoot: resolveRepoRoot,
    toRepoRelativePath: toRepoRelativePath,
    getRequirementsIndex: getRequirementsIndex,
    resolveForMap: resolveForMap
};

export default MQ0Requirements;
