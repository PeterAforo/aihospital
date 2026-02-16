import React, { useState, useEffect } from 'react';
import { FlaskConical, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { portalService, PortalLabOrder } from '../services/portal.service';
import { format } from 'date-fns';

const LabResults: React.FC = () => {
  const [orders, setOrders] = useState<PortalLabOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    portalService.getLabResults().then(setOrders).catch(console.error).finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Lab Results</h1>
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl">
          <FlaskConical className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No lab results found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FlaskConical size={18} className="text-primary-600" />
                  <span className="font-medium text-gray-800">Order #{order.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    order.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{order.status.replace('_', ' ')}</span>
                  <span className="text-xs text-gray-400">{format(new Date(order.orderDate), 'MMM dd, yyyy')}</span>
                </div>
              </div>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.test.name}</p>
                      <p className="text-xs text-gray-400">{item.test.code}</p>
                    </div>
                    <div className="text-right">
                      {item.result || item.resultValue !== undefined ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${item.isCritical ? 'text-red-600' : item.isAbnormal ? 'text-amber-600' : 'text-gray-800'}`}>
                            {item.resultValue ?? item.result} {item.unit || ''}
                          </span>
                          {item.isCritical && <AlertTriangle size={14} className="text-red-500" />}
                          {!item.isCritical && item.isAbnormal && <AlertTriangle size={14} className="text-amber-500" />}
                          {!item.isAbnormal && <CheckCircle size={14} className="text-green-500" />}
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-gray-400"><Clock size={12} /> Pending</span>
                      )}
                      {item.normalRange && <p className="text-xs text-gray-400">Ref: {item.normalRange}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LabResults;
