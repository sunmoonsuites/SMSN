import React, { useState } from 'react';
import { Hotel } from '../../types';
import { submitEnquiry } from '../../services/enquiriesService';
import { Phone, Mail, MessageCircle, MapPin, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { getCleanHotelPhone, getCleanHotelWhatsApp } from '../../lib/utils';

interface ContactSectionProps {
  hotel: Hotel | null;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ hotel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const phone = getCleanHotelPhone(hotel?.phone);
  const emailAddr = hotel?.email || 'reservations@sunmoonsuites.com';
  const whatsappNumber = getCleanHotelWhatsApp(hotel?.whatsapp);

  const whatsappGeneralUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${hotel?.name || 'Sun Moon Suites'}, I have an enquiry about your hotel in Sector 117 Noida.`
  )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotel?.id) return;

    setIsSubmitting(true);
    setErrorMessage('');

    const res = await submitEnquiry(hotel.id, { name, email, mobile, message });
    setIsSubmitting(false);

    if (res.success) {
      setSubmitted(true);
      setName('');
      setEmail('');
      setMobile('');
      setMessage('');
      setTimeout(() => setSubmitted(false), 6000);
    } else {
      setErrorMessage(res.error || 'Failed to submit enquiry. Please call or WhatsApp us.');
    }
  };

  return (
    <section id="contact" className="py-20 bg-stone-50 border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-800 font-bold">
            Get in Touch
          </span>
          <h3 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
            Contact &amp; Enquiries
          </h3>
          <p className="text-sm text-stone-600 leading-relaxed">
            Have questions about room availability, long stays, or corporate bookings? Reach out anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Contact Details Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-2xs space-y-5">
              <h4 className="font-serif font-bold text-stone-900 text-lg">Direct Assistance</h4>

              <div className="space-y-4 text-sm">
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-3 text-stone-700 hover:text-amber-800 transition-colors"
                >
                  <div className="p-2.5 bg-amber-50 rounded-lg text-amber-800">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs text-stone-500 font-medium">Front Desk &amp; Phone</span>
                    <span className="font-semibold">{phone}</span>
                  </div>
                </a>

                <a
                  href={whatsappGeneralUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-stone-700 hover:text-emerald-700 transition-colors"
                >
                  <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-800">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs text-stone-500 font-medium">Instant WhatsApp</span>
                    <span className="font-semibold">{whatsappNumber.startsWith('91') ? `+${whatsappNumber}` : `+91 ${whatsappNumber}`}</span>
                  </div>
                </a>

                <a
                  href={`mailto:${emailAddr}`}
                  className="flex items-center gap-3 text-stone-700 hover:text-amber-800 transition-colors"
                >
                  <div className="p-2.5 bg-stone-100 rounded-lg text-stone-800">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs text-stone-500 font-medium">Reservations Email</span>
                    <span className="font-semibold">{emailAddr}</span>
                  </div>
                </a>

                <div className="flex items-center gap-3 text-stone-700">
                  <div className="p-2.5 bg-stone-100 rounded-lg text-stone-800">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block text-xs text-stone-500 font-medium">Address</span>
                    <span className="font-medium text-xs">
                      {hotel?.address ? `${hotel.address}, ${hotel.city}, ${hotel.state} ${hotel.pincode}` : 'GT-20, Sector 117, Noida, Uttar Pradesh 201316'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Timings card */}
            <div className="p-5 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <p className="font-bold">Reception Operating Hours</p>
              <p className="text-amber-800">
                Front desk is manned 24 hours daily. Standard check-in begins at {hotel?.check_in_time || '14:00'} and check-out is until {hotel?.check_out_time || '11:00'}.
              </p>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-2xs">
            <h4 className="font-serif font-bold text-stone-900 text-lg mb-2">Send Us an Enquiry</h4>
            <p className="text-xs text-stone-500 mb-6">
              Our reservation team responds to inquiries within a few hours.
            </p>

            {submitted ? (
              <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h5 className="font-serif font-bold text-emerald-950 text-base">
                  Enquiry Submitted Successfully!
                </h5>
                <p className="text-xs text-emerald-800">
                  Thank you for reaching out. We have logged your enquiry in our system and will contact you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ananya Roy"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 93135 01001"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ananya@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Message / Question *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Tell us about your requirements, dates, or questions..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-700"
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-xs uppercase tracking-wider font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Sending Enquiry...' : 'Submit Enquiry'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
