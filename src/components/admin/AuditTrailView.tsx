import React, { useEffect, useState } from 'react';
import { Hotel, AuditLog } from '../../types';
import { getAuditLogs } from '../../services/auditService';
import { formatDate } from '../../lib/utils';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { History, ShieldAlert } from 'lucide-react';

interface AuditTrailViewProps {
  hotel: Hotel | null;
}

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ hotel }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hotel?.id) {
      loadAuditLogs();
    }
  }, [hotel?.id]);

  const loadAuditLogs = async () => {
    if (!hotel?.id) return;
    setIsLoading(true);

    try {
      const data = await getAuditLogs(hotel.id, 100);
      setLogs(data);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Fetching immutable security audit logs..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-serif font-bold text-2xl text-stone-900">
            System Security Audit Trail
          </h3>
          <p className="text-xs text-stone-500">
            Immutable log of all reservations, status updates, check-ins, and financial actions
          </p>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {logs.length === 0 ? (
          <EmptyState
            title="No Audit Logs Recorded"
            message="As bookings are created, check-ins executed, and invoices settled, system event logs will be registered here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Action</th>
                  <th className="px-6 py-3">Entity Type</th>
                  <th className="px-6 py-3">Entity ID</th>
                  <th className="px-6 py-3">Details / Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-3.5 text-stone-600 font-mono text-[11px]">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-stone-900">
                      <span className="px-2 py-0.5 bg-stone-100 rounded text-stone-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-stone-700 font-medium">
                      {log.entity}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-[11px] text-stone-500">
                      {log.entity_id ? log.entity_id.slice(0, 8) + '...' : '—'}
                    </td>
                    <td className="px-6 py-3.5 text-stone-600 font-mono text-[10px] max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
