import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { toast } from "sonner";
import { submitFeedback } from "../lib/api";

export function FeedbackModal({ isOpen, onClose, type = 'feedback' }) {
  const [content, setContent] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setLoading(true);
    try {
      await submitFeedback({
        type,
        content,
        email: email || undefined
      });
      toast.success(`${type === 'feedback' ? 'Feedback' : 'Feature request'} submitted successfully!`);
      setContent('');
      setEmail('');
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#09090B] border-[#27272A] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {type === 'feedback' ? 'Give Feedback' : 'Request a Feature'}
          </DialogTitle>
          <DialogDescription className="text-[#A1A1AA]">
            {type === 'feedback' 
              ? "We'd love to hear your thoughts on how we can improve."
              : "Tell us what feature you'd like to see next in Roastmaster.ai"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A1A1AA]">Email (Optional)</label>
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-[#18181B] border-[#27272A] focus:border-[#FFD60A] text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#A1A1AA]">
              {type === 'feedback' ? 'Your Feedback' : 'Feature Description'}
            </label>
            <Textarea
              placeholder={type === 'feedback' ? "What's on your mind?" : "Describe the feature..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-[#18181B] border-[#27272A] focus:border-[#FFD60A] text-white min-h-[120px]"
              required
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-[#FFD60A] hover:bg-[#FFD60A]/90 text-black font-bold"
            >
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
