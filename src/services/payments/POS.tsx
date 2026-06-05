import React, { useState } from 'react';
import { paymentService, PaymentMethod, PaymentRequest, PaymentResponse } from './paymentService';

interface POSProps {
  orderId: string;
  total: number;
  customerName: string;
  customerEmail: string;
  onPaymentComplete: (response: PaymentResponse) => void;
  onClose: () => void;
}

const POS: React.FC<POSProps> = ({ orderId, total, customerName, customerEmail, onPaymentComplete, onClose }) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cash');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);
  const [showQR, setShowQR] = useState(false);

  const paymentMethods = paymentService.getPaymentMethods();

  const handlePayment = async () => {
    setIsProcessing(true);
    setPaymentResult(null);

    const request: PaymentRequest = {
      amount: total,
      currency: 'COP',
      orderId,
      customerEmail,
      customerName,
      method: selectedMethod,
    };

    const result = await paymentService.processPayment(request);
    
    setPaymentResult(result);
    setIsProcessing(false);
    
    if (result.success) {
      onPaymentComplete(result);
      if (result.qrCode) {
        setShowQR(true);
      }
    }
  };

  const getMethodIcon = (method: PaymentMethod) => {
    const found = paymentMethods.find(m => m.id === method);
    return found?.icon || 'fas fa-credit-card';
  };

  return (
    <div className="fixed inset-0 z-[300] bg-stone-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-stone-900 border border-white/10 rounded-[2rem] p-6 md:p-8 max-w-lg w-full shadow-2xl">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-brand text-white">Pago POS</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-white">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="bg-stone-950 p-4 rounded-xl mb-6">
          <div className="flex justify-between items-center">
            <span className="text-stone-400">Pedido</span>
            <span className="text-white font-mono">#{orderId}</span>
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-stone-400">Cliente</span>
            <span className="text-white">{customerName}</span>
          </div>
          <div className="border-t border-white/10 mt-4 pt-4">
            <div className="flex justify-between items-center">
              <span className="text-xl text-white">Total</span>
              <span className="text-2xl font-black text-orange-500">
                ${total.toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </div>

        {!paymentResult ? (
          <>
            <p className="text-stone-400 text-sm mb-4">Selecciona método de pago:</p>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {paymentMethods.map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 ${
                    selectedMethod === method.id
                      ? 'border-orange-500 bg-orange-600/20 text-orange-500'
                      : 'border-white/10 text-stone-400 hover:border-white/30'
                  }`}
                >
                  <i className={`${method.icon} text-2xl`}></i>
                  <span className="text-xs">{method.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing || !selectedMethod}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-stone-700 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <i className="fas fa-circle-notch fa-spin"></i>
                  Procesando...
                </>
              ) : (
                <>
                  <i className={`${getMethodIcon(selectedMethod)}`}></i>
                  Procesar Pago
                </>
              )}
            </button>
          </>
        ) : (
          <div className="text-center">
            {paymentResult.success ? (
              <>
                <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-check text-3xl text-white"></i>
                </div>
                <h3 className="text-xl text-white mb-2">Pago Exitoso</h3>
                <p className="text-stone-400 mb-4">{paymentResult.message}</p>
                
                {paymentResult.qrCode && showQR && (
                  <div className="bg-white p-4 rounded-xl mb-4 inline-block">
                    <img src={paymentResult.qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}

                {paymentResult.transactionId && (
                  <p className="text-xs text-stone-500 mb-4">
                    Transacción: {paymentResult.transactionId}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-times text-3xl text-white"></i>
                </div>
                <h3 className="text-xl text-white mb-2">Error en Pago</h3>
                <p className="text-stone-400 mb-4">{paymentResult.message}</p>
              </>
            )}

            <button
              onClick={onClose}
              className="w-full bg-stone-700 hover:bg-stone-600 text-white font-black py-3 rounded-xl uppercase tracking-widest transition-all"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default POS;
