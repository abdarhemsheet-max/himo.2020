import { CheckCircle2, ExternalLink, MapPin, X } from 'lucide-react';
import { generateGoogleMapsUrl } from '../lib/utils/geo';
import type { OsmMosqueCandidate } from '../types/mosque';

interface OsmCandidateSheetProps {
  candidate: OsmMosqueCandidate | null;
  onClose: () => void;
  onVerifyAndDocument: (candidate: OsmMosqueCandidate) => void;
}

export function OsmCandidateSheet({
  candidate,
  onClose,
  onVerifyAndDocument,
}: OsmCandidateSheetProps) {
  if (!candidate) return null;

  const mapsUrl = generateGoogleMapsUrl(candidate.lat, candidate.lng);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/45 backdrop-blur-xs flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl border border-[#E5E2D9] shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-[#D8D4C8]" />
        </div>

        <div className="px-5 py-3.5 border-b border-[#EFECE4] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#EA4335]">مسجد مرصود على الخريطة (بانتظار التوثيق)</p>
            <h2 className="text-lg font-bold text-[#1A2421] mt-0.5 leading-snug">
              {candidate.name}
            </h2>
            <p className="text-xs text-[#5A6561] mt-1 flex items-center gap-1 tabular-nums">
              <MapPin className="w-3.5 h-3.5 text-[#EA4335] shrink-0" />
              <span>
                {candidate.lat.toFixed(6)}, {candidate.lng.toFixed(6)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="min-h-[44px] min-w-[44px] rounded-xl text-[#5A6561] hover:bg-[#FAF8F4] flex items-center justify-center shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-[#4A5552] leading-relaxed">
            راجع اسم المسجد وموقعه: إذا كان الاسم صحيحاً أو يحتاج تعديلاً، اضغط{' '}
            <strong className="text-[#0F4C3A]">«مراجعة وتوثيق في المنظومة»</strong>{' '}
            لتصحيح الاسم وإضافة المحلة والعلامة الدالة والصور وحفظه رسمياً. كما يمكنك فتحه في خرائط جوجل لإرسال تعديل هناك إذا لزم.
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => onVerifyAndDocument(candidate)}
              className="w-full h-12 rounded-xl bg-[#0F4C3A] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0B3A2C] active:scale-[0.98] transition"
            >
              <CheckCircle2 className="w-4 h-4 text-[#C9A24B]" />
              <span>مراجعة وتوثيق في المنظومة</span>
            </button>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 rounded-xl bg-white border border-[#D8D4C8] text-[#1A2421] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#FAF8F4] transition"
            >
              <ExternalLink className="w-4 h-4 text-[#0F4C3A]" />
              <span>فتح في خرائط جوجل (للمراجعة أو التعديل)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
