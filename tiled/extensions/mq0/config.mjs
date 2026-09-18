// MQ0 Tiled Extension - Settings (Phase 3.1: converted to a real Tiled ES module).
// APIキー等の秘匿情報は絶対にここへ書かない(Phase 3でも同じ方針。実APIキーは
// tools/mq0-map-ai 側でも環境変数からしか読まない。ここにもRepositoryにも保存しない)。
const MQ0Config = {
    version: "0.3.1",
    // "mock": 常にMock AI Review(Phase 1/2から無変更)。
    // "real": Tiled自身は外部AIを呼ばず、tools/mq0-map-ai/review-map.js --provider real が
    //         書き出した tools/mq0-map-ai/reviews/<map>/ai-review.json をTiledから確認表示する。
    //         結果が無い場合はWARNしてMockへ自動フォールバックする。
    aiMode: "mock",
    debug: true,

    requirementsPaths: ["docs"],

    // Phase 2: docs/INDEX.md を実監査した結果をcategory/priorityつきで反映した厳選リスト。
    // 「存在するとAIが判断してよい仕様書」の正本はこの配列(+Node CLI側の実ディレクトリ走査)。
    // 新しいSPECを追加した場合はここに1行足すだけでRequirements Resolverの対象になる。
    // category: "map-flow" > "story" > "common" が自動選定(selected)の主対象。
    //           "root" / "meta" / "system" は存在確認はするがscoreが低く、通常はcandidatesに留まる。
    requirementsIndex: [
        { path: "README.md", category: "root", priority: 15 },
        { path: "CLAUDE.md", category: "root", priority: 15 },

        { path: "docs/PROJECT_STATUS.md", category: "meta", priority: 10 },
        { path: "docs/INDEX.md", category: "meta", priority: 10 },
        { path: "docs/GAME_SPEC.md", category: "meta", priority: 10 },
        { path: "docs/CREATIVE_DIRECTION.md", category: "meta", priority: 10 },
        { path: "docs/CURRENT_WORK.md", category: "meta", priority: 10 },
        { path: "docs/CONTENT_MATRIX.md", category: "meta", priority: 10 },
        { path: "docs/ROADMAP.md", category: "meta", priority: 10 },

        { path: "docs/MAP_FLOW_SPEC.md", category: "map-flow", priority: 80 },

        { path: "docs/OPENING_SPEC.md", category: "story", priority: 60 },
        { path: "docs/STORY_FLOW.md", category: "story", priority: 60 },
        { path: "docs/GLITCH_SPEC.md", category: "story", priority: 60 },

        { path: "docs/NPC_SPEC.md", category: "common", priority: 40 },
        { path: "docs/BATTLE_SPEC.md", category: "common", priority: 40 },
        { path: "docs/CHARACTER_GROWTH.md", category: "common", priority: 40 },
        { path: "docs/MAGIC_SPEC.md", category: "common", priority: 40 },
        { path: "docs/MONSTER_SPEC.md", category: "common", priority: 40 },
        { path: "docs/ITEM_EQUIPMENT_SPEC.md", category: "common", priority: 40 },
        { path: "docs/CARD_SPEC.md", category: "common", priority: 40 },
        { path: "docs/SAVE_FLAG_SPEC.md", category: "common", priority: 40 },

        { path: "docs/UI_INPUT_SPEC.md", category: "system", priority: 20 },
        { path: "docs/AUDIO_SPEC.md", category: "system", priority: 20 },
        { path: "docs/IMAGE_SPEC.md", category: "system", priority: 20 },
        { path: "docs/ASSET_INDEX.md", category: "system", priority: 20 },
        { path: "docs/PHASER_ARCHITECTURE.md", category: "system", priority: 20 },
        { path: "docs/DATA_CONTRACTS.md", category: "system", priority: 20 },
        { path: "docs/EVENT_SYSTEM_SPEC.md", category: "system", priority: 20 },
        { path: "docs/NAMING_CONVENTIONS.md", category: "system", priority: 20 },
        { path: "docs/REPO_STRUCTURE.md", category: "system", priority: 20 },
        { path: "docs/PERFORMANCE_BUDGET.md", category: "system", priority: 20 },
        { path: "docs/DEFINITION_OF_DONE.md", category: "system", priority: 20 },
        { path: "docs/QA_SPEC.md", category: "system", priority: 20 },
        { path: "docs/TBD_REGISTRY.md", category: "system", priority: 20 },
        { path: "docs/CHANGE_CONTROL.md", category: "system", priority: 20 }
    ],

    // Phase 2: Requirements Resolver / Review Package builderの調整値。
    reviewPackage: {
        schemaVersion: "0.2.0",
        outputDir: "tools/mq0-map-ai/review-packages",
        topNRequirements: 5,
        // このscore未満(root/meta/systemのみのcategory)は「存在するが自動選定はしない」候補止まり。
        minRequirementScore: 30
    },

    referenceImagePath: null,
    referenceImageExtensions: ["png", "jpg", "jpeg", "webp"],

    // Phase 3: AI Review Result(実Providerの結果)の置き場所。パスだけをTiled/Nodeで
    // 共有し、実際のAPI呼び出しはtools/mq0-map-ai側(Node)でのみ行う。
    aiReview: {
        resultsDir: "tools/mq0-map-ai/reviews",
        schemaVersion: "0.1.0"
    },

    // Phase 1.5: MQ0標準Layer構成。tiled/maps/mq0_test_map.tmj もこの綴りで作成する。
    // 実際のLayer種別(Tile/Object/Image)はvalidator.mjs側のcollectLayers()参照。
    standardLayers: {
        reference: "Reference", // Image Layer推奨(§8)
        ground: "Ground",
        terrain: "Terrain",
        buildings: "Buildings",
        collision: "Collision",
        events: "Events"        // Object Layer
    },

    // Phase 1.5: MQ0標準Object種別(class/typeフィールドに設定する値)。
    standardObjectTypes: {
        playerSpawn: "playerSpawn",
        exit: "exit",
        npc: "npc",
        event: "event",
        treasure: "treasure"
    },

    // MQ0本編はまだTiledでマップを作っていないため命名規約が未確立。
    // ここに集約しておき、実マップの命名が判明した時点でこの配列だけ調整する。
    // Layer名・Object名/classの両方を、この配列に対する部分一致(大文字小文字無視)で判定する。
    naming: {
        playerSpawn: ["spawn", "playerspawn", "entry", "start"],
        exit: ["exit", "transition", "door", "warp"],
        collision: ["collision", "collisions", "wall", "walls", "blocking"],
        npc: ["npc"],
        treasure: ["treasure", "chest"],
        event: ["event"],
        ground: ["ground"],
        terrain: ["terrain"],
        buildings: ["buildings", "building"],
        reference: ["reference", "ref_"]
    },

    // §10 Map Metadata で使う Custom Property キー。
    mapMetadataKeys: [
        "mq0MapId",
        "mq0MapName",
        "mq0MapType",
        "mq0Chapter",
        "mq0RecommendedWidth",
        "mq0RecommendedHeight",
        "mq0RequirementFile"
    ],

    // Phase 1.5: Validate Mapの必須(FAIL)/推奨(WARN)/情報(INFO)区分。
    // 「MQ0標準構造」そのものの定義はここと standardLayers/standardObjectTypes に集約する。
    validation: {
        requiredLayers: ["ground", "collision", "events"],
        recommendedLayers: ["terrain", "buildings"],
        infoLayers: ["reference"],
        requiredObjects: ["playerSpawn", "exit"],
        recommendedObjects: ["npc", "treasure"],
        infoObjects: ["event"],
        requiredProperties: ["mq0MapId", "mq0MapName", "mq0MapType"],
        recommendedProperties: ["mq0Chapter", "mq0RequirementFile"]
    }
};

export default MQ0Config;
