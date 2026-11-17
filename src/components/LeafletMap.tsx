import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
import { Layers } from 'lucide-react';
import type { MosqueRecord, OsmMosqueCandidate } from '../types/mosque';
import { QARABULLI_CENTER } from '../lib/utils/geo';

interface Coordinates {
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  mode: 'picker' | 'cluster';
  center?: Coordinates;
  zoom?: number;
  selectedPosition?: Coordinates;
  gpsAccuracy?: number | null;
  mosques?: MosqueRecord[];
  osmCandidates?: OsmMosqueCandidate[];
  onPositionChange?: (pos: Coordinates) => void;
  onSelectMosque?: (mosque: MosqueRecord) => void;
  onSelectOsmCandidate?: (candidate: OsmMosqueCandidate) => void;
  flyToTrigger?: number;
  focusLocation?: { lat: number; lng: number; trigger: number } | null;
}

function createTargetPinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'awqaf-pin-icon',
    iconSize: [42, 52],
    iconAnchor: [21, 50],
    html: `
      <svg width="42" height="52" viewBox="0 0 42 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 2C11.0589 2 3 10.0589 3 20C3 33.5 21 50 21 50C21 50 39 33.5 39 20C39 10.0589 30.9411 2 21 2Z" fill="#0F4C3A" stroke="#FFFFFF" stroke-width="3"/>
        <circle cx="21" cy="20" r="8" fill="#C9A24B" stroke="#FFFFFF" stroke-width="2"/>
      </svg>
    `,
  });
}

function createMosquePinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'awqaf-pin-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    html: `
      <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 2C8.8203 2 3 7.8203 3 15C3 25.5 16 38 16 38C16 38 29 25.5 29 15C29 7.8203 23.1797 2 16 2Z" fill="#0F4C3A" stroke="#FFFFFF" stroke-width="2.5"/>
        <circle cx="16" cy="15" r="5" fill="#C9A24B"/>
      </svg>
    `,
  });
}

function createOsmRedPinIcon(): L.DivIcon {
  return L.divIcon({
    className: 'awqaf-pin-icon',
    iconSize: [30, 38],
    iconAnchor: [15, 36],
    html: `
      <svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 2C8.37258 2 3 7.37258 3 14C3 23.5 15 36 15 36C15 36 27 23.5 27 14C27 7.37258 21.6274 2 15 2Z" fill="#EA4335" stroke="#FFFFFF" stroke-width="2"/>
        <circle cx="15" cy="14" r="5" fill="#991B1B"/>
      </svg>
    `,
  });
}

type MarkerClusterFactory = (options?: {
  maxClusterRadius?: number;
  spiderfyOnMaxZoom?: boolean;
  showCoverageOnHover?: boolean;
  iconCreateFunction?: (cluster: { getChildCount: () => number }) => L.DivIcon;
}) => L.LayerGroup;

export function LeafletMap({
  mode,
  center = QARABULLI_CENTER,
  zoom = 13,
  selectedPosition,
  gpsAccuracy,
  mosques = [],
  osmCandidates = [],
  onPositionChange,
  onSelectMosque,
  onSelectOsmCandidate,
  flyToTrigger = 0,
  focusLocation = null,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const osmLayerRef = useRef<L.TileLayer | null>(null);
  const satelliteLayerRef = useRef<L.LayerGroup | null>(null);
  const pickerMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const clusterGroupRef = useRef<L.LayerGroup | null>(null);
  const referenceGroupRef = useRef<L.LayerGroup | null>(null);
  const hasFittedBoundsRef = useRef(false);
  const lastFlyTriggerRef = useRef(0);

  const [isSatellite, setIsSatellite] = useState(false);

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'topleft' }).addTo(map);

    const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    });

    const satelliteImagery = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: '&copy; Esri World Imagery',
      }
    );

    const satelliteRoads = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        opacity: 0.78,
      }
    );

    const satelliteHybrid = L.layerGroup([satelliteImagery, satelliteRoads]);

    osm.addTo(map);
    osmLayerRef.current = osm;
    satelliteLayerRef.current = satelliteHybrid;
    mapRef.current = map;

    const updateZoomLabelVisibility = () => {
      const el = containerRef.current;
      if (!el) return;
      if (map.getZoom() >= 13) {
        el.classList.remove('awqaf-hide-labels');
      } else {
        el.classList.add('awqaf-hide-labels');
      }
    };
    updateZoomLabelVisibility();
    map.on('zoomend', updateZoomLabelVisibility);

    const handleResize = () => {
      map.invalidateSize();
    };
    const resizeTimer = window.setTimeout(handleResize, 150);
    window.addEventListener('resize', handleResize);

    return () => {
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', handleResize);
      map.off('zoomend', updateZoomLabelVisibility);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Switch between OpenStreetMap and Satellite Hybrid tiles
  useEffect(() => {
    const map = mapRef.current;
    const osm = osmLayerRef.current;
    const sat = satelliteLayerRef.current;
    const el = containerRef.current;
    if (!map || !osm || !sat) return;

    if (isSatellite) {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(sat)) sat.addTo(map);
      el?.classList.add('awqaf-satellite-mode');
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(osm)) osm.addTo(map);
      el?.classList.remove('awqaf-satellite-mode');
    }
  }, [isSatellite]);

  // Picker mode: tap map & draggable pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'picker' || !selectedPosition) return;

    if (!pickerMarkerRef.current) {
      const marker = L.marker([selectedPosition.lat, selectedPosition.lng], {
        draggable: true,
        icon: createTargetPinIcon(),
        zIndexOffset: 1000,
      }).addTo(map);

      marker.on('dragend', () => {
        const ll = marker.getLatLng();
        onPositionChange?.({ lat: ll.lat, lng: ll.lng });
      });

      pickerMarkerRef.current = marker;
    } else {
      pickerMarkerRef.current.setLatLng([selectedPosition.lat, selectedPosition.lng]);
    }

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      onPositionChange?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [mode, selectedPosition?.lat, selectedPosition?.lng, onPositionChange]);

  // Picker mode: GPS accuracy circle
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'picker' || !selectedPosition) return;

    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.remove();
      accuracyCircleRef.current = null;
    }

    if (gpsAccuracy && gpsAccuracy > 0) {
      accuracyCircleRef.current = L.circle([selectedPosition.lat, selectedPosition.lng], {
        radius: gpsAccuracy,
        color: '#0F4C3A',
        fillColor: '#0F4C3A',
        fillOpacity: 0.1,
        weight: 1.5,
      }).addTo(map);
    }
  }, [mode, selectedPosition?.lat, selectedPosition?.lng, gpsAccuracy]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPosition || flyToTrigger === 0 || flyToTrigger === lastFlyTriggerRef.current) {
      return;
    }
    lastFlyTriggerRef.current = flyToTrigger;
    map.stop();
    map.flyTo([selectedPosition.lat, selectedPosition.lng], Math.max(map.getZoom(), 17), {
      duration: 0.6,
    });
  }, [flyToTrigger, selectedPosition?.lat, selectedPosition?.lng]);

  // Picker mode: render documented Awqaf mosques + unverified OSM previously mapped mosques
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'picker') return;

    if (referenceGroupRef.current) {
      referenceGroupRef.current.clearLayers();
    } else {
      referenceGroupRef.current = L.layerGroup().addTo(map);
    }

    const documentedIcon = createMosquePinIcon();
    const redOsmIcon = createOsmRedPinIcon();

    osmCandidates.forEach((cand) => {
      const marker = L.marker([cand.lat, cand.lng], {
        icon: redOsmIcon,
        interactive: true,
      });
      marker.bindTooltip(cand.name, {
        permanent: true,
        direction: 'right',
        offset: [12, -18],
        className: 'awqaf-mosque-tooltip',
      });
      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectOsmCandidate?.(cand);
      });
      referenceGroupRef.current?.addLayer(marker);
    });

    mosques.forEach((m) => {
      const refMarker = L.marker([m.lat, m.lng], {
        icon: documentedIcon,
        interactive: true,
        zIndexOffset: 200,
      });
      refMarker.bindTooltip(m.officialName, {
        permanent: true,
        direction: 'right',
        offset: [12, -20],
        className: 'awqaf-mosque-tooltip',
      });
      refMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectMosque?.(m);
      });
      referenceGroupRef.current?.addLayer(refMarker);
    });
  }, [mode, mosques, osmCandidates, onSelectMosque, onSelectOsmCandidate]);

  // Cluster mode: General map with marker clustering
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mode !== 'cluster') return;

    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }

    const factory = (L as unknown as { markerClusterGroup?: MarkerClusterFactory })
      .markerClusterGroup;

    const group: L.LayerGroup = factory
      ? factory({
          maxClusterRadius: 45,
          spiderfyOnMaxZoom: true,
          showCoverageOnHover: false,
          iconCreateFunction: (cluster) =>
            L.divIcon({
              html: `<div class="awqaf-cluster-badge">${cluster.getChildCount()}</div>`,
              className: 'awqaf-cluster-icon',
              iconSize: [40, 40],
            }),
        })
      : L.layerGroup();

    const mosqueIcon = createMosquePinIcon();
    const redOsmIcon = createOsmRedPinIcon();

    osmCandidates.forEach((cand) => {
      const marker = L.marker([cand.lat, cand.lng], { icon: redOsmIcon });
      marker.bindTooltip(cand.name, {
        permanent: true,
        direction: 'right',
        offset: [12, -18],
        className: 'awqaf-mosque-tooltip',
      });
      marker.on('click', () => {
        onSelectOsmCandidate?.(cand);
      });
      group.addLayer(marker);
    });

    mosques.forEach((mosque) => {
      const marker = L.marker([mosque.lat, mosque.lng], { icon: mosqueIcon });
      marker.bindTooltip(mosque.officialName, {
        permanent: true,
        direction: 'right',
        offset: [12, -20],
        className: 'awqaf-mosque-tooltip',
      });
      marker.on('click', () => {
        onSelectMosque?.(mosque);
      });
      group.addLayer(marker);
    });

    group.addTo(map);
    clusterGroupRef.current = group;

    if (mosques.length > 0 && !hasFittedBoundsRef.current) {
      const bounds = L.latLngBounds(mosques.map((m) => [m.lat, m.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 });
      hasFittedBoundsRef.current = true;
    }
  }, [mode, mosques, osmCandidates, onSelectMosque, onSelectOsmCandidate]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !focusLocation) return;
    map.flyTo([focusLocation.lat, focusLocation.lng], 17, { duration: 0.7 });
  }, [focusLocation?.trigger]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Street Map / Satellite Segmented Switch */}
      <div className="absolute top-3 right-3 z-[400] p-1 rounded-xl bg-white/95 backdrop-blur-md border border-[#D8D4C8] shadow-md flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsSatellite(false)}
          className={`min-h-[38px] px-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
            !isSatellite
              ? 'bg-[#0F4C3A] text-white'
              : 'text-[#4A5552] hover:text-[#0F4C3A]'
          }`}
        >
          خريطة الشوارع
        </button>
        <button
          type="button"
          onClick={() => setIsSatellite(true)}
          className={`min-h-[38px] px-2.5 rounded-lg text-xs font-bold flex items-center gap-1 transition whitespace-nowrap ${
            isSatellite
              ? 'bg-[#0F4C3A] text-white'
              : 'text-[#4A5552] hover:text-[#0F4C3A]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span>قمر صناعي</span>
        </button>
      </div>
    </div>
  );
}
