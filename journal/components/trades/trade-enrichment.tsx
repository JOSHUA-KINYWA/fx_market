"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type EmotionTag = Database["public"]["Tables"]["emotion_tags"]["Row"];
type MistakeTag = Database["public"]["Tables"]["mistake_tags"]["Row"];

interface TradeEnrichmentProps {
  readonly trade: Trade;
}

export function TradeEnrichment({ trade }: TradeEnrichmentProps) {
  const [emotionTags, setEmotionTags] = useState<EmotionTag[]>([]);
  const [mistakeTags, setMistakeTags] = useState<MistakeTag[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<{
    pre_trade: string[];
    during_trade: string[];
    post_trade: string[];
  }>({
    pre_trade: [],
    during_trade: [],
    post_trade: [],
  });
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [convictionLevel, setConvictionLevel] = useState(trade.conviction_level || 5);
  const [executionRating, setExecutionRating] = useState(trade.execution_rating || 5);
  const [ruleFollowed, setRuleFollowed] = useState(trade.rule_followed ?? null);
  const [marketConditions, setMarketConditions] = useState(trade.market_conditions || "");
  const [lessonsLearned, setLessonsLearned] = useState(trade.lessons_learned || "");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadTags();
    loadTradeEmotions();
    loadTradeMistakes();
  }, [trade.id]);

  const loadTags = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const [emotionsRes, mistakesRes] = await Promise.all([
      supabase.from("emotion_tags").select("*").eq("user_id", user.id),
      supabase.from("mistake_tags").select("*").eq("user_id", user.id),
    ]);

    if (emotionsRes.data) setEmotionTags(emotionsRes.data);
    if (mistakesRes.data) setMistakeTags(mistakesRes.data);
  };

  const loadTradeEmotions = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("trade_emotions")
      .select("emotion_id, timing")
      .eq("trade_id", trade.id);

    if (data) {
      const grouped = {
        pre_trade: data.filter((e) => e.timing === "pre_trade").map((e) => e.emotion_id),
        during_trade: data.filter((e) => e.timing === "during_trade").map((e) => e.emotion_id),
        post_trade: data.filter((e) => e.timing === "post_trade").map((e) => e.emotion_id),
      };
      setSelectedEmotions(grouped);
    }
  };

  const loadTradeMistakes = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("trade_mistakes")
      .select("mistake_id")
      .eq("trade_id", trade.id);

    if (data) {
      setSelectedMistakes(data.map((m) => m.mistake_id));
    }
  };

  const toggleEmotion = (emotionId: string, timing: "pre_trade" | "during_trade" | "post_trade") => {
    setSelectedEmotions((prev) => ({
      ...prev,
      [timing]: prev[timing].includes(emotionId)
        ? prev[timing].filter((id) => id !== emotionId)
        : [...prev[timing], emotionId],
    }));
  };

  const toggleMistake = (mistakeId: string) => {
    setSelectedMistakes((prev) =>
      prev.includes(mistakeId)
        ? prev.filter((id) => id !== mistakeId)
        : [...prev, mistakeId]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    setSaved(false);

    const supabase = createClient();

    // Update trade fields
    await supabase
      .from("trades")
      .update({
        conviction_level: convictionLevel,
        execution_rating: executionRating,
        rule_followed: ruleFollowed,
        market_conditions: marketConditions || null,
        lessons_learned: lessonsLearned || null,
      })
      .eq("id", trade.id);

    // Update emotions
    // Delete existing
    await supabase.from("trade_emotions").delete().eq("trade_id", trade.id);

    // Insert new
    const emotionInserts = [];
    for (const timing of ["pre_trade", "during_trade", "post_trade"] as const) {
      for (const emotionId of selectedEmotions[timing]) {
        emotionInserts.push({
          trade_id: trade.id,
          emotion_id: emotionId,
          timing,
        });
      }
    }
    if (emotionInserts.length > 0) {
      await supabase.from("trade_emotions").insert(emotionInserts);
    }

    // Update mistakes
    await supabase.from("trade_mistakes").delete().eq("trade_id", trade.id);
    if (selectedMistakes.length > 0) {
      await supabase.from("trade_mistakes").insert(
        selectedMistakes.map((mistakeId) => ({
          trade_id: trade.id,
          mistake_id: mistakeId,
        }))
      );
    }

    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Psychology & Context</h2>

      {/* Conviction Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Conviction Level: {convictionLevel}/10
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={convictionLevel}
          onChange={(e) => setConvictionLevel(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>

      {/* Pre-Trade Emotions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pre-Trade Emotions
        </label>
        <div className="flex flex-wrap gap-2">
          {emotionTags.map((emotion) => (
            <button
              key={emotion.id}
              type="button"
              onClick={() => toggleEmotion(emotion.id, "pre_trade")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedEmotions.pre_trade.includes(emotion.id)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={
                selectedEmotions.pre_trade.includes(emotion.id) && emotion.color
                  ? { backgroundColor: emotion.color }
                  : {}
              }
            >
              {emotion.name}
            </button>
          ))}
        </div>
      </div>

      {/* During Trade Emotions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          During Trade Emotions
        </label>
        <div className="flex flex-wrap gap-2">
          {emotionTags.map((emotion) => (
            <button
              key={emotion.id}
              type="button"
              onClick={() => toggleEmotion(emotion.id, "during_trade")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedEmotions.during_trade.includes(emotion.id)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={
                selectedEmotions.during_trade.includes(emotion.id) && emotion.color
                  ? { backgroundColor: emotion.color }
                  : {}
              }
            >
              {emotion.name}
            </button>
          ))}
        </div>
      </div>

      {/* Post-Trade Emotions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Post-Trade Emotions
        </label>
        <div className="flex flex-wrap gap-2">
          {emotionTags.map((emotion) => (
            <button
              key={emotion.id}
              type="button"
              onClick={() => toggleEmotion(emotion.id, "post_trade")}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedEmotions.post_trade.includes(emotion.id)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              style={
                selectedEmotions.post_trade.includes(emotion.id) && emotion.color
                  ? { backgroundColor: emotion.color }
                  : {}
              }
            >
              {emotion.name}
            </button>
          ))}
        </div>
      </div>

      {/* Mistakes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mistakes Made
        </label>
        <div className="flex flex-wrap gap-2">
          {mistakeTags.map((mistake) => (
            <button
              key={mistake.id}
              type="button"
              onClick={() => toggleMistake(mistake.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedMistakes.includes(mistake.id)
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {mistake.name}
            </button>
          ))}
        </div>
      </div>

      {/* Rule Followed */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Followed Trading Plan?
        </label>
        <div className="flex gap-4">
          <label className="flex items-center">
            <input
              type="radio"
              name="rule_followed"
              value="true"
              checked={ruleFollowed === true}
              onChange={() => setRuleFollowed(true)}
              className="mr-2"
            />
            <span className="text-gray-700">Yes</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="rule_followed"
              value="false"
              checked={ruleFollowed === false}
              onChange={() => setRuleFollowed(false)}
              className="mr-2"
            />
            <span className="text-gray-700">No</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="rule_followed"
              value="null"
              checked={ruleFollowed === null}
              onChange={() => setRuleFollowed(null)}
              className="mr-2"
            />
            <span className="text-gray-700">N/A</span>
          </label>
        </div>
      </div>

      {/* Execution Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Execution Rating: {executionRating}/10
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={executionRating}
          onChange={(e) => setExecutionRating(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {/* Market Conditions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Market Conditions
        </label>
        <textarea
          rows={3}
          value={marketConditions}
          onChange={(e) => setMarketConditions(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Describe market conditions..."
        />
      </div>

      {/* Lessons Learned */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lessons Learned
        </label>
        <textarea
          rows={4}
          value={lessonsLearned}
          onChange={(e) => setLessonsLearned(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="What did you learn from this trade?"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : saved ? "Saved!" : "Save Psychology Data"}
        </Button>
      </div>
    </div>
  );
}

