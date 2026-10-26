"use client";

import { useEffect, useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { getProductReviews, submitReview, type ReviewsData } from "@/server/reviews";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

function Stars({ value, size = "w-4 h-4", onChange }: { value: number; size?: string; onChange?: (n: number) => void }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const star = (
          <Star
            className={`${size} ${n <= value ? "fill-[#1a1a1a] text-[#1a1a1a]" : "text-stone-300"}`}
            strokeWidth={1.4}
          />
        );
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`} className="cursor-pointer">
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}

export default function ProductReviews({ slug }: { slug: string }) {
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = async () => {
    const res = await getProductReviews(slug);
    if (res.ok) {
      setData(res.data);
      return res.data;
    }
    setLoadError(res.error);
    return null;
  };

  useEffect(() => {
    let active = true;
    getProductReviews(slug)
      .then((res) => {
        if (!active) return;
        if (!res.ok) return setLoadError(res.error);
        setData(res.data);
        // Links from the order page open the form straight away: ?review=1
        const wantsForm = new URLSearchParams(window.location.search).get("review") === "1";
        if (wantsForm && res.data.viewer.canReview && !res.data.viewer.hasReviewed) setShowForm(true);
      })
      .catch(() => active && setLoadError("Could not load reviews."));
    return () => {
      active = false;
    };
  }, [slug]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) {
      setFormError("Please write a few words about the product.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const res = await submitReview({ slug, rating, title: title.trim(), body: body.trim() });
      if (!res.ok) {
        setFormError(res.error);
        return;
      }
      setShowForm(false);
      setTitle("");
      setBody("");
      setRating(5);
      await load();
    } catch {
      setFormError("Could not save your review. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return null; // reviews are optional: never break the product page

  if (!data) {
    return (
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-14 md:py-20">
        <div className="h-64 max-w-3xl border border-stone-100 animate-pulse" />
      </section>
    );
  }

  const { reviews, average, count, viewer } = data;

  return (
    <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-14 md:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>Reviews</h2>
          <div className="flex items-center gap-3 mt-3">
            <Stars value={Math.round(average)} />
            <p className="text-sm text-stone-500">{average.toFixed(1)} · {count} review{count === 1 ? "" : "s"}</p>
          </div>
          <p className="text-xs text-stone-400 mt-1">Only customers who received this product in a delivered order can leave a review.</p>
        </div>
        {viewer.canReview && !viewer.hasReviewed && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-xs tracking-[0.2em] uppercase border border-foreground px-6 py-3 hover:bg-foreground hover:text-background transition-colors"
          >
            Write a review
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="border border-stone-200 p-6 mt-8 max-w-xl space-y-4">
          <div>
            <p className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Your rating</p>
            <Stars value={rating} size="w-6 h-6" onChange={setRating} />
          </div>
          <div>
            <label htmlFor="review-title" className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Title (optional)</label>
            <input
              id="review-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full px-3 text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Sum it up in a few words"
            />
          </div>
          <div>
            <label htmlFor="review-body" className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Review</label>
            <textarea
              id="review-body"
              value={body}
              maxLength={2000}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm bg-background border border-input focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="What did you think of the fit, quality and style?"
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="h-11 px-8 bg-foreground text-background text-xs tracking-[0.2em] uppercase disabled:opacity-60">
              {saving ? "Saving…" : "Submit review"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="h-11 px-8 border border-stone-300 text-xs tracking-[0.2em] uppercase hover:border-foreground transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {viewer.canReview && viewer.hasReviewed && !showForm && (
        <p className="text-sm text-stone-400 mt-6">You have already reviewed this product.</p>
      )}

      <div className="divide-y divide-stone-200 border-t border-stone-200 mt-8">
        {reviews.length === 0 ? (
          <p className="py-10 text-sm text-stone-400">No reviews yet.</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="py-6">
              <div className="flex flex-wrap items-center gap-3">
                <Stars value={r.rating} />
                {r.title && <p className="text-sm font-medium text-[#1a1a1a]">{r.title}</p>}
                <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.15em] uppercase text-[#2D5A27]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified purchase
                </span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed mt-2 whitespace-pre-line">{r.body}</p>
              <p className="text-xs text-stone-400 mt-2">{r.customerName || "Customer"} · {fmtDate(r.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
