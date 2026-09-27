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

// DEV_PLACEHOLDER_DIALOGUE: Phase 7の会話システム確認用。正式台詞ではなく、本編ストーリー・設定を含まない。
export const DIALOGUES: Record<string, Dialogue> = {
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
  npc_bie_village_miller: {
    id: "npc_bie_village_miller",
    pages: [
      "こなひきの　しごとは\nみずぐるま　まかせさ。",
      "……だがね　このごろ　ときどき\nみずぐるまが　ほんの　いっしゅん\nとまるんだ。",
      "かわの　みずは　いつもどおり\nながれて　いるのに。\nふしぎな　ことも　あるもんだ。",
    ],
  },
  npc_bie_village_herb_drier: {
    id: "npc_bie_village_herb_drier",
    pages: [
      "やまで　とった　くさや\nきのみを　ここで\nほして　いるのよ。",
      "かわいたら　レインランドの\nまちまで　はこんで　うるの。\nあそこは　ひとが　おおいからね。",
      "レインランドじょうへ　いくには\nレインランドの　もりを\nとおらなくては　いけないの。",
      "でも　このごろは　みちに\nモンスターが　でるでしょう？\nなかなか　でかけられなくて。",
    ],
  },
  npc_bie_village_farmer: {
    id: "npc_bie_village_farmer",
    pages: [
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
  // No.08ザボンのむら 会話初稿(2026-09-26)。NPC_SPEC.md §5「狩り・自然・タロサに関係する地域。タロサの過去を
  // 全員が説明する構成にしない」に合わせ、タロサに触れるのは的場への道の1人だけ。タロサの過去・デスタロッサ・
  // いわやまのどうくつの攻略内容には触れない。
  npc_zabon_village_elder: {
    id: "npc_zabon_village_elder",
    pages: [
      "ここは　ザボンの　あつまりの　いえだ。\nかりの　まえには　みんなで\nここに　あつまる。",
      "この　むらの　ものは　こどもの\nころから　ゆみを　ならう。\nむらを　じぶんで　まもる　ためにな。",
      "レインランドの　おうさまからも\nモンスターの　ようすを　しらせよと\nつかいが　きておる。",
    ],
  },
  npc_zabon_village_roof_mender: {
    id: "npc_zabon_village_roof_mender",
    pages: [
      "やねの　あなかい？\nこの　まえの　あらしで　あいたんだ。",
      "かりの　しごとが　いそがしくて\nなおす　ひまが　なくってね。\nあめの　ひは　なべで　うけてるよ。",
    ],
  },
  npc_zabon_village_tanner: {
    id: "npc_zabon_village_tanner",
    pages: [
      "かりで　とった　けがわを\nなめして　いるんだ。\nレインランドで　いい　ねに　なる。",
      "このごろの　モンスターは\nかわが　かたくて　やが\nとおりにくい。",
      "かたい　あいてには\nなんども　ねばり　づよく　いけ。\nそれが　ザボンの　かりだ。",
    ],
  },
  npc_zabon_village_mother: {
    id: "npc_zabon_village_mother",
    pages: [
      "うちの　こも　いつか　かりに\nでたいって　いうのよ。",
      "でも　あたしは　はたけで\nじゅうぶんだと　おもうの。\nかぶも　むぎも　にげないからね。",
    ],
  },
  npc_zabon_village_totem_walker: {
    id: "npc_zabon_village_totem_walker",
    pages: [
      "ひろばの　はしらは　むらの\nまもりがみ　なんだって。",
      "かりに　でる　ひとは\nここで　てを　あわせてから\nでかけて　いくんだ。",
    ],
  },
  npc_zabon_village_range_walker: {
    id: "npc_zabon_village_range_walker",
    pages: [
      "ひがしの　まとばでは　まいあさ\nだれよりも　はやく　タロサが\nゆみを　ひいて　たよ。",
      "あいつ　いつも　いうんだ。\nどりょく　すれば　かならず\nつよく　なれるってさ。",
      "……そう　いえば　きょうは\nまだ　みかけて　ないな。",
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
  npc_hidden_village_shrine_keeper: { id: "npc_hidden_village_shrine_keeper", pages: ["ここでは　あさに\nみずの　おとを　きくんだ。"] },
  npc_hidden_village_west_householder: { id: "npc_hidden_village_west_householder", pages: ["はなの　みずやりは\nたきの　そばが　いちばんさ。"] },
  npc_hidden_village_central_householder: { id: "npc_hidden_village_central_householder", pages: ["ほそい　みちでも\nみんなで　たすけあってる。"] },
  npc_hidden_village_east_householder: { id: "npc_hidden_village_east_householder", pages: ["あめのひの　はしは\nあしもとに　きをつけて。"] },
  npc_hidden_village_lower_householder: { id: "npc_hidden_village_lower_householder", pages: ["やまの　しずけさは\nよるに　いちばん　よくわかる。"] },
  npc_hidden_village_watermill_keeper: { id: "npc_hidden_village_watermill_keeper", pages: ["みずぐるまが　まわると\nこむぎの　かおりが　する。"] },
  npc_hidden_village_plaza_walker: { id: "npc_hidden_village_plaza_walker", pages: ["たきの　おとは\nよるでも　やまないんだ。"] },
  npc_hidden_village_garden_walker: { id: "npc_hidden_village_garden_walker", pages: ["はしの　むこうには\nはなが　たくさん　さいてるよ。"] },
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
  // DEV_PLACEHOLDER_DIALOGUE: 王の間(2026-09-23)の仮台詞。正式台詞・王への報告/依頼イベント(STORY_FLOW.md)はTBD。
  // ミレイの正体・王家の事情・まじんのどうくつの依頼内容には触れない。
  rainland_throne_king: { id: "rainland_throne_king", pages: ["[仮] よくぞ　まいった。", "[仮] わしが　レインランドの　おうじゃ。"] },
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
