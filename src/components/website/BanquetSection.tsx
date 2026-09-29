import React, { useState } from 'react';
import { Hotel } from '../../types';
import { DEFAULT_BANQUET_CONFIG } from '../../services/hotelService';
import { Users, Calendar, Mail, Phone, User, Sparkles, Utensils } from 'lucide-react';
import { createBanquetEnquiry } from '../../services/banquetService';

interface BanquetSectionProps {
  hotel: Hotel | null;
}

export const BanquetSection: React.FC<BanquetSectionProps> = ({ hotel }) => {
  const banquet = hotel?.banquet_config || DEFAULT_BANQUET_CONFIG;

  if (banquet.is_enabled === false) {
    return null;
  }

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    event_date: '',
    event_type: 'Kitty Party' as 'Kitty Party' | 'Birthday' | 'Conference',
    guest_count: 20,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id) return;
    setIsSubmitting(true);
    const res = await createBanquetEnquiry({ ...formData, hotel_id: hotel.id });
    setIsSubmitting(false);
    if (res.success) setSubmitted(true);
  };

  return (
    <section id="banquet" className="py-20 bg-stone-50 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
            {banquet.subtitle || 'Events & Gatherings'}
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            {banquet.title || 'Our Banquet Hall'}
          </h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            {banquet.description ||
              'Host your special occasions in our elegant banquet hall, designed for comfort and versatility. Perfect for gatherings up to 50 guests, including kitty parties, birthdays, corporate conferences, and intimate celebrations.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 content-start">
            {[
              { title: 'Capacity', value: banquet.capacity || 'Up to 50 Guests', icon: Users },
              { title: 'Events', value: banquet.events || 'Kitty Parties, Birthdays, Conferences', icon: Calendar },
              { title: 'Ambiance', value: banquet.ambiance || 'Elegant & Versatile', icon: Sparkles },
              { title: 'Service', value: banquet.service || 'Tailored Catering', icon: Utensils },
            ].map((item, idx) => (
              <div key={idx} className="p-6 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-3">
                <item.icon className="w-6 h-6 text-amber-800" aria-hidden="true" />
                <h3 className="font-serif font-bold text-stone-900">{item.title}</h3>
                <p className="text-xs text-stone-600">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Booking Form */}
          <div className="bg-white p-8 rounded-xl border border-stone-200 shadow-xl">
            <h3 className="font-serif text-2xl font-bold text-stone-900 mb-6">Book Banquet Hall</h3>
            {submitted ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto text-xl">✓</div>
                <h5 className="font-bold text-stone-900">Enquiry Sent Successfully</h5>
                <p className="text-sm text-stone-600">Our team will contact you shortly.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                    <input type="text" required placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm"/>
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                    <input type="tel" required placeholder="Phone Number" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm"/>
                  </div>
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                  <input type="email" required placeholder="Email Address" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-lg text-sm"/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input type="date" required value={formData.event_date} onChange={e => setFormData({...formData, event_date: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"/>
                  <select value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value as any})} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm">
                    <option value="Kitty Party">Kitty Party</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Conference">Conference</option>
                  </select>
                  <input type="number" required min={1} max={50} placeholder="Guests" value={formData.guest_count} onChange={e => setFormData({...formData, guest_count: parseInt(e.target.value)})} className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm"/>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white font-semibold rounded-lg text-sm uppercase tracking-wider transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Sending...' : 'Book Banquet'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
