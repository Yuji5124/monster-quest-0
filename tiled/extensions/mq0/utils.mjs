// MQ0 Tiled Extension - shared logging / dialog / error-safety helpers.
import Config from "./config.mjs";

function log(message) {
    // ライフサイクルの主要ログは debug=false でも常に出す(要件15の例に合わせる)。
    tiled.log("[MQ0] " + message);
}

function debugLog(message) {
    if (Config.debug) {
        tiled.log("[MQ0][debug] " + message);
    }
}

function warn(message) {
    tiled.warn("[MQ0] " + message);
}

function error(message) {
    tiled.error("[MQ0] " + message);
}

function alert(message, title) {
    tiled.alert(message, title || "MQ0");
}

function messageOf(err) {
    if (!err) return "unknown error";
    return err.message ? err.message : String(err);
}

// Tiled Scripting APIのバージョン差(File系メソッド名など)で例外が出ても
// 拡張全体を落とさず、ユーザーへはダイアログで、詳細はConsoleへ通知する。
function safeRun(label, fn) {
    try {
        return fn();
    } catch (e) {
        var msg = messageOf(e);
        error(label + " failed: " + msg);
        alert("MQ0: " + label + " でエラーが発生しました。\n\n" + msg, "MQ0 Error");
        return undefined;
    }
}

const MQ0Utils = {
    log: log,
    debugLog: debugLog,
    warn: warn,
    error: error,
    alert: alert,
    messageOf: messageOf,
    safeRun: safeRun
};

export default MQ0Utils;
