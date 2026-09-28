import React, { useState } from 'react';
import { Hotel } from '../../types';
import { Phone, Mail, MessageCircle, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { getCleanHotelPhone, getCleanHotelWhatsApp } from '../../lib/utils';

interface ContactSectionProps {
  hotel: Hotel | null;
}

export const ContactSection: React.FC<ContactSectionProps> = ({ hotel }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [message, setMessage] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [lastWhatsAppUrl, setLastWhatsAppUrl] = useState('');

  const phone = getCleanHotelPhone(hotel?.phone);
  const emailAddr = hotel?.email || 'reservations@sunmoonsuites.com';
  const whatsappNumber = getCleanHotelWhatsApp(hotel?.whatsapp);

  const whatsappGeneralUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hello ${hotel?.name || 'Sun Moon Suites'}, I have an enquiry about your hotel in Sector 117 Noida.`
  )}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim() || !message.trim()) return;

    const hotelName = hotel?.name || 'Sun Moon Suites';

    // Format all form details cleanly for WhatsApp
    const lines = [
      `*New Hotel Enquiry - ${hotelName}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `👤 *Guest Name:* ${name.trim()}`,
      `📱 *Mobile Number:* ${mobile.trim()}`,
      email.trim() ? `✉️ *Email Address:* ${email.trim()}` : null,
      ``,
      `💬 *Message / Enquiry Details:*`,
      `${message.trim()}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_Sent directly from ${hotelName} Website_`,
    ].filter((line) => line !== null);

    const fullMessage = lines.join('\n');
    const targetUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(fullMessage)}`;

    setLastWhatsAppUrl(targetUrl);
    setSubmitted(true);

    // Automatically trigger WhatsApp in a new tab / mobile app
    try {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // Fallback: window.location
      window.location.href = targetUrl;
    }
  };

  const handleResetForm = () => {
    setName('');
    setEmail('');
    setMobile('');
    setMessage('');
    setSubmitted(false);
    setLastWhatsAppUrl('');
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

          {/* Form Column - Direct WhatsApp Transmission */}
          <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-serif font-bold text-stone-900 text-lg">Send Us an Enquiry</h4>
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant WhatsApp Connect</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 mb-6">
              Fill in your details below. When you click send, WhatsApp will open automatically with your pre-filled inquiry for immediate response.
            </p>

            {submitted ? (
              <div className="p-6 bg-emerald-50/80 rounded-2xl border border-emerald-300 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-700">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h5 className="font-serif font-bold text-emerald-950 text-lg">
                    Opening WhatsApp with your Enquiry Details!
                  </h5>
                  <p className="text-xs text-emerald-800 max-w-md mx-auto">
                    Your form details have been prepared for WhatsApp chat. If WhatsApp did not open automatically, please click the button below.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  {lastWhatsAppUrl && (
                    <a
                      href={lastWhatsAppUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Open WhatsApp Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl border border-stone-300 transition-colors cursor-pointer"
                  >
                    Send Another Enquiry
                  </button>
                </div>
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
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
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
                      className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="ananya@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
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
                    className="w-full px-3 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-7 py-3 bg-emerald-700 hover:bg-emerald-800 text-white text-xs uppercase tracking-wider font-bold rounded-xl transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md hover:shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-200" />
                    <span>Send Enquiry via WhatsApp</span>
                  </button>
                  <p className="text-[11px] text-stone-500 mt-2">
                    Directly connects with {hotel?.name || 'Sun Moon Suites'} front desk (+{whatsappNumber}) on WhatsApp.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
