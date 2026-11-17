import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { LeafletMap } from '../components/LeafletMap';
import { MosqueDetailSheet } from '../components/MosqueDetailSheet';
import { MosqueFormModal } from '../components/MosqueFormModal';
import { OsmCandidateSheet } from '../components/OsmCandidateSheet';
import { QARABULLI_CENTER } from '../lib/utils/geo';
import type { MosqueRecord, OsmMosqueCandidate, UserProfile } from '../types/mosque';

interface GeneralMapPageProps {
  mosques: MosqueRecord[];
  osmCandidates: OsmMosqueCandidate[];
  currentUser: UserProfile;
  onEditMosque: (mosque: MosqueRecord) => void;
}

export function GeneralMapPage({
  mosques,
  osmCandidates,
  currentUser,
  onEditMosque,
}: GeneralMapPageProps) {
  const [selectedMosqueId, setSelectedMosqueId] = useState<string | null>(null);
  const [selectedOsm, setSelectedOsm] = useState<OsmMosqueCandidate | null>(null);
  const [editingInMap, setEditingInMap] = useState<MosqueRecord | null>(null);
  const [creatingFromOsm, setCreatingFromOsm] = useState<OsmMosqueCandidate | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [focusLocation, setFocusLocation] = useState<{
    lat: number;
    lng: number;
    trigger: number;
  } | null>(null);

  const selectedMosque = useMemo(
    () => mosques.find((m) => m.id === selectedMosqueId) ?? null,
    [mosques, selectedMosqueId]
  );

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    const documented = mosques
      .filter(
        (m) =>
          m.officialName.toLowerCase().includes(q) ||
          m.commonName.toLowerCase().includes(q) ||
          m.locality.toLowerCase().includes(q)
      )
      .map((m) => ({ type: 'documented' as const, id: m.id, name: m.officialName, sub: m.locality, lat: m.lat, lng: m.lng, mosque: m }));

    const unverified = osmCandidates
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({ type: 'osm' as const, id: c.osmId, name: c.name, sub: 'مسجّل على الخريطة (بانتظار التوثيق)', lat: c.lat, lng: c.lng, cand: c }));

    return [...documented, ...unverified].slice(0, 6);
  }, [mosques, osmCandidates, searchTerm]);

  return (
    <div className="relative flex-1 w-full min-h-[calc(100dvh-6.5rem)] pb-14 overflow-hidden">
      <div className="absolute inset-0 bottom-14">
        <LeafletMap
          mode="cluster"
          center={QARABULLI_CENTER}
          zoom={13}
          mosques={mosques}
          osmCandidates={osmCandidates}
          focusLocation={focusLocation}
          onSelectMosque={(mosque) => setSelectedMosqueId(mosque.id)}
          onSelectOsmCandidate={(cand) => setSelectedOsm(cand)}
        />
      </div>

      {/* Google Maps-style Floating Search Bar */}
      <div className="absolute top-16 left-3 right-3 sm:top-3 sm:right-auto sm:left-14 sm:w-80 z-[400]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6561] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث عن مسجد في الخريطة..."
            className="w-full h-11 pr-9 pl-8 rounded-xl bg-white/95 backdrop-blur-md border border-[#D8D4C8] text-base sm:text-sm shadow-md focus:outline-none focus:border-[#0F4C3A]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              aria-label="مسح البحث"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-[#5A6561]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-1.5 bg-white/98 backdrop-blur-md border border-[#D8D4C8] rounded-xl shadow-lg divide-y divide-[#EFECE4] overflow-hidden">
            {searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setFocusLocation({ lat: item.lat, lng: item.lng, trigger: Date.now() });
                  if (item.type === 'documented') {
                    setSelectedMosqueId(item.id);
                  } else {
                    setSelectedOsm(item.cand);
                  }
                }}
                className="w-full text-right px-3.5 py-2.5 hover:bg-[#FAF8F4] transition flex flex-col"
              >
                <span className="text-sm font-bold text-[#0F4C3A] truncate">
                  {item.name}
                </span>
                <span className="text-xs text-[#5A6561] truncate">{item.sub}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quiet count indicator */}
      <div className="absolute bottom-[4.25rem] right-3 z-[400] px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5E2D9] shadow-sm text-xs font-bold text-[#0F4C3A] tabular-nums">
        موثّق: {mosques.length}
        {osmCandidates.length > 0 ? ` · على الخريطة: ${osmCandidates.length}` : ''}
      </div>

      <MosqueDetailSheet
        mosque={selectedMosque}
        currentUser={currentUser}
        onClose={() => setSelectedMosqueId(null)}
        onEdit={(mosque) => {
          setSelectedMosqueId(null);
          setEditingInMap(mosque);
        }}
        onMovePin={(mosque) => {
          setSelectedMosqueId(null);
          onEditMosque(mosque);
        }}
      />

      <OsmCandidateSheet
        candidate={selectedOsm}
        onClose={() => setSelectedOsm(null)}
        onVerifyAndDocument={(cand) => {
          setSelectedOsm(null);
          setCreatingFromOsm(cand);
        }}
      />

      {/* In-place Edit or Document-from-OSM Modal right inside Map tab */}
      <MosqueFormModal
        open={Boolean(editingInMap || creatingFromOsm)}
        editingMosque={editingInMap}
        initialLat={editingInMap?.lat ?? creatingFromOsm?.lat ?? QARABULLI_CENTER.lat}
        initialLng={editingInMap?.lng ?? creatingFromOsm?.lng ?? QARABULLI_CENTER.lng}
        initialAccuracy={editingInMap?.accuracy ?? 10}
        prefillName={
          creatingFromOsm && creatingFromOsm.name !== 'مسجد مسجّل على الخريطة'
            ? creatingFromOsm.name
            : ''
        }
        existingMosques={mosques}
        currentUser={currentUser}
        onClose={() => {
          setEditingInMap(null);
          setCreatingFromOsm(null);
        }}
        onSwitchToEditExisting={(existing) => {
          setCreatingFromOsm(null);
          setEditingInMap(existing);
        }}
        onSuccessAddAnother={() => {
          setEditingInMap(null);
          setCreatingFromOsm(null);
        }}
      />
    </div>
  );
}
