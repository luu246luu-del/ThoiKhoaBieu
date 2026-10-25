import { Quote, Sparkles } from 'lucide-react';
import { quoteForDay } from '@/data/daily-quotes';

/**
 * Một câu ca dao, tục ngữ hoặc lời nhắn động lực mỗi ngày.
 * day được Dashboard truyền xuống theo múi giờ Việt Nam.
 * Không phát sinh request mạng hay ghi dữ liệu người dùng.
 */
export function DailyQuoteCard({ day }: { day: string }) {
  const quote = quoteForDay(day);

  return (
    <section
      aria-label="Câu nói hôm nay"
      className="group relative isolate overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.10] via-surface-elevated to-accent/[0.07] px-5 py-4 shadow-sm transition-colors duration-300 hover:border-primary/35 sm:px-6 sm:py-5"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-20 h-48 w-48 rounded-full bg-primary/[0.12] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-1/4 h-20 w-44 rounded-full bg-accent/[0.05] blur-2xl" />
      <div className="relative z-10 flex items-start gap-4 sm:gap-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-sm">
          <Quote className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary sm:text-[11px]">
              Mỗi ngày một câu hay
            </span>
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-accent" />
          </div>
          <blockquote className="max-w-3xl text-base font-semibold leading-relaxed tracking-tight text-foreground sm:text-lg">
            “{quote.text}”
          </blockquote>
          <p className="text-xs text-muted-foreground">{quote.category} · Tự đổi mỗi ngày</p>
        </div>
      </div>
    </section>
  );
}
