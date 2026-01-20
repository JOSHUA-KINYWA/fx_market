"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";

type Trade = Database["public"]["Tables"]["trades"]["Row"];
type EmotionTag = Database["public"]["Tables"]["emotion_tags"]["Row"];
type MistakeTag = Database["public"]["Tables"]["mistake_tags"]["Row"];

interface TradeNotesProps {
  readonly trade: Trade;
}

const parseNotes = (notesText: string | null) => {
  if (!notesText) return { notes: "", winReason: "", lossReason: "" };
  
  const winMatch = /WIN REASON:\s*(.+?)(?:\n|$)/i.exec(notesText);
  const lossMatch = /LOSS REASON:\s*(.+?)(?:\n|$)/i.exec(notesText);
  
  let notes = notesText;
  if (winMatch) notes = notes.replace(/WIN REASON:.*?(?:\n|$)/i, "");
  if (lossMatch) notes = notes.replace(/LOSS REASON:.*?(?:\n|$)/i, "");
  notes = notes.replace(/EMOTIONS:.*?(?:\n|$)/i, "");
  notes = notes.replace(/MISTAKES:.*?(?:\n|$)/i, "");
  notes = notes.trim();

  return {
    notes,
    winReason: winMatch ? winMatch[1].trim() : "",
    lossReason: lossMatch ? lossMatch[1].trim() : "",
  };
};

export function TradeNotes({ trade }: TradeNotesProps) {
  const router = useRouter();
  const parsed = parseNotes(trade.notes);
  const [notes, setNotes] = useState(parsed.notes);
  const [winReason, setWinReason] = useState(parsed.winReason);
  const [lossReason, setLossReason] = useState(parsed.lossReason);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emotionTags, setEmotionTags] = useState<EmotionTag[]>([]);
  const [mistakeTags, setMistakeTags] = useState<MistakeTag[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);

  useEffect(() => {
    loadTags();
    loadTradeData();
  }, [trade.id]);

  const loadTags = async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const [emotionsRes, mistakesRes] = await Promise.all([
      supabase.from("emotion_tags").select("*").eq("user_id", user.id).order("name"),
      supabase.from("mistake_tags").select("*").eq("user_id", user.id).order("name"),
    ]);

    if (emotionsRes.data) setEmotionTags(emotionsRes.data);
    if (mistakesRes.data) setMistakeTags(mistakesRes.data);
  };

  const loadTradeData = async () => {
    const supabase = createClient();
    
    // Load emotions
    const { data: emotions } = await supabase
      .from("trade_emotions")
      .select("emotion_id")
      .eq("trade_id", trade.id);
    
    if (emotions) {
      setSelectedEmotions(emotions.map((e) => e.emotion_id));
    }

    // Load mistakes
    const { data: mistakes } = await supabase
      .from("trade_mistakes")
      .select("mistake_id")
      .eq("trade_id", trade.id);
    
    if (mistakes) {
      setSelectedMistakes(mistakes.map((m) => m.mistake_id));
    }
  };

  const toggleEmotion = (emotionId: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotionId)
        ? prev.filter((id) => id !== emotionId)
        : [...prev, emotionId]
    );
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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Build comprehensive notes
      const fullNotes = [
        notes,
        trade.profit_loss && trade.profit_loss > 0 && winReason
          ? `\n\nWIN REASON: ${winReason}`
          : "",
        trade.profit_loss && trade.profit_loss < 0 && lossReason
          ? `\n\nLOSS REASON: ${lossReason}`
          : "",
        selectedEmotions.length > 0
          ? `\n\nEMOTIONS: ${selectedEmotions
              .map((id) => emotionTags.find((e) => e.id === id)?.name)
              .filter(Boolean)
              .join(", ")}`
          : "",
        selectedMistakes.length > 0
          ? `\n\nMISTAKES: ${selectedMistakes
              .map((id) => mistakeTags.find((m) => m.id === id)?.name)
              .filter(Boolean)
              .join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("");

      // Update trade notes
      await supabase
        .from("trades")
        .update({ notes: fullNotes || null })
        .eq("id", trade.id);

      // Update emotions
      await supabase.from("trade_emotions").delete().eq("trade_id", trade.id);
      if (selectedEmotions.length > 0) {
        await supabase.from("trade_emotions").insert(
          selectedEmotions.map((emotionId) => ({
            trade_id: trade.id,
            emotion_id: emotionId,
            timing: "post_trade",
          }))
        );
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

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        router.refresh();
      }, 1500);
    } catch (err: any) {
      console.error("Error saving notes:", err);
    } finally {
      setLoading(false);
    }
  };

  const isWin = !!(trade.profit_loss && trade.profit_loss > 0);
  const isLoss = !!(trade.profit_loss && trade.profit_loss < 0);

  return (
    <div className="bg-white shadow rounded-lg p-6 space-y-6">
      <h2 className="text-xl font-semibold text-slate-900">Trade Analysis & Notes</h2>

      {/* Win/Loss Reason */}
      {isWin && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Why did this trade win? *
          </label>
          <textarea
            rows={3}
            value={winReason}
            onChange={(e) => setWinReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Explain what went right - strategy execution, market conditions, timing, etc."
          />
        </div>
      )}

      {isLoss && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Why did this trade lose? *
          </label>
          <textarea
            rows={3}
            value={lossReason}
            onChange={(e) => setLossReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Explain what went wrong - execution errors, market conditions, psychology, etc."
          />
        </div>
      )}

      {/* General Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Additional Notes
        </label>
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          placeholder="Any additional observations, lessons learned, or insights..."
        />
      </div>

      {/* Psychology Tags */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Post-Trade Emotions
        </label>
        <div className="flex flex-wrap gap-2">
          {emotionTags.map((emotion) => (
            <button
              key={emotion.id}
              type="button"
              onClick={() => toggleEmotion(emotion.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedEmotions.includes(emotion.id)
                  ? "text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              style={
                selectedEmotions.includes(emotion.id) && emotion.color
                  ? { backgroundColor: emotion.color }
                  : {}
              }
            >
              {emotion.name}
            </button>
          ))}
        </div>
      </div>

      {/* Mistakes Tags */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Mistakes Made (if any)
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
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {mistake.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || (isWin && !winReason) || (isLoss && !lossReason)}>
          {loading ? "Saving..." : saved ? "Saved!" : "Save Analysis"}
        </Button>
      </div>
    </div>
  );
}

