import React from 'react';
import { Modal } from '../common/Modal';
import { Hotel } from '../../types';
import { DEFAULT_FAQ_ITEMS } from '../../services/hotelService';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'cancellation' | 'terms' | 'privacy' | 'faq';
  hotel: Hotel | null;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  type,
  hotel,
}) => {
  const titles = {
    cancellation: 'Cancellation & Refund Policy',
    terms: 'Terms of Stay & Hotel Policies',
    privacy: 'Privacy Policy',
    faq: 'Frequently Asked Questions (FAQ)',
  };

  const faqs = hotel?.faq_items && hotel.faq_items.length > 0 ? hotel.faq_items : DEFAULT_FAQ_ITEMS;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={titles[type]} maxWidth="2xl">
      <div className="space-y-4 text-xs text-stone-700 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
        {type === 'cancellation' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 font-medium">
              Free Cancellation: Cancel up to 24 hours before standard check-in time ({hotel?.check_in_time || '14:00'}) for a 100% refund or zero penalty.
            </div>
            <div className="text-stone-800 whitespace-pre-line leading-relaxed">
              {hotel?.cancellation_policy ||
                `• Cancellations made more than 24 hours prior to check-in: Full refund / No charges.
• Cancellations within 24 hours of check-in: 1 night tariff will be charged as late cancellation fee.
• No-Show (failure to arrive on scheduled date): Full booking amount will be retained / charged.
• Refund processing: Approved refunds will be credited back to the original payment source within 5-7 banking days.
• During peak festive dates or special events, non-refundable policies may apply if specifically indicated during booking.`}
            </div>
          </div>
        )}

        {type === 'terms' && (
          <div className="space-y-3">
            <h4 className="font-bold text-stone-900 uppercase text-xs">Guest Check-In Guidelines:</h4>
            <div className="text-stone-800 whitespace-pre-line leading-relaxed">
              {hotel?.terms_and_conditions ||
                `• Check-in Time: From ${hotel?.check_in_time || '14:00'} onwards. Early check-in is subject to availability and may incur extra charges.
• Check-out Time: Strictly until ${hotel?.check_out_time || '11:00'}. Late check-out requests must be confirmed with reception.
• Mandatory Photo ID: In compliance with Government of India regulations, every adult guest must present a valid government-issued photo ID at check-in (Aadhaar Card, Passport, Driving License, or Voter ID). PAN cards are NOT accepted as address proof.
• Foreign Nationals: Must present a valid Passport and Indian Visa / OCI card along with Form C registration details.
• Smoking Policy: All ${hotel?.total_rooms || 30} guest rooms are strictly non-smoking. Designated outdoor areas are provided.
• Visitors: Outside visitors are permitted in the lobby only until 21:00. Unregistered guests are not permitted in room floors.`}
            </div>
          </div>
        )}

        {type === 'privacy' && (
          <div className="space-y-3">
            <h4 className="font-bold text-stone-900 uppercase text-xs">Data Protection &amp; Confidentiality:</h4>
            <p className="text-stone-800">
              {hotel?.name || 'Sun Moon Suites'} is dedicated to safeguarding the privacy and security of all our guests. We collect only the information necessary to fulfill reservations, comply with statutory police verification requirements, and process payments.
            </p>
            <div className="text-stone-800 whitespace-pre-line leading-relaxed">
              {hotel?.privacy_policy ||
                `• Information Stored: Guest name, contact telephone, email address, ID numbers (for statutory guest register), and reservation history.
• Payment Information: We do not store credit or debit card numbers on our servers. All digital transactions are handled via compliant, RBI-authorized payment processors.
• Third-Party Sharing: We do not sell or rent guest details to any third-party advertisers. Information is only shared when legally obligated by law enforcement authorities.`}
            </div>
          </div>
        )}

        {type === 'faq' && (
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <h5 className="font-bold text-stone-900 text-sm">{faq.question}</h5>
                <p className="text-stone-600 text-xs leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
