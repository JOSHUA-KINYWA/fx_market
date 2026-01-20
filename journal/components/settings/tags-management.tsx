"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Database } from "@/types/database.types";

type EmotionTag = Database["public"]["Tables"]["emotion_tags"]["Row"];
type MistakeTag = Database["public"]["Tables"]["mistake_tags"]["Row"];

export function TagsManagement() {
  const [emotionTags, setEmotionTags] = useState<EmotionTag[]>([]);
  const [mistakeTags, setMistakeTags] = useState<MistakeTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEmotionName, setNewEmotionName] = useState("");
  const [newEmotionColor, setNewEmotionColor] = useState("#3B82F6");
  const [newMistakeName, setNewMistakeName] = useState("");
  const [newMistakeDesc, setNewMistakeDesc] = useState("");

  useEffect(() => {
    loadTags();
  }, []);

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

  const addEmotionTag = async () => {
    if (!newEmotionName.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("emotion_tags").insert({
      user_id: user.id,
      name: newEmotionName.trim(),
      color: newEmotionColor,
      is_default: false,
    });

    if (!error) {
      setNewEmotionName("");
      loadTags();
    }
    setLoading(false);
  };

  const addMistakeTag = async () => {
    if (!newMistakeName.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("mistake_tags").insert({
      user_id: user.id,
      name: newMistakeName.trim(),
      description: newMistakeDesc.trim() || null,
      is_default: false,
    });

    if (!error) {
      setNewMistakeName("");
      setNewMistakeDesc("");
      loadTags();
    }
    setLoading(false);
  };

  const deleteEmotionTag = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    setLoading(true);
    const supabase = createClient();
    await supabase.from("emotion_tags").delete().eq("id", id);
    loadTags();
    setLoading(false);
  };

  const deleteMistakeTag = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    setLoading(true);
    const supabase = createClient();
    await supabase.from("mistake_tags").delete().eq("id", id);
    loadTags();
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Emotion Tags */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotion Tags</h3>
        
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newEmotionName}
            onChange={(e) => setNewEmotionName(e.target.value)}
            placeholder="Tag name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <input
            type="color"
            value={newEmotionColor}
            onChange={(e) => setNewEmotionColor(e.target.value)}
            className="h-10 w-20 border border-gray-300 rounded-md cursor-pointer"
          />
          <Button onClick={addEmotionTag} disabled={loading || !newEmotionName.trim()}>
            Add
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {emotionTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
              style={{ backgroundColor: tag.color || "#3B82F6", color: "white" }}
            >
              <span>{tag.name}</span>
              {!tag.is_default && (
                <button
                  onClick={() => deleteEmotionTag(tag.id)}
                  className="ml-1 hover:opacity-75"
                  disabled={loading}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Mistake Tags */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Mistake Tags</h3>
        
        <div className="mb-4 space-y-2">
          <input
            type="text"
            value={newMistakeName}
            onChange={(e) => setNewMistakeName(e.target.value)}
            placeholder="Tag name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <textarea
            value={newMistakeDesc}
            onChange={(e) => setNewMistakeDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <Button onClick={addMistakeTag} disabled={loading || !newMistakeName.trim()}>
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {mistakeTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div>
                <div className="font-medium text-gray-900">{tag.name}</div>
                {tag.description && (
                  <div className="text-sm text-gray-500">{tag.description}</div>
                )}
              </div>
              {!tag.is_default && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMistakeTag(tag.id)}
                  disabled={loading}
                >
                  Delete
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}



