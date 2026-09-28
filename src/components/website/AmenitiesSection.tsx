import React from 'react';
import { Hotel, AmenityItem } from '../../types';
import { DEFAULT_AMENITIES_LIST } from '../../services/hotelService';
import {
  Wifi,
  Users,
  Zap,
  Car,
  Clock,
  Sparkles,
  ShieldCheck,
  Building2,
  Tv,
  Coffee,
  Utensils,
  CheckCircle,
} from 'lucide-react';

interface AmenitiesSectionProps {
  hotel?: Hotel | null;
}

export const getAmenityIcon = (iconName?: string) => {
  switch (iconName?.toLowerCase()) {
    case 'wifi':
      return <Wifi className="w-5 h-5 text-amber-700" />;
    case 'users':
    case 'banquet':
      return <Users className="w-5 h-5 text-amber-700" />;
    case 'zap':
    case 'power':
      return <Zap className="w-5 h-5 text-amber-700" />;
    case 'clock':
    case 'reception':
      return <Clock className="w-5 h-5 text-amber-700" />;
    case 'car':
    case 'parking':
      return <Car className="w-5 h-5 text-amber-700" />;
    case 'sparkles':
    case 'cleaning':
      return <Sparkles className="w-5 h-5 text-amber-700" />;
    case 'elevator':
    case 'building':
      return <Building2 className="w-5 h-5 text-amber-700" />;
    case 'tv':
      return <Tv className="w-5 h-5 text-amber-700" />;
    case 'coffee':
    case 'kettle':
      return <Coffee className="w-5 h-5 text-amber-700" />;
    case 'shield':
    case 'cctv':
      return <ShieldCheck className="w-5 h-5 text-amber-700" />;
    case 'utensils':
    case 'dining':
    case 'restaurant':
      return <Utensils className="w-5 h-5 text-amber-700" />;
    default:
      return <CheckCircle className="w-5 h-5 text-amber-700" />;
  }
};

export const AmenitiesSection: React.FC<AmenitiesSectionProps> = ({ hotel }) => {
  const rawList: AmenityItem[] = hotel?.amenities_list && hotel.amenities_list.length > 0
    ? hotel.amenities_list
    : DEFAULT_AMENITIES_LIST;

  const activeAmenities = rawList.filter((item) => item.is_active !== false);

  return (
    <section id="amenities" className="py-20 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
            Hospitality Features
          </span>
          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Designed for Modern Comfort
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Everything you need for a restful business trip or relaxing holiday stay in {hotel?.city || 'Sector 117, Noida'}.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeAmenities.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 hover:border-amber-200 transition-all flex items-start gap-4"
            >
              <div className="p-3 rounded-lg bg-white border border-stone-200 shadow-2xs shrink-0">
                {getAmenityIcon(item.iconName)}
              </div>
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-stone-900 text-base">{item.title}</h4>
                <p className="text-xs text-stone-600 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
