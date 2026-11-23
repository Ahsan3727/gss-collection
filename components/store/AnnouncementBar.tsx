import Link from 'next/link';

export default function AnnouncementBar({ text }: { text?: string }) {
  return (
    <div className="bg-ink text-white text-[12px] tracking-widest uppercase py-2 px-4 text-center border-b border-neutral-800">
      <p className="m-0 font-medium">
        {text || 'Free standard delivery in Pakistan on orders over Rs. 15,000'}
      </p>
    </div>
  );
}
