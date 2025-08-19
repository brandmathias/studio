"use client";

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Send } from 'lucide-react';

interface VoicenotePreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  audioDataUri: string;
  customerName: string;
  whatsappUrl: string;
}

export default function VoicenotePreviewDialog({
  isOpen,
  onClose,
  onConfirm,
  audioDataUri,
  customerName,
}: VoicenotePreviewDialogProps) {

  const audioRef = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    if (isOpen && audioRef.current) {
      audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic /> Pratinjau Pesan Suara
          </DialogTitle>
          <DialogDescription>
            Ini adalah pratinjau pesan suara yang akan dibuat untuk <strong>{customerName}</strong>. Klik kirim untuk membuka WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4">
          <audio ref={audioRef} controls src={audioDataUri} className="w-full">
            Your browser does not support the audio element.
          </audio>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={onConfirm}>
            <Send className="mr-2 h-4 w-4" />
            Kirim Notifikasi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
