// MQ0 Tiled Extension - entry point.
// 責務: MQ0メニュー登録 / 各Action登録 / 各モジュール呼び出し / エラーハンドリング / ログ出力。
// ロジック本体は config.mjs / utils.mjs / validator.mjs / ai-review.mjs / requirements.mjs /
// reference-image.mjs / review-package.mjs に置く。
//
// Tiled 1.8+ の公式スクリプト拡張は複数ファイル分割に .mjs + import/export を使う
// (CommonJSのrequire()には対応していない)。このファイルもその方式に合わせている。
import Config from "./config.mjs";
import Utils from "./utils.mjs";
import Validator from "./validator.mjs";
import AIReview from "./ai-review.mjs";
import Requirements from "./requirements.mjs";
import ReferenceImage from "./reference-image.mjs";
import ReviewPackage from "./review-package.mjs";

function buildSettingsText() {
    return [
        "MQ0 Extension Settings",
        "",
        "version: " + Config.version,
        "aiMode: " + Config.aiMode,
        "debug: " + Config.debug,
        "requirementsPaths: " + Config.requirementsPaths.join(", "),
        "referenceImagePath: " + (Config.referenceImagePath || "(未設定)")
    ].join("\n");
}

function registerActions() {
    var validateMapAction = tiled.registerAction("MQ0.ValidateMap", function () {
        Utils.safeRun("Validate Map", function () {
            Utils.log("Validate Map started.");
            var result = Validator.validateMap();
            if (result.mapName) Utils.log("Map loaded: " + result.mapName);
            Utils.alert(result.summary, "MQ0 Map Validation");
        });
    });
    validateMapAction.text = "Validate Map";

    var aiReviewAction = tiled.registerAction("MQ0.AIReview", function () {
        Utils.safeRun("AI Review", function () {
            Utils.log("AI Review: " + Config.aiMode.toUpperCase() + " MODE");
            var result = AIReview.runReview();
            Utils.alert(result.summary, "MQ0 AI Review");
        });
    });
    aiReviewAction.text = "AI Review";

    var buildReviewPackageAction = tiled.registerAction("MQ0.BuildReviewPackage", function () {
        Utils.safeRun("Build Review Package", function () {
            var map = Validator.getActiveMap();
            if (!map) {
                Utils.alert("開いているマップがありません。Tiledでマップを開いてから実行してください。", "MQ0 Review Package");
                return;
            }

            var built = ReviewPackage.buildReviewPackage(map);
            var preview = ReviewPackage.buildPreviewText(built);
            var proceed = (typeof tiled.confirm === "function")
                ? tiled.confirm(preview + "\n\nこの内容でエクスポートしますか?\n(" + Config.reviewPackage.outputDir + "/" + built.outputFolder + "/ へJSON保存)", "MQ0 Review Package")
                : false;

            if (!proceed) {
                Utils.log("Build Review Package: preview only (export not confirmed).");
                if (typeof tiled.confirm !== "function") {
                    Utils.alert(preview + "\n\n(このTiled版には確認ダイアログAPIがないためExportは実行していません。tools/mq0-map-ai/build-review-package.js をNodeで実行してください。)", "MQ0 Review Package");
                }
                return;
            }

            var result = ReviewPackage.exportReviewPackage(built);
            if (result.success) {
                Utils.log("Review Package exported: " + result.writtenFiles.length + " files -> " + built.outputFolder);
                Utils.alert("エクスポート完了:\n" + result.writtenFiles.join("\n"), "MQ0 Review Package");
            } else {
                Utils.error("Review Package export failed: " + result.error);
                Utils.alert(
                    "エクスポートできませんでした:\n" + result.error +
                    "\n\n代わりに以下をコマンドラインで実行してください:\n" +
                    "node tools/mq0-map-ai/build-review-package.js \"" + (map.fileName || "<mapファイルを保存してから指定してください>") + "\"",
                    "MQ0 Review Package - Export Failed"
                );
            }
        });
    });
    buildReviewPackageAction.text = "Build Review Package";

    var loadRequirementsAction = tiled.registerAction("MQ0.LoadRequirements", function () {
        Utils.safeRun("Load Requirements", function () {
            var result = Requirements.loadRequirements();
            Utils.log("Requirements found: " + result.count + " files");
            Utils.alert(result.summary, "MQ0 Load Requirements");
        });
    });
    loadRequirementsAction.text = "Load Requirements";

    var importReferenceAction = tiled.registerAction("MQ0.ImportReference", function () {
        Utils.safeRun("Import Reference", function () {
            var result = ReferenceImage.importReference();
            Utils.alert(result.summary, "MQ0 Import Reference");
        });
    });
    importReferenceAction.text = "Import Reference";

    var settingsAction = tiled.registerAction("MQ0.Settings", function () {
        Utils.safeRun("Settings", function () {
            Utils.alert(buildSettingsText(), "MQ0 Settings");
        });
    });
    settingsAction.text = "Settings";

    // MQ0 Tools...: 実TiledのGUI Hotfix(Phase 3.2)。既存Actionは一切複製せず、
    // ダイアログの各ボタンは tiled.trigger() で上記の既存Actionを呼ぶだけにする。
    var toolsAction = tiled.registerAction("MQ0.Tools", function () {
        Utils.safeRun("MQ0 Tools", function () {
            openToolsDialog();
        });
    });
    toolsAction.text = "MQ0 Tools...";
}

// 現在のマップの軽い情報だけを集める(Review Package全体は生成しない: buildReviewPackage()は
// Requirements ResolverやFile.existsを伴い重いため、ここではmap.properties()と
// ReferenceImage.extractReferenceInfo()(Tiledが既に読み込んでいるLayer情報を見るだけ)のみ使う)。
function buildToolsInfo() {
    var map = Validator.getActiveMap();
    if (!map) {
        return { mapLabel: "(開いているマップがありません)", referenceLabel: "N/A" };
    }

    var props = (typeof map.properties === "function") ? (map.properties() || {}) : {};
    var id = props.mq0MapId || "(no id)";
    var name = props.mq0MapName || (map.fileName ? String(map.fileName).replace(/\\/g, "/").split("/").pop() : "(no name)");

    var referenceLabel = "Not configured";
    try {
        var ref = ReferenceImage.extractReferenceInfo(map);
        if (ref.configured) referenceLabel = "Configured (" + ref.path + ")";
        else if (ref.layer) referenceLabel = "Layer present, no image (" + ref.layer + ")";
    } catch (e) { /* 情報表示だけなので、失敗してもダイアログ自体は開けるようにする */ }

    return { mapLabel: id + " / " + name, referenceLabel: referenceLabel };
}

// Tiled 1.12.2確認済み: tiled.extendMenu()はtiled.menusに既にあるメニューしか拡張できず、
// トップレベルの新規メニューやサブメニューは作れない(公式Scripting API制約)。そのため
// MQ0の入口は「Map メニュー(無ければProject/Edit)へ1項目追加し、押すとDialogが開く」形にする。
var activeToolsDialog = null;

function openToolsDialog() {
    if (typeof Dialog !== "function") {
        Utils.alert(
            "このTiledバージョンには Dialog API がありません。各機能は Edit > Preferences からMQ0の各Actionへ" +
            "ショートカットを割り当てて個別にご利用ください。",
            "MQ0 Map Tools"
        );
        return;
    }

    var info = buildToolsInfo();
    var dialog = new Dialog("MQ0 Map Tools");
    activeToolsDialog = dialog; // JS側の参照を保持し、ボタンのclickハンドラが生きたままにする。

    dialog.addHeading("MQ0 Map Tools");
    dialog.addNewRow();
    dialog.addLabel("Map: " + info.mapLabel);
    dialog.addNewRow();
    dialog.addLabel("Validation: Not checked");
    dialog.addNewRow();
    dialog.addLabel("AI Mode: " + Config.aiMode);
    dialog.addNewRow();
    dialog.addLabel("Reference: " + info.referenceLabel);
    dialog.addNewRow();
    dialog.addSeparator();
    dialog.addNewRow();

    function addTriggerButton(label, actionId) {
        var button = dialog.addButton(label);
        button.clicked.connect(function () {
            tiled.trigger(actionId);
        });
        dialog.addNewRow();
    }

    // Mapを書き換える処理は一切ここに置かない。既存の登録済みActionをtrigger()するだけ。
    addTriggerButton("Validate Map", "MQ0.ValidateMap");
    addTriggerButton("AI Review", "MQ0.AIReview");
    addTriggerButton("Build Review Package", "MQ0.BuildReviewPackage");
    dialog.addSeparator();
    dialog.addNewRow();
    addTriggerButton("Load Requirements", "MQ0.LoadRequirements");
    addTriggerButton("Import Reference", "MQ0.ImportReference");
    addTriggerButton("Settings", "MQ0.Settings");
    dialog.addSeparator();
    dialog.addNewRow();

    var closeButton = dialog.addButton("Close");
    closeButton.clicked.connect(function () {
        dialog.accept();
    });

    dialog.show();
}

// "MQ0" は既存メニュー名と一致しないため tiled.extendMenu("MQ0", ...) では新規メニューを
// 作れない(公式APIはtiled.menusに載っている既存メニューの拡張のみサポート)。実在するメニューの
// 中から候補を順に試し、見つかった最初のものへ "MQ0 Tools..." を追加する。
function registerToolsMenuEntry() {
    var menus = Array.isArray(tiled.menus) ? tiled.menus : [];
    Utils.log("Available menus: " + (menus.length ? menus.join(", ") : "(tiled.menus is unavailable in this Tiled version)"));

    var candidates = ["Map", "Project", "Edit"];
    for (var i = 0; i < candidates.length; i++) {
        var name = candidates[i];
        if (menus.indexOf(name) === -1) continue;
        try {
            tiled.extendMenu(name, [
                { separator: true },
                { action: "MQ0.Tools" }
            ]);
            Utils.log("MQ0 Tools added to " + name + " menu.");
            return true;
        } catch (e) {
            Utils.warn("Failed to add MQ0 Tools to \"" + name + "\" menu: " + Utils.messageOf(e));
        }
    }

    Utils.warn(
        "No suitable existing menu (Map/Project/Edit) was found for the MQ0 Tools entry. " +
        "The \"MQ0.Tools\" action is still registered - assign it a keyboard shortcut manually " +
        "(Edit > Preferences > Keyboard, naming may vary by version), or trigger it from another script with tiled.trigger(\"MQ0.Tools\")."
    );
    return false;
}

(function initialize() {
    try {
        registerActions();
    } catch (e) {
        Utils.error("Failed to register actions: " + Utils.messageOf(e));
        return;
    }

    // ログの並びは以下の4行で統一する(実機コンソールでの確認しやすさのため):
    //   [MQ0] Extension loaded.
    //   [MQ0] Tiled version: ...
    //   [MQ0] Available menus: ...
    //   [MQ0] MQ0 Tools added to Map menu.
    Utils.log("Extension loaded.");
    Utils.log("Tiled version: " + (typeof tiled.version === "string" ? tiled.version : "unknown"));

    try {
        registerToolsMenuEntry(); // 内部で "Available menus: ..." と "MQ0 Tools added to X menu." を出す。
    } catch (e) {
        // メニューへの追加に失敗しても、Actionそのものは使えるままなので拡張全体は落とさない。
        Utils.warn("Failed to set up the MQ0 Tools menu entry: " + Utils.messageOf(e));
    }

    Utils.log("Config: version=" + Config.version + ", aiMode=" + Config.aiMode + ".");
})();
