import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Copy, Download, FolderPlus, RotateCcw, Wand2 } from "lucide-react";

// --- Small helpers ---
const copy = async (text: string, label = "コピーしました！") => {
  await navigator.clipboard.writeText(text);
  toast.success(label);
};

// Preset style packs
const STYLE_PRESETS = [
  { key: "anime", name: "アニメ風", adjectives: "anime-style, clean lineart, vibrant colors, soft shading" },
  { key: "manga", name: "マンガ風", adjectives: "manga-style, black-and-white, screentone, crisp linework" },
  { key: "photoreal", name: "フォトリアル", adjectives: "photorealistic, high detail, natural skin, realistic lighting" },
  { key: "watercolor", name: "水彩画風", adjectives: "watercolor painting, gentle gradients, paper texture, soft edges" },
  { key: "pixel", name: "ドット絵風", adjectives: "pixel art, 1-bit dithering, retro game style" },
  { key: "flat", name: "フラットベクター", adjectives: "flat vector illustration, minimal shapes, bold outlines" },
];

const NEGATIVE_PRESETS = [
  "ぼやけ, 低解像度, 粗い画質",
  "余分な指, 手の崩れ, 不自然な腕",
  "透かし, サイン, ロゴ, テキストの乱れ",
  "露出オーバー, 露出不足, 強いノイズ",
];

// Local storage hook
const useLocal = <T,>(key: string, initial: T) => {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
  }, [key, state]);
  return [state, setState] as const;
};

export default function NanoBananaPromptBuilder() {
  // --- States ---
  const [project, setProject] = useLocal<string>("nbpb.project", "");
  const [langMode, setLangMode] = useLocal<"jp-en" | "jp" | "en">("nbpb.lang", "jp-en");
  const [sceneJP, setSceneJP] = useLocal("nbpb.sceneJP", "桜並木を歩く女性、軽やかで前向きな雰囲気");
  const [detailsEN, setDetailsEN] = useLocal("nbpb.detailsEN", "waist-up, anime-style, cherry blossoms falling, soft lighting");

  const [charName, setCharName] = useLocal("nbpb.charName", "AIKON");
  const [charTraits, setCharTraits] = useLocal("nbpb.charTraits", "short bob hair, brown eyes, gentle smile, round glasses");
  const [outfit, setOutfit] = useLocal("nbpb.outfit", "navy sailor uniform with a red ribbon");
  const [colors, setColors] = useLocal("nbpb.colors", "#ff99cc accents, #1e293b navy, white");

  const [composition, setComposition] = useLocal("nbpb.composition", "eye-level shot, balanced framing, rule of thirds");
  const [lighting, setLighting] = useLocal("nbpb.lighting", "soft daylight, gentle rim light");
  const [mood, setMood] = useLocal("nbpb.mood", "cheerful, empowering, calm");

  const [styleKey, setStyleKey] = useLocal("nbpb.style", "anime");
  const [extraStyle, setExtraStyle] = useLocal("nbpb.extraStyle", "clean lineart, subtle gradients");

  const [width, setWidth] = useLocal<number>("nbpb.width", 1280);
  const [height, setHeight] = useLocal<number>("nbpb.height", 720);

  const [includeText, setIncludeText] = useLocal<boolean>("nbpb.includeText", false);
  const [embedText, setEmbedText] = useLocal("nbpb.embedText", "\"AIコンテンツラボ\"");
  const [textHints, setTextHints] = useLocal("nbpb.textHints", "headline at center, readable font, no distortion");

  const [useNegative, setUseNegative] = useLocal<boolean>("nbpb.useNegative", true);
  const [negatives, setNegatives] = useLocal("nbpb.negatives", NEGATIVE_PRESETS.join(", "));

  const [editMode, setEditMode] = useLocal<boolean>("nbpb.editMode", false);
  const [notes, setNotes] = useLocal("nbpb.notes", "背景差し替え時は人物の光源方向と影の濃さを合わせる");

  // --- Derived ---
  const quality = useMemo(() => {
    let score = 0;
    if (sceneJP.trim().length > 8) score += 1; // scene
    if (langMode !== "jp" && detailsEN.trim().length > 4) score += 1; // details
    if (charTraits.trim() && outfit.trim()) score += 1; // character
    if (STYLE_PRESETS.find(s => s.key === styleKey)) score += 1; // style
    if (width && height) score += 1; // size
    if (useNegative && negatives.trim().length > 4) score += 1; // negatives
    if (includeText ? embedText.trim().length > 0 : true) score += 1; // text
    return Math.round((score / 7) * 100);
  }, [sceneJP, detailsEN, langMode, charTraits, outfit, styleKey, width, height, useNegative, negatives, includeText, embedText]);

  const styleLine = useMemo(() => {
    const preset = STYLE_PRESETS.find(s => s.key === styleKey)?.adjectives ?? "";
    return [preset, extraStyle].filter(Boolean).join(", ");
  }, [styleKey, extraStyle]);

  const unifiedPrompt = useMemo(() => {
    const lines: string[] = [];
    if (langMode !== "en") lines.push(sceneJP);
    if (langMode !== "jp") lines.push(detailsEN);
    lines.push(`キャラクター: ${charName}; ${charTraits}; 衣装: ${outfit}; 色: ${colors}`);
    lines.push(`構図: ${composition}, 照明: ${lighting}, 雰囲気: ${mood}`);
    lines.push(styleLine);
    lines.push(`サイズ: ${width}x${height}`);
    if (includeText && embedText) lines.push(`画像内テキスト: ${embedText}, ${textHints}`);
    if (useNegative && negatives) lines.push(`ネガティブプロンプト: ${negatives}`);
    if (editMode) lines.push("編集モード: 元の人物は保持し、背景のみ差し替え");
    return lines.filter(Boolean).join("\n");
  }, [langMode, sceneJP, detailsEN, charName, charTraits, outfit, colors, composition, lighting, mood, styleLine, width, height, includeText, embedText, textHints, useNegative, negatives, editMode]);

  const kreaPrompt = useMemo(() => {
    const blocks: string[] = [];
    if (langMode !== "en") blocks.push(sceneJP);
    if (langMode !== "jp") blocks.push(detailsEN);
    blocks.push(`same character: ${charName}; ${charTraits}; outfit: ${outfit}; colors: ${colors}`);
    blocks.push(`${composition}, ${lighting}, mood: ${mood}`);
    blocks.push(styleLine);
    blocks.push(`size: ${width}x${height}`);
    if (includeText && embedText) blocks.push(`text: ${embedText}, ${textHints}`);
    return blocks.join("\n");
  }, [sceneJP, detailsEN, langMode, charName, charTraits, outfit, colors, composition, lighting, mood, styleLine, width, height, includeText, embedText, textHints]);

  const kreaNegative = useMemo(() => negatives, [negatives]);

  const asPreset = useMemo(() => JSON.stringify({
    project,
    langMode,
    sceneJP,
    detailsEN,
    character: { name: charName, traits: charTraits, outfit, colors },
    composition,
    lighting,
    mood,
    style: { key: styleKey, adjectives: styleLine },
    size: { width, height },
    text: includeText ? { embedText, textHints } : null,
    negatives: useNegative ? negatives : null,
    editMode,
    notes,
    generatedAt: new Date().toISOString(),
  }, null, 2), [project, langMode, sceneJP, detailsEN, charName, charTraits, outfit, colors, composition, lighting, mood, styleKey, styleLine, width, height, includeText, embedText, textHints, useNegative, negatives, editMode, notes]);

  const applyTemplate = (key: string) => {
    const TEMPLATES: Record<string, any> = {
      header: { sceneJP: "明るいデスクでノートPCを開いて作業する女性の横長バナー", detailsEN: "clean composition, negative space for headline at center, subtle gradient background", style: "flat", width: 1280, height: 720 },
      portrait: { sceneJP: "桜の木の下で微笑む女子、背景に花びらが舞っている", detailsEN: "waist-up portrait, soft bokeh background, eye-level shot", style: "anime", width: 1280, height: 1600 },
      manga: { sceneJP: "コマ割り風の構図で、主人公が決意を固めるシーン", detailsEN: "dynamic angle, speed lines, dramatic lighting", style: "manga", width: 1280, height: 720 },
      product: { sceneJP: "白背景で商品が映えるシンプルなレイアウト", detailsEN: "studio lighting, soft shadows, centered object", style: "photoreal", width: 1200, height: 1200 },
      bgswap: { sceneJP: "人物はそのままに、背景を街中のカフェ前へ差し替える", detailsEN: "background replacement, natural perspective, consistent lighting", style: "photoreal", width: 1280, height: 720 },
    };
    const t = TEMPLATES[key];
    if (!t) return;
    setSceneJP(t.sceneJP);
    setDetailsEN(t.detailsEN);
    setStyleKey(t.style);
    setWidth(t.width);
    setHeight(t.height);
    toast.message("テンプレを適用しました", { description: key });
  };

  const resetAll = () => {
    [
      "nbpb.project","nbpb.lang","nbpb.sceneJP","nbpb.detailsEN","nbpb.charName","nbpb.charTraits","nbpb.outfit","nbpb.colors","nbpb.composition","nbpb.lighting","nbpb.mood","nbpb.style","nbpb.extraStyle","nbpb.width","nbpb.height","nbpb.includeText","nbpb.embedText","nbpb.textHints","nbpb.useNegative","nbpb.negatives","nbpb.editMode","nbpb.notes"
    ].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  // --- UI ---
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-yellow-50 to-green-50 p-4 sm:p-6 md:p-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
          VibeCoding: Nano‑Banana プロンプトビルダー
        </motion.h1>
        <p className="text-xs sm:text-sm text-slate-600">シーンは日本語／ディテールは英語（推奨）。キャラ・サイズ・ネガティブを設定してコピペ。</p>

        {/* Guide */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2"><CardTitle>使い方ガイド（クイック）</CardTitle></CardHeader>
          <CardContent className="text-sm text-slate-700 space-y-2">
            <ol className="list-decimal pl-5 space-y-1">
              <li><b>シーン（日本語）</b>：場面を文章で。例「桜の木の下で微笑む…」</li>
              <li><b>詳細（英語）</b>：画風/構図/カメラ。例「waist-up, anime-style, soft lighting」</li>
              <li><b>キャラ一貫性</b>：名前・髪・目・メガネなどを固定語で。</li>
              <li><b>スタイル/サイズ</b>：用途にあわせ比率指定（例 1280×720）。</li>
              <li><b>ネガティブ</b>：手の崩れ/透かし/ノイズなどを除外。</li>
              <li><b>テキスト埋め込み</b>：日本語は引用符で（例 "AIコンテンツラボ"）。</li>
            </ol>
          </CardContent>
        </Card>

        {/* Responsive 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: Inputs */}
          <div className="lg:col-span-2 space-y-4">
            {/* Basics */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span>基本設定</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => applyTemplate("header")}><Wand2 className="mr-2 h-4 w-4"/>ヘッダー</Button>
                    <Button variant="outline" size="sm" onClick={() => applyTemplate("portrait")}>ポートレート</Button>
                    <Button variant="outline" size="sm" onClick={() => applyTemplate("manga")}>マンガ</Button>
                    <Button variant="outline" size="sm" onClick={() => applyTemplate("product")}>物撮り</Button>
                    <Button variant="outline" size="sm" onClick={() => applyTemplate("bgswap")}>背景差替</Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>プロジェクト名</Label>
                    <Input value={project} onChange={(e)=>setProject(e.target.value)} placeholder="例：noteヘッダー 9/1"/>
                    <p className="text-[11px] text-slate-500 mt-1">保存名としてJSONにも記録されます。</p>
                  </div>
                  <div>
                    <Label>言語モード</Label>
                    <Tabs value={langMode} onValueChange={(v)=>setLangMode(v as any)} className="mt-1">
                      <TabsList className="grid grid-cols-3">
                        <TabsTrigger value="jp-en">JP+EN</TabsTrigger>
                        <TabsTrigger value="jp">JPのみ</TabsTrigger>
                        <TabsTrigger value="en">ENのみ</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <p className="text-[11px] text-slate-500 mt-1">細かい表現は英語が安定。JP+EN推奨。</p>
                  </div>
                  <div>
                    <Label>スタイル</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full">{STYLE_PRESETS.find(s=>s.key===styleKey)?.name}</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {STYLE_PRESETS.map(s => (
                          <DropdownMenuItem key={s.key} onClick={()=>setStyleKey(s.key)}>{s.name}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <p className="text-[11px] text-slate-500 mt-1">プリセット＋下の「追加スタイル」で微調整。</p>
                  </div>
                </div>

                {langMode !== "en" && (
                  <div>
                    <Label>シーン説明（日本語）</Label>
                    <Textarea rows={3} value={sceneJP} onChange={(e)=>setSceneJP(e.target.value)} placeholder="例：桜の木の下で微笑む…"/>
                    <p className="text-[11px] text-slate-500 mt-1">情景は文章で。キーワード羅列よりも文脈重視。</p>
                  </div>
                )}

                {langMode !== "jp" && (
                  <div>
                    <Label>詳細（英語）</Label>
                    <Textarea rows={3} value={detailsEN} onChange={(e)=>setDetailsEN(e.target.value)} placeholder="e.g., waist-up, anime-style, soft lighting"/>
                    <p className="text-[11px] text-slate-500 mt-1">画角・画風・ライティングなどを英語で。</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>キャラ名</Label>
                    <Input value={charName} onChange={(e)=>setCharName(e.target.value)} placeholder="AIKON / same girl"/>
                    <p className="text-[11px] text-slate-500 mt-1">同一キャラ生成の基準名。固定推奨。</p>
                  </div>
                  <div>
                    <Label>特徴（英語推奨）</Label>
                    <Input value={charTraits} onChange={(e)=>setCharTraits(e.target.value)} placeholder="short bob hair, brown eyes, round glasses"/>
                    <p className="text-[11px] text-slate-500 mt-1">髪/目/輪郭/眼鏡など恒常要素は毎回同語句で。</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>衣装（英語推奨）</Label>
                    <Input value={outfit} onChange={(e)=>setOutfit(e.target.value)} placeholder="navy sailor uniform with a red ribbon"/>
                    <p className="text-[11px] text-slate-500 mt-1">衣装は具体的に。素材/柄/小物も有効。</p>
                  </div>
                  <div>
                    <Label>色（HEX対応）</Label>
                    <Input value={colors} onChange={(e)=>setColors(e.target.value)} placeholder="#ff99cc, #1e293b, white"/>
                    <p className="text-[11px] text-slate-500 mt-1">#HEXで安定。アクセント/ベースを併記。</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>構図（英語推奨）</Label>
                    <Input value={composition} onChange={(e)=>setComposition(e.target.value)} placeholder="eye-level, rule of thirds"/>
                    <p className="text-[11px] text-slate-500 mt-1">eye-level / low-angle / close-up 等。</p>
                  </div>
                  <div>
                    <Label>照明（英語推奨）</Label>
                    <Input value={lighting} onChange={(e)=>setLighting(e.target.value)} placeholder="soft daylight, rim light"/>
                    <p className="text-[11px] text-slate-500 mt-1">soft daylight / studio lighting など。</p>
                  </div>
                  <div>
                    <Label>雰囲気（日本語/英語可）</Label>
                    <Input value={mood} onChange={(e)=>setMood(e.target.value)} placeholder="cheerful, empowering"/>
                    <p className="text-[11px] text-slate-500 mt-1">作品のムードやトーン。</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label>追加スタイル</Label>
                    <Input value={extraStyle} onChange={(e)=>setExtraStyle(e.target.value)} placeholder="clean lineart, subtle gradients"/>
                    <p className="text-[11px] text-slate-500 mt-1">プリセットに重ねる補助形容。</p>
                  </div>
                  <div>
                    <Label>幅（px）</Label>
                    <Input type="number" value={width} onChange={(e)=>setWidth(parseInt(e.target.value||"0"))}/>
                    <p className="text-[11px] text-slate-500 mt-1">例：1280（noteヘッダー等）。</p>
                  </div>
                  <div>
                    <Label>高さ（px）</Label>
                    <Input type="number" value={height} onChange={(e)=>setHeight(parseInt(e.target.value||"0"))}/>
                    <p className="text-[11px] text-slate-500 mt-1">例：720（横長バナー）。</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <Switch checked={includeText} onCheckedChange={setIncludeText} id="includeText" />
                    <Label htmlFor="includeText">画像にテキストを載せる</Label>
                  </div>
                  <p className="text-[11px] text-slate-500">※ 日本語は引用符で "…" と囲むと崩れづらい</p>
                </div>
                {includeText && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label>テキスト内容</Label>
                      <Input value={embedText} onChange={(e)=>setEmbedText(e.target.value)} placeholder='"AIコンテンツラボ"'/>
                      <p className="text-[11px] text-slate-500 mt-1">ヘッドライン等を指定。</p>
                    </div>
                    <div>
                      <Label>配置/フォントのヒント（英語推奨）</Label>
                      <Input value={textHints} onChange={(e)=>setTextHints(e.target.value)} placeholder="headline at center, readable font"/>
                      <p className="text-[11px] text-slate-500 mt-1">例：center / top-left / bold etc.</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Switch checked={useNegative} onCheckedChange={setUseNegative} id="useNegative" />
                  <Label htmlFor="useNegative">ネガティブプロンプトを使う</Label>
                </div>
                {useNegative && (
                  <div>
                    <Textarea rows={2} value={negatives} onChange={(e)=>setNegatives(e.target.value)} />
                    <div className="flex flex-wrap gap-2 mt-2">
                      {NEGATIVE_PRESETS.map((p, i) => (
                        <Button key={i} variant="secondary" size="sm" onClick={()=>setNegatives(prev => (prev? prev+", ":"") + p)}>{p}</Button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">一文ごとにカンマ区切りで追加できます。</p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Switch checked={editMode} onCheckedChange={setEditMode} id="editMode" />
                  <Label htmlFor="editMode">編集モード（背景差替など）</Label>
                </div>
                <p className="text-[11px] text-slate-500">※ 元の人物の顔/髪を保持して背景だけ変更します。</p>
              </CardContent>
            </Card>

            {/* Notes & Export */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3"><CardTitle>メモ / エクスポート</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={3} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="メモ例：光源方向/影/彩度を背景に合わせる"/>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={resetAll}><RotateCcw className="mr-2 h-4 w-4"/>全リセット</Button>
                  <Button variant="outline" onClick={()=>copy(asPreset, "プリセットJSONをコピー")}> <Download className="mr-2 h-4 w-4"/>プリセットを書き出し（JSON）</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Outputs */}
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>品質メーター</span>
                  <span className="text-sm text-slate-500">{quality}%</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Slider value={[quality]} max={100} min={0} step={1} disabled />
                <p className="mt-2 text-xs text-slate-600">対象：シーン・詳細・キャラ・スタイル・サイズ・ネガ・文字</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle>Unified Prompt（nano‑banana汎用）</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea readOnly rows={12} value={unifiedPrompt} className="font-mono text-sm"/>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={()=>copy(unifiedPrompt)}><Copy className="mr-2 h-4 w-4"/>コピー</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle>Krea 用フィールド</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Label>Prompt</Label>
                <Textarea readOnly rows={8} value={kreaPrompt} className="font-mono text-sm"/>
                <Label className="mt-2">Negative Prompt</Label>
                <Textarea readOnly rows={5} value={kreaNegative} className="font-mono text-sm"/>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button variant="secondary" onClick={()=>copy(kreaPrompt, "Krea Promptをコピー")}> <Copy className="mr-2 h-4 w-4"/>Promptコピー</Button>
                  <Button variant="secondary" onClick={()=>copy(kreaNegative, "Krea Negativeをコピー")}> <Copy className="mr-2 h-4 w-4"/>Negativeコピー</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="pb-2"><CardTitle>プリセットJSON</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea readOnly rows={8} value={asPreset} className="font-mono text-xs"/>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={()=>copy(asPreset, "JSONをコピー")}> <FolderPlus className="mr-2 h-4 w-4"/>JSONコピー</Button>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        <footer className="text-center text-[11px] sm:text-xs text-slate-500 pt-4 pb-8">© VibeCoding Prompt Builder • v1 • {new Date().getFullYear()}</footer>
      </div>
    </div>
  );
}
