'use client';

import { useState } from 'react';
import type { ReviewRecord } from '@/lib/types';

interface ProductReviewsProps {
  productId: string;
  initialReviews: ReviewRecord[];
}

export default function ProductReviews({ productId, initialReviews }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<ReviewRecord[]>(initialReviews);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFeedback('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, name: name.trim(), rating, comment: comment.trim() }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        review?: ReviewRecord;
      };
      if (!res.ok) {
        setError(data.error || 'Could not submit review.');
        setSubmitting(false);
        return;
      }

      if (data.review && data.review.approved) {
        setReviews((prev) => [data.review!, ...prev]);
      }
      setFeedback(data.message || 'Thank you for your review.');
      setName('');
      setComment('');
      setRating(5);
      setShowForm(false);
    } catch {
      setError('Network error submitting review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-labelledby="reviews-heading" className="mt-16 pt-12 border-t border-line">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-xs uppercase tracking-[0.18em] text-ink-2 font-medium block mb-1">
            Client Feedback
          </span>
          <h2 id="reviews-heading" className="font-display text-2xl md:text-3xl text-ink font-normal">
            Customer Reviews ({reviews.length})
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="border border-ink text-ink px-5 min-h-[44px] text-xs uppercase tracking-[0.16em] font-medium hover:bg-ground transition self-start sm:self-auto"
        >
          {showForm ? 'Cancel' : 'Write a Review'}
        </button>
      </div>

      {feedback && (
        <div role="status" className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm">
          {feedback}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-10 bg-ground border border-line p-5 sm:p-6 space-y-4 max-w-xl">
          {error && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 text-error text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="review-name" className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
              Your Name
            </label>
            <input
              id="review-name"
              type="text"
              required
              minLength={2}
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ayesha K."
              className="w-full px-3.5 min-h-[48px] bg-white border border-line text-base focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <span className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
              Rating
            </span>
            <div className="flex gap-1.5" role="group" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-pressed={rating === star}
                  aria-label={`${star} star${star === 1 ? '' : 's'}`}
                  className={`min-w-[44px] min-h-[44px] border text-sm font-semibold transition ${
                    rating >= star
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink-2 border-line'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="review-comment" className="block text-xs uppercase tracking-wider font-semibold text-ink mb-1.5">
              Your Experience
            </label>
            <textarea
              id="review-comment"
              required
              minLength={3}
              maxLength={1000}
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share how the stone, sizing, and silver finish look in person..."
              className="w-full p-3.5 bg-white border border-line text-base focus:outline-none focus:border-ink"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-ink text-white px-7 min-h-[48px] text-xs uppercase tracking-[0.18em] font-semibold hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Post Review'}
          </button>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-ink-2">No reviews yet. Be the first to share your thoughts on this piece.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {reviews.map((rev) => (
            <article key={rev._id} className="border border-line bg-white p-5">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-semibold text-sm text-ink">{rev.name}</span>
                <span className="text-xs font-semibold text-gold" aria-label={`${rev.rating} out of 5 stars`}>
                  {'★'.repeat(rev.rating)}
                </span>
              </div>
              <p className="text-sm text-ink-2 leading-relaxed">{rev.comment}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
