export default function AnnouncementBar({ text }: { text?: string }) {
  return (
    <div className="bg-ink text-white text-xs tracking-wider uppercase py-2 px-3 text-center border-b border-neutral-800">
      <p className="m-0 font-medium leading-snug">
        {text || 'Free standard delivery in Pakistan on orders over Rs. 15,000'}
      </p>
    </div>
  );
}
