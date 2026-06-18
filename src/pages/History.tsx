import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, Button } from '../components/ui';
import { formatCurrency } from '../lib/utils';
import { Transaction } from '../types';
import { ArrowDownRight, ArrowUpRight, Clock, CheckCircle2, XCircle, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../services/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function History() {
  const { userData, transactions, loading } = useAuth() as any;
  // Transactions are pre-sorted and fully hydrated by AuthContext on load.
  // No need for separate fetch loops.
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'completed': return <CheckCircle2 size={16} className="text-green-500 mr-1" />;
      case 'rejected': return <XCircle size={16} className="text-red-500 mr-1" />;
      default: return <Clock size={16} className="text-yellow-500 mr-1" />;
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Transaction History Report', 14, 22);
    
    // Add subtitle/date
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    if (userData?.username) {
      doc.text(`User: ${userData.username}`, 14, 36);
    }
    
    // Check if there are transactions
    if (transactions.length === 0) {
      doc.text('No transactions found.', 14, 46);
      doc.save('transaction_history.pdf');
      return;
    }

    const tableColumn = ["Date", "Type", "Status", "Amount"];
    const tableRows: any[] = [];

    transactions.forEach(tx => {
      const txData = [
        new Date(tx.date).toLocaleString(),
        tx.type.replace(/_/g, ' '),
        tx.status,
        `${['withdrawal', 'WITHDRAW_APPROVED', 'STAKE_CREATED', 'ADMIN_DEBIT', 'staking_purchase'].includes(tx.type) ? '-' : '+'}${formatCurrency(tx.amount)}`
      ];
      tableRows.push(txData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] }
    });

    doc.save('staking_reports.pdf');
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-gray-400 mt-1">View all your deposits, withdrawals, and rewards.</p>
        </div>
        <Button onClick={handleDownloadPDF} disabled={loading || transactions.length === 0} className="flex items-center gap-2">
          <Download size={18} />
          <span>Download PDF</span>
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-navy-800 text-sm text-gray-400 bg-navy-900/50">
                <th className="font-medium p-4">Type</th>
                <th className="font-medium p-4">Date</th>
                <th className="font-medium p-4">Status</th>
                <th className="font-medium p-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="text-center py-8 text-gray-500">Loading...</td></tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-navy-800/50 hover:bg-navy-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${['deposit', 'reward', 'referral_commission', 'ROI_REWARD', 'ADMIN_CREDIT', 'DEPOSIT_APPROVED'].includes(tx.type) ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                          {['withdrawal', 'WITHDRAW_APPROVED', 'STAKE_CREATED', 'ADMIN_DEBIT', 'staking_purchase'].includes(tx.type) ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>
                        <div>
                          <div className="font-medium capitalize text-sm">{tx.type.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-gray-500 md:hidden">{new Date(tx.date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400 text-sm hidden md:table-cell">{new Date(tx.date).toLocaleString()}</td>
                    <td className="p-4">
                      <div className="flex items-center text-sm">
                        {getStatusIcon(tx.status)}
                        <span className="capitalize text-gray-300">{tx.status}</span>
                      </div>
                    </td>
                    <td className={`p-4 text-right font-bold ${['withdrawal', 'WITHDRAW_APPROVED', 'STAKE_CREATED', 'ADMIN_DEBIT', 'staking_purchase'].includes(tx.type) ? 'text-white' : 'text-green-400'}`}>
                      {['withdrawal', 'WITHDRAW_APPROVED', 'STAKE_CREATED', 'ADMIN_DEBIT', 'staking_purchase'].includes(tx.type) ? '-' : '+'}{formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={4} className="text-center py-12 text-gray-500">No transactions found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
