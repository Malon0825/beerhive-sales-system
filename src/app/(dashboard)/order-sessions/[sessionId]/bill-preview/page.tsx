'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import BillPreviewModal from '@/views/orders/BillPreviewModal';

/**
 * Bill Preview Page
 * Route: /order-sessions/[sessionId]/bill-preview
 * 
 * Shows bill preview for a session
 * Can proceed to payment from here
 */
export default function BillPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  const handleProceedToPayment = () => {
    router.push(`/order-sessions/${sessionId}/close`);
  };

  return (
    <BillPreviewModal
      sessionId={sessionId}
      isOpen={isOpen}
      onClose={handleClose}
      onProceedToPayment={handleProceedToPayment}
    />
  );
}
