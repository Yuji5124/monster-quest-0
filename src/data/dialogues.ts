import { SCALE_FACTOR } from "../config/display.ts";
import { STORY_FLAGS } from "../config/storyFlags.ts";
import type { DialogueAfterEvent } from "../events/BattleEventData.ts";
import { GameStateRepository } from "../systems/GameStateRepository.ts";
import { partySystem } from "../systems/PartySystem.ts";
import type { PartySystem } from "../systems/PartySystem.ts";

export interface Dialogue {
  readonly id: string;
  readonly pages: readonly string[];
  readonly afterDialogue?: DialogueAfterEvent;
}

// No.06レインランドじょう 王の間 会話強化(2026-09-27、STORY_FLOW.md確定内容を反映)。
// 王は「えらばれたゆうしゃ」だからではなく、あぶない地域を実際に越えて観察してきた旅人だから主人公を信頼し、
// No.07まじんのどうくつの調査を依頼する(主人公は自分の意思で引き受ける、という temperature を保つ)。
// タロサはこの時点でまだ正式加入していない(CHARACTER_GROWTH.md: 正式同行はNo.09いわやまのどうくつ以降)ため、
// 王が耳にした「ザボンの狩人」として言及するにとどめ、タロサの全過去・ミレイの正体・王家の事情には触れない
// (docs/NPC/04_rainland_castle.md §4・§6)。会話の区切りに`assets/characters/portraits/tarosa_archery_report.png`
// (ユーザー提供REFERENCEのバイト一致コピー)を額縁つきで挟む(PortraitInterludeDialogueEvent)。台詞本文はDIALOGUE_DRAFT。
const RAINLAND_KING_TAROSA_PORTRAIT = {
  key: "portrait.tarosa.archery_report",
  path: new URL("../../assets/characters/portraits/tarosa_archery_report.png", import.meta.url).toString(),
  // 元画像(1448×1086)のうち、タロサ本人と奥のしろが収まる範囲。右端のぼけた的は外す。
  crop: { x: 0, y: 0, width: 1300, height: 1086 },
  displayHeight: 112 * SCALE_FACTOR,
} as const;

/** まじん討伐前、王の間で最初に話しかけたときの前半(タロサの話題に入る直前まで)。 */
const RAINLAND_KING_QUEST_PAGES = [
  "おお…　よくぞ　まいった。\nそなたが　うわさの　たびびとか。",
  "ビーエの　もりや　むら、\nレインランドの　もりで　おこった\nことは　わしの　みみにも　とどいて　おる。",
  "モンスターが　ふえ、すがたを\nかえて　いく…　ただごとでは\nない。",
  "わしが　そなたを　しんじるのは、\nゆうしゃに　えらばれた\nからでは　ない。",
  "あぶない　ちいきを　じぶんの　あしで\nこえて　きた、ほんものの\nたびびとだからじゃ。",
  "じつは…　もうひとり、\nわしが　たよりに　して　いる\nものが　おる。",
] as const;

/** 一枚絵のあと、タロサへの信頼とまじんのどうくつの依頼まで。 */
const RAINLAND_KING_QUEST_CONTINUATION_PAGES = [
  "ザボンの　むらの　かりゅうどで、\nゆみの　うでまえは　ほんものだと\nききおよんで　おる。",
  "その　ものも　じぶんの　いしで、\nあちこちの　モンスターを\nおいかけて　いる　らしい。",
  "たよれる　ものが　ふえるのは\nよい　ことじゃ。\nそなたも　いつか　であうやも　しれぬ。",
  "さて…　ほんだいじゃ。\nきたに　「まじんの　どうくつ」と\nいう　ばしょが　ある。",
  "そこから　でて　くる　モンスターは、\nみたことも　ない　ほど　おおきく\nなって　いると　きく。",
  "げんいんを　たしかめ、できれば…\nそこに　いる　ものを\nしずめて　きて　ほしい。",
  "むりにとは　いわぬ。\nこれは　そなた　じしんが\nきめる　ことじゃ。",
] as const;

/** まじん討伐後、初めて城へ戻って報告したときの前半。 */
const RAINLAND_KING_REPORT_PAGES = [
  "おお…　もどったか。\nかおを　みれば　わかる。\nぶじに　やりとげたのだな。",
  "まじんの　どうくつの　いへんを\nしずめて　くれたと、つかいの\nものからも　しらせが　とどいた。",
  "くにじゅうが　よろこんで　おる。\nほんとうに　よく　もどってくれた。",
  "だが　いへんの　ねは\nまだ　のこっているようじゃ。\nつぎの　しらせも　とどいておる。",
  "ザボンの　かりゅうども\nむらへ　もどったと　きいた。\nまずは　あのものに　あってほしい。",
] as const;

/** 一枚絵のあと、タロサへのねぎらいと今後への感謝まで。 */
const RAINLAND_KING_REPORT_CONTINUATION_PAGES = [
  "いわやまの　どうくつの　むこうに\nみずうみに　しずむ　古城が\nあると　いう。",
  "そこには　デーマスと　よばれる\nものへ　つながる　しるしが\nのこされているかもしれぬ。",
  "デーマスを　しらべ、やがて\nたおすためにも　手がかりを\nもとめて　ほしい。",
  "タロサなら　いわやまの　みちを\nよく　しっているはずじゃ。\nむりにとは　いわぬ。",
  "そなたの　いしで　たずねてくれ。\nこのくにの　みらいを\nたのむ。",
] as const;

/** 報告を読み終えた後、王の間へ再び話しかけたときの短い会話。 */
const RAINLAND_KING_AFTER_REPORT_PAGES = [
  "ザボンの　タロサに\nあってみると　よい。",
  "いわやまの　むこうのことを\nしる　てがかりは　そこから\nはじまるはずじゃ。",
] as const;

// DEV_PLACEHOLDER_DIALOGUE: Phase 7の会話システム確認用。正式台詞ではなく、本編ストーリー・設定を含まない。
export const DIALOGUES: Record<string, Dialogue> = {
  // No.06レインランドじょうかまち。実際の対戦開始はNpcDefinition.jumpCardBattleIdをRainlandImageMapSceneが解決する。
  // カードの秘密・頭文字・たびのあいことばには触れず、単独の遊びとして扱う。
  npc_rainland_town_purin_card_battler: {
    id: "npc_rainland_town_purin_card_battler",
    pages: ["プリンのカードを　もっていたら\n1かいしょうぶだ！"],
  },
  // 2026-09-26 user-provided setup: 不思議なとうの更地を将来自由に使える場所として案内する。
  // 移住条件、建築、AI、ストーリー進行をここで決めない。
  npc_mysterious_tower_landkeeper: {
    id: "npc_mysterious_tower_landkeeper",
    pages: [
      "おお　きたか。\nこの　さらちは　わしが\nあずかって　おる。",
      "だが　いまは　だれも\nつかう　よていが　ない。",
      "ここは　じゆうに\nつかって　かまわんぞ。",
      "すきに　しておくれ。",
    ],
  },
  // 2026-09-27 user-provided event: はじまりのまちに立つ不思議なとうのおじいさん。一度だけ話せて、不思議なとうを世界地図へ
  // 現し、「先に行っている」と告げて暗転の間に町から去る(StartingTownScene)。上のlandkeeperと矛盾させず、
  // 更地を自由に使ってよいこと以外(移住・建築条件・塔の正体)は決めない。台詞本文はDIALOGUE_DRAFT。
  npc_start_town_tower_elder: {
    id: "npc_start_town_tower_elder",
    pages: [
      "おお　たびの　ひとか。\nちょうど　よい　ところに\nいて　くれた。",
      "わしは　ふしぎな　とうの\nさらちを　あずかって\nおる　ものじゃ。",
      "むかしから　そこに　たつ\nふるい　いしの　とうでな。\nいまは　なにも　ない　あれちだ。",
      "だが　その　さらちは\nじゆうに　つかって　よい。\nすきに　して　おくれ。",
      "とうへの　みちは\nせかいちずに　しるして　おいた。\nたしかめて　みるが　よい。",
      "わしは　さきに　いって　おる。\nおちついたら　あとから\nたずねて　きて　くれんか。",
    ],
    afterDialogue: {
      type: "npc-depart",
      eventId: "event_starting_town_tower_elder",
      npcId: "npc_start_town_tower_elder",
      flags: [STORY_FLAGS.towerElderTalked, STORY_FLAGS.mysteriousTowerRevealed],
    },
  },
  // No.02 はじまりのまち 会話第2稿(2026-09-25)。docs/NPC/01_hajimari_no_machi.md §8 の役割分担に合わせる。
  // STORY_FLOW.md: 「モンスターが増えている」「レインランド王が各地のモンスター情報を集めている」を噂として伝える。
  // やどや・ぶきや・どうぐやの店主は話しかけると店の窓(config/shops.ts)が開き、ここの台詞は「はなす」で読む。
  // 価格は仮値のため台詞に金額を書かない。ジャンカード・主人公の正体・終盤の真相には触れない。
  // 1ページ最大3行(DialogueBoxは4行分の高さ)。
  npc_start_town_inn_shopkeeper: {
    id: "npc_start_town_inn_shopkeeper",
    pages: [
      "やあ　たびの　ひと。\nここは　まちの　やどやだよ。",
      "むかしは　かいどうを　ゆく\nしょうにんたちで　まいばん\nへやが　うまって　いたんだがね。",
      "このごろ　みちに　モンスターが\nふえて　すっかり　きゃくが\nへって　しまったよ。",
      "このまえ　とまった　へいしが\nはなして　いたっけ。",
      "レインランドの　おしろには\nいろんな　ところから　はなしが\nあつまって　くるんだと。",
      "おうさまも　かくちの\nモンスターの　はなしを\nあつめて　いるそうだ。",
      "あそこなら　この　せかいの\nモンスターの　ようすも\nわかるかも　しれんな。",
      "……まあ　むりは　しないことだ。\nつかれた　からだで　いいことは\nひとつも　ないからね。",
    ],
  },
  npc_start_town_weapon_shopkeeper: {
    id: "npc_start_town_weapon_shopkeeper",
    pages: [
      "いらっしゃい。\nここの　ぶきは　ぜんぶ\nおれが　きたえた　ものだ。",
      "ここのところ　ぶきを　もとめる\nきゃくが　ふえてな。\nしょうばいは　はんじょう　だが……",
      "よろこべる　はなしじゃ　ねえ。\nそれだけ　そとが　ぶっそうに\nなったって　ことだからな。",
      "ビーエのもりで　みなれない\nやつを　みたって　いう\nきこりも　いたぜ。",
      "もりは　まちの　にしの　はずれの\nみちを　でて　しばらく　いった\nさきに　あるんだ。",
      "いいか。　ぶきは　ふりまわす\nためじゃ　ねえ。　いきて\nかえって　くるために　もつんだ。",
    ],
  },
  npc_start_town_item_shopkeeper: {
    id: "npc_start_town_item_shopkeeper",
    pages: [
      "いらっしゃい。\nたびの　したくなら\nうちに　まかせて　おくれ。",
      "……と　いいたい　ところだけど\nこのごろ　しいれの　にばしゃが\nおくれがち　でね。",
      "みちで　モンスターに　おわれて\nにもつを　おいたまま　にげて\nくる　ことも　あるんだって。",
      "かいふくやくは　いつも\nいくつか　もって　おきなよ。\nそとで　こまっても　しらないよ。",
    ],
  },
  npc_start_town_house_a_shopkeeper: {
    id: "npc_start_town_house_a_shopkeeper",
    pages: [
      "あら　こんにちは。\nうちは　ただの　いえだよ。\nおみせじゃ　ないからね。",
      "よく　まちがえて　ドアを\nたたく　たびびとが　いるのさ。",
      "モンスター？　さあねえ。\nあたしは　きょうの　ばんごはんの\nほうが　しんぱいだよ。",
    ],
  },
  npc_start_town_church_walker: {
    id: "npc_start_town_church_walker",
    pages: [
      "きょうかいの　かねが　なると\nまちの　みんなが　そらを\nみあげるんだ。",
      "このごろは　まちを　でていく\nひとの　ぶじを　いのりに\nくる　ひとが　ふえたみたい。",
      "ぼくは　かねの　おとが　すきだよ。\nなんだか　ここに　いても　いいって\nいわれてる　きが　するから。",
    ],
  },
  npc_start_town_plaza_walker: {
    id: "npc_start_town_plaza_walker",
    pages: [
      "ふんすいの　みずは\nいつも　つめたいよ。",
      "ちいさい　ころ　ここに\nコインを　なげて\nねがいごとを　したんだ。",
      "なにを　ねがったかって？\nそれは　ないしょ。\n……もう　わすれちゃったし。",
    ],
  },
  npc_start_town_south_walker: {
    id: "npc_start_town_south_walker",
    pages: [
      "みなみの　みちを　まっすぐ\nいくのが　すきなんだ。\nとちゅうで　ひきかえすけどね。",
      "まちの　そとへ　でるなら\nにしの　はずれの　みちから　だよ。",
      "もりの　ほうは　このごろ\nへんな　なきごえが　するって。\nぼくは　いかないけどね。",
    ],
  },
  // No.04ビーエのむら 会話初稿(2026-09-26)。docs/NPC/02_bie_no_mura.mdの会話バランス(山の生活／薬草・林業／
  // 家族や仕事／木こりが戻らない不安／山道の危険／レインランドへの道／普通の生活)を6人へ分ける。
  // 木こり救出の答え・ミレイ・世界の真相には触れない。村の小さな異変は、住民が「気のせいかな」と思う程度に留め、
  // 文字化け・メタ発言はしない(bieVillageAnomaly.tsと同じく本格的な異常は終盤)。
  // 2026-09-27ユーザー指示「村人を再度見直し、宿屋・武器屋・道具屋等の役割を追加」: 水車小屋・北東の家・
  // 店先の日よけの3人をshops.tsの店番へ(role: "shopkeeper")。各1ページ、生業と兼業する形で店を説明する
  // 導入ページを足し、元の生活会話はそのまま残した(「はなす」でこの配列全体を読む)。
  npc_bie_village_miller: {
    id: "npc_bie_village_miller",
    pages: [
      "こなひきの　かたわら、\nはものの　ていれも\nうけおって　いるんだ。",
      "こなひきの　しごとは\nみずぐるま　まかせさ。",
      "……だがね　このごろ　ときどき\nみずぐるまが　ほんの　いっしゅん\nとまるんだ。",
      "かわの　みずは　いつもどおり\nながれて　いるのに。\nふしぎな　ことも　あるもんだ。",
    ],
  },
  npc_bie_village_herb_drier: {
    id: "npc_bie_village_herb_drier",
    pages: [
      "やまで　とった　くさや\nきのみを　ここで\nほして　いるのよ。",
      "たびの　ひとには　ここでも\nすこしなら　わけて　あげるよ。",
      "かわいたら　レインランドの\nまちまで　はこんで　うるの。\nあそこは　ひとが　おおいからね。",
      "レインランドじょうへ　いくには\nレインランドの　もりを\nとおらなくては　いけないの。",
      "でも　このごろは　みちに\nモンスターが　でるでしょう？\nなかなか　でかけられなくて。",
    ],
  },
  npc_bie_village_farmer: {
    id: "npc_bie_village_farmer",
    pages: [
      "うちは　ひろい　いえだから\nたびの　ひとには　へやを\nかして　あげているんだ。",
      "となりの　はたけの　かぶは\nことしも　よく　そだったよ。",
      "モンスター？\nはたけを　あらす　たぬきの\nほうが　よっぽど　こまりものさ。",
    ],
  },
  npc_bie_village_neighbor: {
    id: "npc_bie_village_neighbor",
    pages: [
      "みなみの　いえの　きこりさんが\nもりへ　いったきり\nもどって　こないんだ。",
      "ふだんなら　ひが　くれる　まえに\nかならず　かえって　くるのに……。",
      "もりの　おくは　このごろ\nようすが　へんだって　いうし\nしんぱいで　ねむれないよ。",
    ],
  },
  npc_bie_village_tree_walker: {
    id: "npc_bie_village_tree_walker",
    pages: [
      "この　おおきな　きは\nむらが　できる　まえから\nここに　あるんだって。",
      "さいきん　ときどき　はっぱが\nちらっと　へんな　いろに\nみえるんだ。",
      "……めの　せいかな。\nおかあさんには　ないしょだよ。",
    ],
  },
  npc_bie_village_path_walker: {
    id: "npc_bie_village_path_walker",
    pages: [
      "やまみちは　あめの　あと\nすべりやすい。\nあしもとに　きを　つけな。",
      "それと　やまの　どうくつには\nちかづくなよ。\nむかしから　そう　いわれてるんだ。",
    ],
  },
  // No.05レインランドのもり(その2)の奥に立つ木こり(2026-09-27ユーザー指示)。初めて最後まで読むと、
  // レインランドじょうへの道を聞いて世界地図でレインランドじょうかまちが選べるようになる(FIRST_TALK_UNLOCKS)。
  // ビーエのむらで戻らないと言われている木こりとの関係・救出イベントは未確定(TBD)のため、同一人物だと示さない。
  // 台詞本文はDIALOGUE_DRAFT。ミレイ・ジャンカード・世界の真相には触れない。
  npc_rainland_forest_woodcutter: {
    id: "npc_rainland_forest_woodcutter",
    pages: [
      "おや　こんな　もりの　おくまで\nよく　きたな。",
      "おれは　この　もりで　きを\nきって　くらして　いる\nきこりだ。",
      "レインランドじょうへ　いきたいのか？\nそれなら　じょうかまちを\nとおって　いくんだ。",
      "じょうは　まちの　いちばん\nきたに　ある。\nみちに　まようなよ。",
      "せかいちずに　しるしを\nつけて　おいてやろう。\nいって　みると　いい。",
    ],
  },
  // No.08ザボンのむら 会話第2稿(2026-09-27、ユーザー依頼「住人の立ち位置、会話内容を他に合わせて更新」)。
  // 配置(固定4・歩く2、NPC_SPEC.md §2.1)は変えず、初稿(2026-09-26)の1〜3ページを4〜6ページへ増やした。
  // レインランドじょうかまち・はじまりのまちの会話が既にザボンの話題(けがわ・王の使い・かたいモンスター)を
  // 言い換えているのに合わせ、ザボン側からも旅の商人・つかいの兵士を通じて他の町の話が伝わる形にした。
  // NPC_SPEC.md §5「タロサの過去を全員が説明する構成にしない」に合わせ、タロサに触れるのは的場への道の1人だけ。
  // タロサの過去・デスタロッサ・いわやまのどうくつの攻略内容には触れない。1ページ最大3行(DialogueBoxは4行分の高さ)。
  npc_zabon_village_elder: {
    id: "npc_zabon_village_elder",
    pages: [
      "ここは　ザボンの　あつまりの　いえだ。\nかりの　まえには　みんなで\nここに　あつまる。",
      "この　むらの　ものは　こどもの\nころから　ゆみを　ならう。\nむらを　じぶんで　まもる　ためにな。",
      "レインランドの　おうさまからも\nモンスターの　ようすを　しらせよと\nつかいが　きておる。",
      "つかいの　へいしは　ほかの　まちにも\nおなじような　はなしを　きいて\nまわって　いる　らしい。",
      "おうさまが　あちこちに　きを\nくばって　くださるなら、この\nむらも　すこしは　あんしんじゃ。",
      "としを　とっても　この　ゆみうでは\nにぶらんぞ。わかいものには\nまだまだ　まけられんて。",
    ],
  },
  npc_zabon_village_roof_mender: {
    id: "npc_zabon_village_roof_mender",
    pages: [
      "やねの　あなかい？\nこの　まえの　あらしで　あいたんだ。",
      "かりの　しごとが　いそがしくて\nなおす　ひまが　なくってね。\nあめの　ひは　なべで　うけてるよ。",
      "レインランドから　だいくを\nよぶ　はなしも　あるんだが、\nもりの　みちが　あぶなくて　こないのさ。",
      "あめが　おおいのは　こまるが、\nかわの　みずが　きれいに\nなるのは　いいこと　かもな。",
      "あめの　ひの　なべの　おとも\nなれれば　たいこみたいで\nむすめは　わらって　きくんだ。",
    ],
  },
  npc_zabon_village_tanner: {
    id: "npc_zabon_village_tanner",
    pages: [
      "かりで　とった　けがわを\nなめして　いるんだ。\nレインランドで　いい　ねに　なる。",
      "このごろの　モンスターは\nかわが　かたくて　やが\nとおりにくい。",
      "かたい　あいてには\nなんども　ねばり　づよく　いけ。\nそれが　ザボンの　かりだ。",
      "レインランドの　いちばの　ものが\nこの　けがわを　たかく　かって\nくれるんだ。ありがたい　はなしさ。",
      "モンスターが　あばれる　わけを\nかんがえても　しかたない。\nこっちは　うでを　みがくだけよ。",
      "なめしすぎて　てが　くさいと\nむすこに　いつも　いわれるんだ。\nしょうばい　どうぐと　おもって　くれ。",
    ],
  },
  npc_zabon_village_mother: {
    id: "npc_zabon_village_mother",
    pages: [
      "うちの　こも　いつか　かりに\nでたいって　いうのよ。",
      "でも　あたしは　はたけで\nじゅうぶんだと　おもうの。\nかぶも　むぎも　にげないからね。",
      "たびの　あきんどが　いうには、\nよその　まちでも　こどもは\nおやの　しごとを　いやがるんだって。",
      "はたけの　やさいも　レインランドへ\nはこべたら　いいのにね。\nみちが　とおくて　たいへんだけど。",
      "むすこは　ゆみの　まねごとを\nして　あそんでるの。ははおや\nとしては　ちょっと　はらはら　するわ。",
    ],
  },
  npc_zabon_village_totem_walker: {
    id: "npc_zabon_village_totem_walker",
    pages: [
      "ひろばの　はしらは　むらの\nまもりがみ　なんだって。",
      "かりに　でる　ひとは\nここで　てを　あわせてから\nでかけて　いくんだ。",
      "たびの　ひとも　ときどき\nここで　てを　あわせて\nいくらしいよ。",
      "むかしから　ずっと　ここに\nあるんだって。だれが　たてたのかは\nだれも　しらないんだ。",
    ],
  },
  npc_zabon_village_range_walker: {
    id: "npc_zabon_village_range_walker",
    pages: [
      "ひがしの　まとばでは　まいあさ\nだれよりも　はやく　タロサが\nゆみを　ひいて　たよ。",
      "あいつ　いつも　いうんだ。\nどりょく　すれば　かならず\nつよく　なれるってさ。",
      "……そう　いえば　きょうは\nまだ　みかけて　ないな。",
      "まとに　あたると　こどもたちが\nかっさいするのが　うれしいって\nわらってたな。",
    ],
  },
  // No.06レインランドじょうかまち 会話第2稿(2026-09-27、ユーザー依頼「もっと密度の高い情報がいきかっています」)。
  // 初稿(2026-09-26)の1人1話題は保ったまま、各人を4〜6ページに増やし、はじまりのまち・ビーエのむら・ザボンのむらで
  // すでに聞いた話(荷馬車の遅れ・干し草・毛皮・ぶきやの繁盛・やどやの客減り・王の使い)を城下町側から言い換えて、
  // 「情報が町へ集まり、人から人へ伝わる」感触を作る。台詞の割り振りはdocs/NPC/03_rainland_no_machi.md §8。
  // ミレイ・姫・王家の事情・ジャンカードには触れない(NPC/04_rainland_castle.md §4)。王について話すのは北西の家の1人だけ。
  // 金額・出港日などの数値、まじんのどうくつ・No.07以降の地域、王の依頼の中身には触れない。1ページ最大3行。
  npc_rainland_town_nw_householder: {
    id: "npc_rainland_town_nw_householder",
    pages: [
      "おしろの　おうさまは\nまちの　ものの　はなしも\nよく　きいて　くださるのよ。",
      "このごろ　おしろへ　あつまる\nしらせが　ぐっと　ふえてね。\nつかいの　へいしさんが　まちを　はしるわ。",
      "ザボンの　むらへも　つかいが\nいったと　きいたわ。\nかくちの　モンスターを　しらべて　いるの。",
      "こわい　はなしも　おおいけれど\nおうさまが　うごいて　くださるなら\nあんしん　だわ。",
      "だから　この　まちの　ひとは\nみんな　おしろが　じまんなの。",
    ],
  },
  npc_rainland_town_ne_householder: {
    id: "npc_rainland_town_ne_householder",
    pages: [
      "おしろへ　いくなら\nふんすいの　きたの　かいだんを\nのぼった　さきだ。",
      "かいだんの　うえの　きの　とびらが\nおしろの　もんだ。\nもんばんが　みはって　いるぞ。",
      "もんばんは　かたい　やつだが\nたびびとを　おいかえしは　しないさ。",
      "ただし　このごろ　おしろは　いそがしい。\nほうこくを　もって　くる　たびびとも\nおおい　らしくてな。",
      "ようじが　あるなら　へいたいさんに\nはっきり　つたえるんだ。\nなかは　ひろいが　みちは　おしえて　くれる。",
    ],
  },
  npc_rainland_town_market_householder: {
    id: "npc_rainland_town_market_householder",
    pages: [
      "この　あたりは　あめが　おおくてね。\nせんたくものが　なかなか\nかわかないのよ。",
      "でも　ほりの　みずが\nいつも　きれいなのは\nあめの　おかげね。",
      "あめの　ひは　さんばしの　ほうも\nふねが　ゆれて　にもつの\nあげおろしが　たいへんなんですって。",
      "そのかわり　あめあがりの　あさは\nいちばの　やさいが　つやつやで\nいちばん　おいしいのよ。",
      "たびの　ひとも　ぬれたら\nはやめに　からだを　ふきなさいね。\nかぜは　ひくと　やっかいよ。",
    ],
  },
  npc_rainland_town_stall_west: {
    id: "npc_rainland_town_stall_west",
    pages: [
      "いらっしゃい！\nレインランドの　いちばへ　ようこそ。",
      "ふねで　はこばれて　くる\nしなものは　どれも　しんせんだよ。",
      "さかなや　しおは　さんばしから。\nほしくさは　ビーエの　むらから。\nけがわは　ザボンの　むらからだ。",
      "ところが　このごろ　りくの\nにぐるまが　おくれがち　でね。\nビーエの　ほしくさが　とどかないんだ。",
      "もりの　みちで　モンスターに\nおそわれるのが　こわくて\nにぐるまが　でられないらしい。",
      "ほしくさは　くすりの　もとに\nなる　ものも　おおい。\nしなぎれに　ならなければ　いいが。",
    ],
  },
  npc_rainland_town_stall_east: {
    id: "npc_rainland_town_stall_east",
    pages: [
      "けさの　くだものは\nもう　ほとんど　うれちゃったの。",
      "いちばは　あさが　いちばん\nにぎやかなのよ。\nまた　はやおきして　きてね。",
      "おきゃくさんの　はなしを　きいて\nいると　いろんな　うわさが\nはいって　くるのよ。",
      "みなみの　まちでは　ぶきやが\nはんじょう　して　いるとか。\nそれだけ　そとが　ぶっそうなのね。",
      "そのぶん　やどやは　きゃくが\nへって　こまって　いるんだって。\nたびを　する　ひとが　へったのかしら。",
      "でも　この　まちは　ちがうわ。\nさんばしの　ふねが　ある　かぎり\nしょうばいは　とまらないもの。",
    ],
  },
  npc_rainland_town_plaza_walker: {
    id: "npc_rainland_town_plaza_walker",
    pages: [
      "ぼくも　たびの　とちゅうで\nこの　まちに　よったんだ。",
      "ふんすいの　まわりに　いると\nいろんな　くにの　はなしが\nきこえて　くるよ。",
      "ここへは　みなみの　もりを\nぬけて　きたんだけど\nみちが　なんども　わかれてて　まよったよ。",
      "もりの　おくで　きこりの\nひとに　あって　まちへの\nみちを　おしえて　もらったんだ。",
      "もりの　なかは　たたかいが\nおおくて　へとへとさ。\nここは　モンスターが　でなくて　ほっと　する。",
      "つぎは　どこへ　いこうかな。\nはなしを　きく　たびに　ゆきさきが\nふえて　こまるよ。",
    ],
  },
  npc_rainland_town_avenue_walker: {
    id: "npc_rainland_town_avenue_walker",
    pages: [
      "おれは　さんばしの　にもつはこびさ。",
      "たるも　はこも　ぜんぶ\nこの　おおどおりを　とおって\nいちばへ　いくんだ。",
      "あさいちばんの　ふねが　つくと\nいちばの　やつらが　わっと　あつまる。\nそこから　おれたちの　しごとだ。",
      "このごろは　りくの　にぐるまが\nすっかり　こなく　なっちまった。\nもりの　みちが　あぶないらしい。",
      "そのぶん　ふねの　ほうは　いそがしい。\nりくが　だめなら　みずの　うえさ。",
      "たびびとさんよ。\nたるの　まわりで　あそぶなよ。\nころがると　あぶねえぞ。",
    ],
  },
  npc_rainland_town_east_walker: {
    id: "npc_rainland_town_east_walker",
    pages: [
      "さいきん　もりの　ほうで\nモンスターが　ふえたって\nうわさよ。",
      "ザボンの　かりゅうどさんが\nぼやいて　いたわ。\nこのごろの　モンスターは　かわが　かたいって。",
      "ほかにも　すばやく　なったとか\nなきごえが　へんだとか。\nみんな　いう　ことが　ばらばらなの。",
      "ただ　そとから　もどった　ひとは\nかいふくやくを　たくさん\nもっていた　わね。",
      "たびびとさんも\nまちの　そとでは　きをつけてね。",
    ],
  },
  // No.10かくれざと: source folder has no dialogue manuscript. These first-pass local lines follow NPC_SPEC.md:
  // the village's closed atmosphere is implied through daily life, and neither Mirei's identity nor later events are disclosed.
  // 2026-09-27ユーザー指示「村人の会話を濃くして、宿屋・道具屋・武器屋を強化」: 1ページのみだった8人を
  // 各3〜5ページへ増やし(既存の1行はそのまま残す)、水車小屋・まんなかの家・西の家の3人をshops.tsの
  // 店番へ(role: "shopkeeper"、config/maps.ts)。閉鎖性・秘密性(NPC_SPEC.md)を守り、ミレイ・ジャンカードの
  // 秘密・王家の事情には触れず、他地域のうわさ(モンスターで道が荒れている等)だけを薄く混ぜた。
  npc_hidden_village_shrine_keeper: {
    id: "npc_hidden_village_shrine_keeper",
    pages: [
      "ここでは　あさに\nみずの　おとを　きくんだ。",
      "このやしろは　むらの　みんなで\nこうたいで　まもって　いるんだよ。",
      "そとから　ここを　みつけられる　ひとは\nめったに　いない。",
      "みちに　まよって　たどりつく\nたびびとが　たまに　いるくらいさ。",
      "しずかな　やまの　くうきが\nこの　さとには　よく　にあうだろう？",
    ],
  },
  npc_hidden_village_west_householder: {
    id: "npc_hidden_village_west_householder",
    pages: [
      "たびの　ひとには　やまで　とれる\nくすりそうを　わけて　あげて　いるのよ。",
      "はなの　みずやりは\nたきの　そばが　いちばんさ。",
      "ここの　はなは　やまの　みずと\nつちが　いいから　よく　そだつの。",
      "そとの　まちの　はなしは\nたびびとから　すこしだけ　きくわ。",
      "モンスターが　でる　みちを\nこえて　くる　ひとも　いるのよ。\nきを　つけて　いってね。",
    ],
  },
  npc_hidden_village_central_householder: {
    id: "npc_hidden_village_central_householder",
    pages: [
      "うちは　へやが　あまって　いるから\nたびの　ひとを　とめて　あげてるの。",
      "ほそい　みちでも\nみんなで　たすけあってる。",
      "ここは　やまおくの　ちいさな　さとだから\nみんな　かおみしりさ。",
      "たまに　くる　たびびとの　はなしを\nきくのが　たのしみなんだ。",
      "ゆっくり　やすんで　いって　おくれ。",
    ],
  },
  npc_hidden_village_east_householder: {
    id: "npc_hidden_village_east_householder",
    pages: [
      "この　さとは　ちずにも　のって　いない\nかくれた　ばしょなんだ。",
      "あめのひの　はしは\nあしもとに　きをつけて。",
      "レインランドの　ほうから\nモンスターが　でるって　うわさも　きくね。",
      "でも　ここまでは　なかなか\nこないから　あんしんさ。",
    ],
  },
  npc_hidden_village_lower_householder: {
    id: "npc_hidden_village_lower_householder",
    pages: [
      "よそから　きた　ひとを　みるのは\nひさしぶりだよ。",
      "やまの　しずけさは\nよるに　いちばん　よくわかる。",
      "ふもとの　まちまで　いくには\nいちにち　がかりに　なるかな。",
      "ここに　いれば　だれにも\nじゃまされないからね。",
    ],
  },
  npc_hidden_village_watermill_keeper: {
    id: "npc_hidden_village_watermill_keeper",
    pages: [
      "こむぎを　ひく　かたわら、\nたびびとの　ぶきの　ていれも\nうけおって　いるんだ。",
      "みずぐるまが　まわると\nこむぎの　かおりが　する。",
      "やまで　とれた　てつを　つかった\nじょうぶな　ぶきも　あつかうよ。",
      "モンスターと　たたかうなら\nいい　ぶきを　もって　いくと　いい。",
    ],
  },
  npc_hidden_village_plaza_walker: {
    id: "npc_hidden_village_plaza_walker",
    pages: [
      "この　ひろばには　むらの　みんなが\nしぜんと　あつまるんだ。",
      "たきの　おとは\nよるでも　やまないんだ。",
      "そとの　せかいの　はなしは\nあまり　きこえて　こないな。",
    ],
  },
  npc_hidden_village_garden_walker: {
    id: "npc_hidden_village_garden_walker",
    pages: [
      "はしの　むこうには\nはなが　たくさん　さいてるよ。",
      "この　はなばたけは　むらの\nちょっとした　じまんなんだ。",
      "きせつが　かわると\nさく　はなも　かわるんだよ。",
    ],
  },
  // 本編のミレイは通常住民8人とは別枠。出現・退場・仮参加はgetDialogueのフラグ分岐で扱う。
  npc_zabon_tarosa: { id: "npc_zabon_tarosa", pages: ["タロサ：何の用だ。"] },
  npc_hidden_village_mirei: { id: "npc_hidden_village_mirei", pages: ["ミレイ：どうしたの？"] },
  // No.15ふっかつのほこら 村人2人(2026-09-27ユーザー指示「ふっかつのほこらに村人を追加してください」)。
  // NPC_SPEC.md §2.1の目安2人。ほこらのばんにんは生活・地域NPC(北の台座の中身は明言しない)。学者は
  // MAP_FLOW_SPEC.md §4.19「反射を連想できる薄いヒント。ミラーの答えを直言しない」を守り、「はねかえした
  // ひかりは、もとの　ばしょへ　もどって　いく」という言い伝えだけを話し、ミラー・ダイダイン・デーマスには
  // 触れない。ミレイ・王家・ジャンカードにも触れない。台詞本文はDIALOGUE_DRAFT。
  npc_revival_shrine_keeper: {
    id: "npc_revival_shrine_keeper",
    pages: [
      "おお…　こんな　ばしょまで\nよく　たどりついたな。",
      "ここは　みずと　こけに\nかこまれた、ふるい　ほこらだ。",
      "きたに　ひかる　だいざが\nあるだろう。\nむかしから　いわれが　あるらしい。",
      "わしは　その　そばで　くらす、\nただの　ばんにんに　すぎんよ。",
    ],
  },
  npc_revival_shrine_scholar: {
    id: "npc_revival_shrine_scholar",
    pages: [
      "ん…？　だれか　きたのか。\nしらべものに　むちゅうで\nきづかなかったよ。",
      "この　だいざの　まわりには\nふるい　いいつたえが\nのこって　いるんだ。",
      "「はねかえした　ひかりは、\nもとの　ばしょへ　もどって　いく」\n……そういう　くだりだ。",
      "なにを　いみするのかは\nわしにも　まだ　わからんが……\nいつか　やくに　たつのかもな。",
    ],
  },
  // No.12港町ダコハ 村人7人(2026-09-29ユーザー指示「港町ダコハの村人を追加、宿屋・武器屋を追加」)。
  // NPC_SPEC.md §5「港町ダコハ」の「港、交易、人・物・噂。デーマスの存在を少しずつ匂わせるが、攻略の答え
  // は言わない」を守る。とうだい近くの老婆だけが「デーマス」という名を旅人のうわさとして口にし、しょうたい
  // やミラー・ダイダインには触れない。ジャンカードの秘密・たびのあいことば・タロサ・ミレイ・王家には触れない。
  // やどやの主人・ぶきやの店主は話しかけると店の窓(config/shops.ts)が開き、ここの台詞は「はなす」で読む。
  npc_dakoha_port_innkeeper: {
    id: "npc_dakoha_port_innkeeper",
    pages: [
      "ここは　みなとまち　ダコハの\nやどやだ。ふねを　まつ　たびびとが\nよく　とまって　いくよ。",
      "つかれた　からだには\nあたたかい　しんしつと\nうまい　めしが　いちばんさ。",
      "よるには　すいふたちの\nうたごえが　どこからか\nきこえてくる　ことも　あるんだ。",
      "ここに　とまれば、\nつぎの　ふねの　でる　じかんも\nおしえて　あげられるよ。",
      "きょうは　どこから　きたんだい？\nゆっくり　やすんで　いきな。",
    ],
  },
  npc_dakoha_port_armory_keeper: {
    id: "npc_dakoha_port_armory_keeper",
    pages: [
      "おれは　この　みなとで\nぶきの　ていれを　して\nくらして　いるんだ。",
      "すいふも　りょうしも、\nうみの　むこうへ　でるまえに\nここで　はものを　みてもらう。",
      "モンスターが　でる　みちを\nいく　ものには、いい　ぶきを\nすすめて　いるよ。",
      "とおくの　まちの　てつを\nつかった　ぶきも\nすこしだけ　あつかって　いる。",
      "からだに　あった　ぶきを\nえらぶと　いい。むりは\nするなよ。",
    ],
  },
  npc_dakoha_port_lighthouse_widow: {
    id: "npc_dakoha_port_lighthouse_widow",
    pages: [
      "あのとうだいは、むかしから\nこの　みなとの　ふねを\nみちびいて　きたのよ。",
      "わたしは　もう　ながいこと、\nあの　あかりの　そばで\nくらして　いるの。",
      "すいふたちは　よく、\nとおい　うみの　むこうの\nうわさばなしを　してくれるわ。",
      "「デーマス」という　なを\nおそれるように　ささやく\nものも　いるのよ。",
      "どんな　ものかは\nわたしにも　わからないけれど……\nきを　つけて　おいき。",
    ],
  },
  npc_dakoha_port_market_vendor: {
    id: "npc_dakoha_port_market_vendor",
    pages: [
      "さあさあ、とれたての\nしなものだよ。みて\nいっておくれ。",
      "ダコハには、いろんな\nまちから　ふねで　しなが\nはこばれて　くるのさ。",
      "たびの　あきんども\nここで　しなものを\nうったり　かったり　するんだ。",
      "めずらしい　ものが\nてに　はいる　ことも\nあるんだよ。",
      "ゆっくり　みて\nいって　おくれ。",
    ],
  },
  npc_dakoha_port_fisherman: {
    id: "npc_dakoha_port_fisherman",
    pages: [
      "けさも　あさはやくから\nうみへ　でて、さかなを\nとって　きたんだ。",
      "このへんの　うみは\nさかなが　おおくて、\nいい　りょうばだよ。",
      "とおくまで　ふねを\nだす　ときは、かぜと\nしおの　むきを　よく　みる。",
      "とれた　さかなは、\nやどやや　いちばへ\nおろして　いるんだ。",
      "うみは　きまぐれだが、\nそれでも　おれは　この\nしごとが　すきなんだ。",
    ],
  },
  npc_dakoha_port_pier_boy: {
    id: "npc_dakoha_port_pier_boy",
    pages: [
      "ぼく、おおきく　なったら\nふなのりに　なるんだ。",
      "いまは　まだ、にもつを\nはこぶ　てつだいだけ\nさせて　もらってる。",
      "おおきな　ふねが　みなとに\nはいって　くると、\nむねが　どきどきするんだ。",
      "いつか　とおい　うみまで\nいって　みたいなあ。",
    ],
  },
  npc_dakoha_port_plaza_dockhand: {
    id: "npc_dakoha_port_plaza_dockhand",
    pages: [
      "おれは　こうえきせんの\nすいふさ。いろんな\nみなとを　まわって　いる。",
      "この　ダコハは、\nおれが　しっている\nなかでも　にぎやかな　ほうだな。",
      "つぎの　ふねが　でるまで、\nすこし　まちを　みて\nまわって　いるんだ。",
      "どこの　まちにも、\nそこだけの　いいつたえが\nあって　おもしろいもんだ。",
    ],
  },
  dev_npc_test: {
    id: "dev_npc_test",
    pages: [
      "ここは　かいわテストです。",
      "つぎのページです。",
    ],
  },
  // DEV_PLACEHOLDER_DIALOGUE / DEV_BATTLE_EVENT: 正式台詞・シナリオではない。
  dev_battle_event_npc: {
    id: "dev_battle_event_npc",
    pages: ["しょうぶしてみるか？"],
    afterDialogue: {
      type: "battle",
      eventId: "dev_battle_event_003",
      monsterId: "003",
      returnSceneKey: "StartingTownScene",
      returnSpawnId: "fromWorldMap",
    },
  },
  // DEV_PLACEHOLDER_DIALOGUE: No.16未実装のためNo.02で確認。正式台詞・配置ではない。
  dev_demas_battle_npc: {
    id: "dev_demas_battle_npc",
    pages: ["デーマスとの　しょうぶを　ためしてみるか？"],
    afterDialogue: {
      type: "battle", eventId: "demas_battle", monsterId: "demas",
      returnSceneKey: "StartingTownScene", returnSpawnId: "fromWorldMap",
      victoryFlag: "boss.demas_defeated",
    },
  },
  // DEV_PLACEHOLDER_DIALOGUE: 正式No.06レインランドじょう（内部map_05_rainland_castle）の通り抜け確認用の仮台詞。正式台詞ではない。
  // docs/NPC/04_rainland_castle.md §4・§6のとおり、ミレイの正体・王家の事情には触れず、世界観を壊さない一般的な内容だけにする。
  rainland_castle_gate_soldier: { id: "rainland_castle_gate_soldier", pages: ["ここは　レインランドじょうだ。"] },
  rainland_castle_hall_soldier: { id: "rainland_castle_hall_soldier", pages: ["しろのなかでは　しずかに　たのむぞ。"] },
  rainland_castle_throne_guard: { id: "rainland_castle_throne_guard", pages: ["この　さきは　おうの　まだ。", "いまは　はいれない。"] },
  rainland_castle_servant: { id: "rainland_castle_servant", pages: ["きょうも　しろは　いそがしいですね。"] },
  rainland_castle_resident: { id: "rainland_castle_resident", pages: ["このしろは　ずっと　むかしから\nレインランドを　みまもっているそうです。"] },
  // 動的な分岐(討伐前／討伐後・未報告／報告済み)はgetDialogueで解決する。ここはNPC定義の参照整合性用の既定形(討伐前の前半)。
  rainland_throne_king: { id: "rainland_throne_king", pages: RAINLAND_KING_QUEST_PAGES },
  rainland_throne_guard_west: { id: "rainland_throne_guard_west", pages: ["[仮] おうさまの　まえだ。\nれいぎを　わすれるなよ。"] },
  rainland_throne_guard_east: { id: "rainland_throne_guard_east", pages: ["[仮] おうのまを　まもるのが\nわれら　このえへいの　つとめだ。"] },
  // 動的な加入分岐は getDialogue で解決する。ここにはNPC定義の参照整合性用の既定形を置く。
  dev_party_join_tarosa: { id: "dev_party_join_tarosa", pages: ["たびを　するなら\nこのおとこも\nつれていくと　いい。"] },
  dev_party_join_mirei: { id: "dev_party_join_mirei", pages: ["まずは\nあっちの　おとこに\nはなしてみると　いい。"] },
};

/**
 * 初めて最後まで読んだ時だけ、末尾に解放を知らせるページを足し、読み終えた時点で世界地図の解放フラグを保存する会話。
 * 場所の情報そのものは通常の会話ページに含めるため、2回目以降は通常の会話だけを繰り返す。
 */
const FIRST_TALK_UNLOCKS: Readonly<Record<string, { readonly flag: string; readonly eventId: string; readonly notice: string }>> = {
  // ぶきやの店主から「ビーエのもり」の場所を聞く。
  npc_start_town_weapon_shopkeeper: {
    flag: STORY_FLAGS.bieForestUnlocked,
    eventId: "event_starting_town_weapon_shop_bie_forest_info",
    notice: "ビーエのもりへ　いけるように\nなった！",
  },
  // ビーエのむらの干し物の人から、レインランドじょうへ行くにはレインランドのもりを通ると聞く。
  npc_bie_village_herb_drier: {
    flag: STORY_FLAGS.rainlandForestUnlocked,
    eventId: "event_bie_village_herb_drier_rainland_forest_info",
    notice: "レインランドのもりへ　いけるように\nなった！",
  },
  // レインランドのもりの奥の木こりから、レインランドじょうへの道(じょうかまち経由)を聞く。
  npc_rainland_forest_woodcutter: {
    flag: STORY_FLAGS.rainlandCastleTownUnlocked,
    eventId: "event_rainland_forest_woodcutter_castle_info",
    notice: "レインランドじょうへ　いけるように\nなった！",
  },
};

/** DEV加入NPCだけは現在のPartySystemを見て、安全に会話と加入イベントを分岐する。 */
export function getDialogue(
  dialogueId: string,
  party: Pick<PartySystem, "hasMember"> = partySystem,
  flags: Pick<GameStateRepository, "hasFlag"> = new GameStateRepository(),
): Dialogue | undefined {
  const firstTalkUnlock = FIRST_TALK_UNLOCKS[dialogueId];
  if (firstTalkUnlock && !flags.hasFlag(firstTalkUnlock.flag)) {
    const base = DIALOGUES[dialogueId];
    return {
      ...base,
      pages: [...base.pages, firstTalkUnlock.notice],
      afterDialogue: {
        type: "story-flags",
        eventId: firstTalkUnlock.eventId,
        flags: [firstTalkUnlock.flag],
      },
    };
  }
  if (dialogueId === "rainland_throne_king") {
    if (flags.hasFlag(STORY_FLAGS.majinCaveReportedToKing)) {
      return { id: dialogueId, pages: RAINLAND_KING_AFTER_REPORT_PAGES };
    }
    if (flags.hasFlag(STORY_FLAGS.majinCaveBossDefeated)) {
      return {
        id: dialogueId,
        pages: RAINLAND_KING_REPORT_PAGES,
        afterDialogue: {
          type: "portrait-interlude",
          portrait: RAINLAND_KING_TAROSA_PORTRAIT,
          continuationPages: RAINLAND_KING_REPORT_CONTINUATION_PAGES,
          thenFlags: [STORY_FLAGS.majinCaveReportedToKing],
        },
      };
    }
    return {
      id: dialogueId,
      pages: RAINLAND_KING_QUEST_PAGES,
      afterDialogue: {
        type: "portrait-interlude",
        portrait: RAINLAND_KING_TAROSA_PORTRAIT,
        continuationPages: RAINLAND_KING_QUEST_CONTINUATION_PAGES,
      },
    };
  }
  if (dialogueId === "npc_zabon_tarosa") {
    if (flags.hasFlag(STORY_FLAGS.tarosaRefusedRequest)) {
      return {
        id: dialogueId,
        pages: [
          "タロサ「いわやまへ　いったのか。\n……むちゃを　するな。」",
          "タロサ「おれは　すこし\nあとから　いく。\nさきに　死ぬなよ。」",
        ],
      };
    }
    return {
      id: dialogueId,
      pages: [
        "タロサ「おうさまが　おれを\nたよりに　している？\nかってな　はなしだ。」",
        "タロサ「いわやまは　おれの　もんだいだ。\nほかの　やつと　くむ気はない。」",
        "タロサ「ひとりで　いく。\nおまえは　おまえの　みちを\n行け。」",
      ],
      afterDialogue: {
        type: "story-flags",
        eventId: "EVENT_ZABON_TAROSA_REFUSED",
        flags: [STORY_FLAGS.tarosaRefusedRequest],
      },
    };
  }
  if (dialogueId === "npc_hidden_village_mirei") {
    if (flags.hasFlag(STORY_FLAGS.hiddenVillageMireiJoined)) {
      return { id: dialogueId, pages: ["ミレイは　いま　旅の途中だ。"] };
    }
    return {
      id: dialogueId,
      pages: [
        "ミレイ「古城の　文字が\n読めなくて　こまってるの？」",
        "ミレイ「わたしも　まだ\nまほうを　ならっているところ。\nでも　力に　なれるかも。」",
        "ミレイ「古城までなら　いくよ。\nまずは　いっしょに\nたしかめよう。」",
      ],
      afterDialogue: {
        type: "npc-depart",
        eventId: "EVENT_HIDDEN_VILLAGE_MIREI_PROVISIONAL_JOIN",
        npcId: "npc_hidden_village_mirei",
        flags: [STORY_FLAGS.hiddenVillageMireiJoined],
        joinsPartyAs: "mirei",
      },
    };
  }
  if (dialogueId === "dev_party_join_tarosa") {
    if (party.hasMember("tarosa")) {
      return { id: dialogueId, pages: ["タロサと　いっしょなら\nこころづよいな。"] };
    }
    return {
      id: dialogueId,
      pages: ["たびを　するなら\nこのおとこも\nつれていくと　いい。", "タロサが\nなかまに　なった！"],
      afterDialogue: { type: "party-join", eventId: "DEV_PARTY_JOIN_TAROSA", memberId: "tarosa" },
    };
  }
  if (dialogueId === "dev_party_join_mirei") {
    if (!party.hasMember("tarosa")) {
      return { id: dialogueId, pages: ["まずは\nあっちの　おとこに\nはなしてみると　いい。"] };
    }
    if (party.hasMember("mirei")) {
      return { id: dialogueId, pages: ["これで　みんな\nいっしょに　たびが　できるな。"] };
    }
    return {
      id: dialogueId,
      pages: ["もうひとり\nたびの　なかまを\nよんでおいたぞ。", "ミレイが\nなかまに　なった！"],
      afterDialogue: { type: "party-join", eventId: "DEV_PARTY_JOIN_MIREI", memberId: "mirei" },
    };
  }
  return DIALOGUES[dialogueId];
}
